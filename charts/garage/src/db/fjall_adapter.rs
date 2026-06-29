use core::ops::Bound;

use std::path::Path;
use std::sync::Arc;

use parking_lot::{MappedRwLockReadGuard, RwLock, RwLockReadGuard};

use fjall::{
	PartitionCreateOptions, PersistMode, TransactionalKeyspace, TransactionalPartitionHandle,
	WriteTransaction,
};

use crate::{
	open::{Engine, OpenOpt},
	Db, Error, IDb, ITx, ITxFn, OnCommit, Result, TxError, TxFnResult, TxOpError, TxOpResult,
	TxResult, TxValueIter, Value, ValueIter,
};

pub use fjall;

// --

pub(crate) fn open_db(path: &Path, opt: &OpenOpt) -> Result<Db> {
	info!("Opening Fjall database at: {}", path.display());
	if opt.fsync {
		return Err(Error(
			"metadata_fsync is not supported with the Fjall database engine".into(),
		));
	}
	let mut config = fjall::Config::new(path);
	if let Some(block_cache_size) = opt.fjall_block_cache_size {
		config = config.cache_size(block_cache_size as u64);
	}
	let keyspace = config.open_transactional()?;
	Ok(FjallDb::init(keyspace))
}

// -- err

impl From<fjall::Error> for Error {
	fn from(e: fjall::Error) -> Error {
		Error(format!("fjall: {}", e).into())
	}
}

impl From<fjall::LsmError> for Error {
	fn from(e: fjall::LsmError) -> Error {
		Error(format!("fjall lsm_tree: {}", e).into())
	}
}

impl From<fjall::Error> for TxOpError {
	fn from(e: fjall::Error) -> TxOpError {
		TxOpError(e.into())
	}
}

// -- db

pub struct FjallDb {
	keyspace: TransactionalKeyspace,
	trees: RwLock<Vec<(String, TransactionalPartitionHandle)>>,
}

type ByteRefRangeBound<'r> = (Bound<&'r [u8]>, Bound<&'r [u8]>);

impl FjallDb {
	pub fn init(keyspace: TransactionalKeyspace) -> Db {
		let s = Self {
			keyspace,
			trees: RwLock::new(Vec::new()),
		};
		Db(Arc::new(s))
	}

	fn get_tree(
		&self,
		i: usize,
	) -> Result<MappedRwLockReadGuard<'_, TransactionalPartitionHandle>> {
		RwLockReadGuard::try_map(self.trees.read(), |trees: &Vec<_>| {
			trees.get(i).map(|tup| &tup.1)
		})
		.map_err(|_| Error("invalid tree id".into()))
	}
}

impl IDb for FjallDb {
	fn engine(&self) -> String {
		"Fjall (EXPERIMENTAL!)".into()
	}

	fn open_tree(&self, name: &str) -> Result<usize> {
		let mut trees = self.trees.write();
		let safe_name = encode_name(name)?;
		if let Some(i) = trees.iter().position(|(name, _)| *name == safe_name) {
			Ok(i)
		} else {
			let tree = self
				.keyspace
				.open_partition(&safe_name, PartitionCreateOptions::default())?;
			let i = trees.len();
			trees.push((safe_name, tree));
			Ok(i)
		}
	}

	fn list_trees(&self) -> Result<Vec<String>> {
		self.keyspace
			.list_partitions()
			.iter()
			.map(|n| decode_name(n))
			.collect::<Result<Vec<_>>>()
	}

	fn snapshot(&self, base_path: &Path) -> Result<()> {
		std::fs::create_dir_all(base_path)?;
		let path = Engine::Fjall.db_path(base_path);

		let source_state = self.keyspace.read_tx();
		let copy_keyspace = fjall::Config::new(path).open()?;

		for partition_name in self.keyspace.list_partitions() {
			let source_partition = self
				.keyspace
				.open_partition(&partition_name, PartitionCreateOptions::default())?;
			let copy_partition =
				copy_keyspace.open_partition(&partition_name, PartitionCreateOptions::default())?;

			for entry in source_state.iter(&source_partition) {
				let (key, value) = entry?;
				copy_partition.insert(key, value)?;
			}
		}

		copy_keyspace.persist(PersistMode::SyncAll)?;
		Ok(())
	}

	// ----

	fn get(&self, tree_idx: usize, key: &[u8]) -> Result<Option<Value>> {
		let tree = self.get_tree(tree_idx)?;
		let tx = self.keyspace.read_tx();
		let val = tx.get(&tree, key)?;
		match val {
			None => Ok(None),
			Some(v) => Ok(Some(v.to_vec())),
		}
	}

	fn approximate_len(&self, tree_idx: usize) -> Result<usize> {
		let tree = self.get_tree(tree_idx)?;
		Ok(tree.approximate_len())
	}
	fn is_empty(&self, tree_idx: usize) -> Result<bool> {
		let tree = self.get_tree(tree_idx)?;
		let tx = self.keyspace.read_tx();
		Ok(tx.is_empty(&tree)?)
	}

	fn insert(&self, tree_idx: usize, key: &[u8], value: &[u8]) -> Result<()> {
		let tree = self.get_tree(tree_idx)?;
		let mut tx = self.keyspace.write_tx();
		tx.insert(&tree, key, value);
		tx.commit()?;
		Ok(())
	}

	fn remove(&self, tree_idx: usize, key: &[u8]) -> Result<()> {
		let tree = self.get_tree(tree_idx)?;
		let mut tx = self.keyspace.write_tx();
		tx.remove(&tree, key);
		tx.commit()?;
		Ok(())
	}

	fn clear(&self, tree_idx: usize) -> Result<()> {
		let mut trees = self.trees.write();

		if tree_idx >= trees.len() {
			return Err(Error("invalid tree id".into()));
		}
		let (name, tree) = trees.remove(tree_idx);

		self.keyspace.delete_partition(tree)?;
		let tree = self
			.keyspace
			.open_partition(&name, PartitionCreateOptions::default())?;
		trees.insert(tree_idx, (name, tree));

		Ok(())
	}

	fn iter(&self, tree_idx: usize) -> Result<ValueIter<'_>> {
		let tree = self.get_tree(tree_idx)?;
		let tx = self.keyspace.read_tx();
		Ok(Box::new(tx.iter(&tree).map(iterator_remap)))
	}

	fn iter_rev(&self, tree_idx: usize) -> Result<ValueIter<'_>> {
		let tree = self.get_tree(tree_idx)?;
		let tx = self.keyspace.read_tx();
		Ok(Box::new(tx.iter(&tree).rev().map(iterator_remap)))
	}

	fn range<'r>(
		&self,
		tree_idx: usize,
		low: Bound<&'r [u8]>,
		high: Bound<&'r [u8]>,
	) -> Result<ValueIter<'_>> {
		let tree = self.get_tree(tree_idx)?;
		let tx = self.keyspace.read_tx();
		Ok(Box::new(
			tx.range::<&'r [u8], ByteRefRangeBound>(&tree, (low, high))
				.map(iterator_remap),
		))
	}
	fn range_rev<'r>(
		&self,
		tree_idx: usize,
		low: Bound<&'r [u8]>,
		high: Bound<&'r [u8]>,
	) -> Result<ValueIter<'_>> {
		let tree = self.get_tree(tree_idx)?;
		let tx = self.keyspace.read_tx();
		Ok(Box::new(
			tx.range::<&'r [u8], ByteRefRangeBound>(&tree, (low, high))
				.rev()
				.map(iterator_remap),
		))
	}

	// ----

	fn transaction(&self, f: &dyn ITxFn) -> TxResult<OnCommit, ()> {
		let trees = self.trees.read();
		let mut tx = FjallTx {
			trees: &trees[..],
			tx: self.keyspace.write_tx(),
		};

		let res = f.try_on(&mut tx);
		match res {
			TxFnResult::Ok(on_commit) => {
				tx.tx.commit().map_err(Error::from).map_err(TxError::Db)?;
				Ok(on_commit)
			}
			TxFnResult::Abort => {
				tx.tx.rollback();
				Err(TxError::Abort(()))
			}
			TxFnResult::DbErr => {
				tx.tx.rollback();
				Err(TxError::Db(Error(
					"(this message will be discarded)".into(),
				)))
			}
		}
	}
}

// ----

struct FjallTx<'a> {
	trees: &'a [(String, TransactionalPartitionHandle)],
	tx: WriteTransaction<'a>,
}

impl<'a> FjallTx<'a> {
	fn get_tree(&self, i: usize) -> TxOpResult<&TransactionalPartitionHandle> {
		self.trees.get(i).map(|tup| &tup.1).ok_or_else(|| {
			TxOpError(Error(
				"invalid tree id (it might have been opened after the transaction started)".into(),
			))
		})
	}
}

impl<'a> ITx for FjallTx<'a> {
	fn get(&self, tree_idx: usize, key: &[u8]) -> TxOpResult<Option<Value>> {
		let tree = self.get_tree(tree_idx)?;
		match self.tx.get(tree, key)? {
			Some(v) => Ok(Some(v.to_vec())),
			None => Ok(None),
		}
	}
	fn len(&self, tree_idx: usize) -> TxOpResult<usize> {
		let tree = self.get_tree(tree_idx)?;
		Ok(self.tx.len(tree)?)
	}

	fn insert(&mut self, tree_idx: usize, key: &[u8], value: &[u8]) -> TxOpResult<()> {
		let tree = self.get_tree(tree_idx)?.clone();
		self.tx.insert(&tree, key, value);
		Ok(())
	}
	fn remove(&mut self, tree_idx: usize, key: &[u8]) -> TxOpResult<()> {
		let tree = self.get_tree(tree_idx)?.clone();
		self.tx.remove(&tree, key);
		Ok(())
	}
	fn clear(&mut self, _tree_idx: usize) -> TxOpResult<()> {
		unimplemented!("LSM tree clearing in cross-partition transaction is not supported")
	}

	fn iter(&self, tree_idx: usize) -> TxOpResult<TxValueIter<'_>> {
		let tree = self.get_tree(tree_idx)?.clone();
		Ok(Box::new(self.tx.iter(&tree).map(iterator_remap_tx)))
	}
	fn iter_rev(&self, tree_idx: usize) -> TxOpResult<TxValueIter<'_>> {
		let tree = self.get_tree(tree_idx)?.clone();
		Ok(Box::new(self.tx.iter(&tree).rev().map(iterator_remap_tx)))
	}

	fn range<'r>(
		&self,
		tree_idx: usize,
		low: Bound<&'r [u8]>,
		high: Bound<&'r [u8]>,
	) -> TxOpResult<TxValueIter<'_>> {
		let tree = self.get_tree(tree_idx)?;
		let low = clone_bound(low);
		let high = clone_bound(high);
		Ok(Box::new(
			self.tx
				.range::<Vec<u8>, ByteVecRangeBounds>(tree, (low, high))
				.map(iterator_remap_tx),
		))
	}
	fn range_rev<'r>(
		&self,
		tree_idx: usize,
		low: Bound<&'r [u8]>,
		high: Bound<&'r [u8]>,
	) -> TxOpResult<TxValueIter<'_>> {
		let tree = self.get_tree(tree_idx)?;
		let low = clone_bound(low);
		let high = clone_bound(high);
		Ok(Box::new(
			self.tx
				.range::<Vec<u8>, ByteVecRangeBounds>(tree, (low, high))
				.rev()
				.map(iterator_remap_tx),
		))
	}
}

// -- maps fjall's (k, v) to ours

fn iterator_remap(r: fjall::Result<(fjall::Slice, fjall::Slice)>) -> Result<(Value, Value)> {
	r.map(|(k, v)| (k.to_vec(), v.to_vec()))
		.map_err(|e| e.into())
}

fn iterator_remap_tx(r: fjall::Result<(fjall::Slice, fjall::Slice)>) -> TxOpResult<(Value, Value)> {
	r.map(|(k, v)| (k.to_vec(), v.to_vec()))
		.map_err(|e| e.into())
}

// -- utils to deal with Garage's tightness on Bound lifetimes

type ByteVecBound = Bound<Vec<u8>>;
type ByteVecRangeBounds = (ByteVecBound, ByteVecBound);

fn clone_bound(bound: Bound<&[u8]>) -> ByteVecBound {
	let value = match bound {
		Bound::Excluded(v) | Bound::Included(v) => v.to_vec(),
		Bound::Unbounded => vec![],
	};

	match bound {
		Bound::Included(_) => Bound::Included(value),
		Bound::Excluded(_) => Bound::Excluded(value),
		Bound::Unbounded => Bound::Unbounded,
	}
}

// -- utils to encode table names --

fn encode_name(s: &str) -> Result<String> {
	let base = 'A' as u32;

	let mut ret = String::with_capacity(s.len() + 10);
	for c in s.chars() {
		if c.is_alphanumeric() || c == '_' || c == '-' || c == '#' {
			ret.push(c);
		} else if c <= u8::MAX as char {
			ret.push('$');
			let c_hi = c as u32 / 16;
			let c_lo = c as u32 % 16;
			ret.push(char::from_u32(base + c_hi).unwrap());
			ret.push(char::from_u32(base + c_lo).unwrap());
		} else {
			return Err(Error(
				format!("table name {} could not be safely encoded", s).into(),
			));
		}
	}
	Ok(ret)
}

fn decode_name(s: &str) -> Result<String> {
	use std::convert::TryFrom;

	let errfn = || Error(format!("encoded table name {} is invalid", s).into());
	let c_map = |c: char| {
		let c = c as u32;
		let base = 'A' as u32;
		if (base..base + 16).contains(&c) {
			Some(c - base)
		} else {
			None
		}
	};

	let mut ret = String::with_capacity(s.len());
	let mut it = s.chars();
	while let Some(c) = it.next() {
		if c == '$' {
			let c_hi = it.next().and_then(c_map).ok_or_else(errfn)?;
			let c_lo = it.next().and_then(c_map).ok_or_else(errfn)?;
			let c_dec = char::try_from(c_hi * 16 + c_lo).map_err(|_| errfn())?;
			ret.push(c_dec);
		} else {
			ret.push(c);
		}
	}
	Ok(ret)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_encdec_name() {
		for name in [
			"testname",
			"test_name",
			"test name",
			"test$name",
			"test:name@help.me$get/this**right",
		] {
			let encname = encode_name(name).unwrap();
			assert!(!encname.contains(' '));
			assert!(!encname.contains('.'));
			assert!(!encname.contains('*'));
			assert_eq!(*name, decode_name(&encname).unwrap());
		}
	}
}
