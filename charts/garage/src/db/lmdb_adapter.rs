use core::ops::Bound;

use std::collections::HashMap;
use std::convert::TryInto;
use std::marker::PhantomPinned;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::sync::{Arc, RwLock};

use heed::types::Bytes;
use heed::{BytesDecode, Env, EnvFlags, RoTxn, RwTxn, WithTls};

type Database = heed::Database<Bytes, Bytes>;

use crate::{
	open::{Engine, OpenOpt},
	Db, Error, IDb, ITx, ITxFn, OnCommit, Result, TxError, TxFnResult, TxOpError, TxOpResult,
	TxResult, TxValueIter, Value, ValueIter,
};

pub use heed;

// ---- top-level open function

pub(crate) fn open_db(path: &PathBuf, opt: &OpenOpt) -> Result<Db> {
	info!("Opening LMDB database at: {}", path.display());
	if let Err(e) = std::fs::create_dir_all(path) {
		return Err(Error(
			format!("Unable to create LMDB data directory: {}", e).into(),
		));
	}

	let map_size = match opt.lmdb_map_size {
		None => recommended_map_size(),
		Some(v) => v - (v % 4096),
	};

	let mut env_builder = heed::EnvOpenOptions::new();
	env_builder.max_dbs(100);
	env_builder.map_size(map_size);
	env_builder.max_readers(2048);
	let mut env_flags = EnvFlags::NO_READ_AHEAD | EnvFlags::NO_META_SYNC;
	if !opt.fsync {
		env_flags |= EnvFlags::NO_SYNC;
	}
	let open_res = unsafe {
		env_builder.flags(env_flags);
		env_builder.open(path)
	};
	match open_res {
		Err(heed::Error::Io(e)) if e.kind() == std::io::ErrorKind::OutOfMemory => Err(Error(
			"OutOfMemory error while trying to open LMDB database. This can happen \
                if your operating system is not allowing you to use sufficient virtual \
                memory address space. Please check that no limit is set (ulimit -v). \
                You may also try to set a smaller `lmdb_map_size` configuration parameter. \
                On 32-bit machines, you should probably switch to another database engine."
				.into(),
		)),
		Err(e) => Err(Error(format!("Cannot open LMDB database: {}", e).into())),
		Ok(db) => Ok(LmdbDb::init(db)),
	}
}

// -- err

impl From<heed::Error> for Error {
	fn from(e: heed::Error) -> Error {
		Error(format!("LMDB: {}", e).into())
	}
}

impl From<heed::Error> for TxOpError {
	fn from(e: heed::Error) -> TxOpError {
		TxOpError(e.into())
	}
}

// -- db

pub struct LmdbDb {
	db: heed::Env,
	trees: RwLock<(Vec<Database>, HashMap<String, usize>)>,
}

impl LmdbDb {
	pub fn init(db: Env) -> Db {
		let s = Self {
			db,
			trees: RwLock::new((Vec::new(), HashMap::new())),
		};
		Db(Arc::new(s))
	}

	fn get_tree(&self, i: usize) -> Result<Database> {
		self.trees
			.read()
			.unwrap()
			.0
			.get(i)
			.cloned()
			.ok_or_else(|| Error("invalid tree id".into()))
	}
}

impl IDb for LmdbDb {
	fn engine(&self) -> String {
		"LMDB (using Heed crate)".into()
	}

	fn open_tree(&self, name: &str) -> Result<usize> {
		let mut trees = self.trees.write().unwrap();
		if let Some(i) = trees.1.get(name) {
			Ok(*i)
		} else {
			let mut wtxn = self.db.write_txn()?;
			let tree = self.db.create_database(&mut wtxn, Some(name))?;
			wtxn.commit()?;
			let i = trees.0.len();
			trees.0.push(tree);
			trees.1.insert(name.to_string(), i);
			Ok(i)
		}
	}

	fn list_trees(&self) -> Result<Vec<String>> {
		let rtxn = self.db.read_txn()?;
		let tree0 = match self
			.db
			.open_database::<heed::types::Str, Bytes>(&rtxn, None)?
		{
			Some(x) => x,
			None => return Ok(vec![]),
		};

		let mut ret = vec![];
		for item in tree0.iter(&rtxn)? {
			let (tree_name, _) = item?;
			ret.push(tree_name.to_string());
		}

		let mut ret2 = vec![];
		for tree_name in ret {
			if self
				.db
				.open_database::<Bytes, Bytes>(&rtxn, Some(&tree_name))?
				.is_some()
			{
				ret2.push(tree_name);
			}
		}
		drop(rtxn);

		Ok(ret2)
	}

	fn snapshot(&self, base_path: &Path) -> Result<()> {
		std::fs::create_dir_all(base_path)?;
		let path = Engine::Lmdb.db_path(base_path);
		self.db
			.copy_to_path(path, heed::CompactionOption::Enabled)?;
		Ok(())
	}

	// ----

	fn get(&self, tree: usize, key: &[u8]) -> Result<Option<Value>> {
		let tree = self.get_tree(tree)?;

		let tx = self.db.read_txn()?;
		let val = tree.get(&tx, key)?;
		match val {
			None => Ok(None),
			Some(v) => Ok(Some(v.to_vec())),
		}
	}

	fn approximate_len(&self, tree: usize) -> Result<usize> {
		let tree = self.get_tree(tree)?;
		let tx = self.db.read_txn()?;
		Ok(tree.len(&tx)?.try_into().unwrap())
	}
	fn is_empty(&self, tree: usize) -> Result<bool> {
		let tree = self.get_tree(tree)?;
		let tx = self.db.read_txn()?;
		Ok(tree.is_empty(&tx)?)
	}

	fn insert(&self, tree: usize, key: &[u8], value: &[u8]) -> Result<()> {
		let tree = self.get_tree(tree)?;
		let mut tx = self.db.write_txn()?;
		tree.put(&mut tx, key, value)?;
		tx.commit()?;
		Ok(())
	}

	fn remove(&self, tree: usize, key: &[u8]) -> Result<()> {
		let tree = self.get_tree(tree)?;
		let mut tx = self.db.write_txn()?;
		tree.delete(&mut tx, key)?;
		tx.commit()?;
		Ok(())
	}

	fn clear(&self, tree: usize) -> Result<()> {
		let tree = self.get_tree(tree)?;
		let mut tx = self.db.write_txn()?;
		tree.clear(&mut tx)?;
		tx.commit()?;
		Ok(())
	}

	fn iter(&self, tree: usize) -> Result<ValueIter<'_>> {
		let tree = self.get_tree(tree)?;
		let tx = self.db.read_txn()?;
		// Safety: the cloture does not store its argument anywhere,
		unsafe { TxAndIterator::make(tx, |tx| Ok(tree.iter(tx)?)) }
	}

	fn iter_rev(&self, tree: usize) -> Result<ValueIter<'_>> {
		let tree = self.get_tree(tree)?;
		let tx = self.db.read_txn()?;
		// Safety: the cloture does not store its argument anywhere,
		unsafe { TxAndIterator::make(tx, |tx| Ok(tree.rev_iter(tx)?)) }
	}

	fn range<'r>(
		&self,
		tree: usize,
		low: Bound<&'r [u8]>,
		high: Bound<&'r [u8]>,
	) -> Result<ValueIter<'_>> {
		let tree = self.get_tree(tree)?;
		let tx = self.db.read_txn()?;
		// Safety: the cloture does not store its argument anywhere,
		unsafe { TxAndIterator::make(tx, |tx| Ok(tree.range(tx, &(low, high))?)) }
	}
	fn range_rev<'r>(
		&self,
		tree: usize,
		low: Bound<&'r [u8]>,
		high: Bound<&'r [u8]>,
	) -> Result<ValueIter<'_>> {
		let tree = self.get_tree(tree)?;
		let tx = self.db.read_txn()?;
		// Safety: the cloture does not store its argument anywhere,
		unsafe { TxAndIterator::make(tx, |tx| Ok(tree.rev_range(tx, &(low, high))?)) }
	}

	// ----

	fn transaction(&self, f: &dyn ITxFn) -> TxResult<OnCommit, ()> {
		let trees = self.trees.read().unwrap();
		let mut tx = LmdbTx {
			trees: &trees.0[..],
			tx: self
				.db
				.write_txn()
				.map_err(Error::from)
				.map_err(TxError::Db)?,
		};

		let res = f.try_on(&mut tx);
		match res {
			TxFnResult::Ok(on_commit) => {
				tx.tx.commit().map_err(Error::from).map_err(TxError::Db)?;
				Ok(on_commit)
			}
			TxFnResult::Abort => {
				tx.tx.abort();
				Err(TxError::Abort(()))
			}
			TxFnResult::DbErr => {
				tx.tx.abort();
				Err(TxError::Db(Error(
					"(this message will be discarded)".into(),
				)))
			}
		}
	}
}

// ----

struct LmdbTx<'a> {
	trees: &'a [Database],
	tx: RwTxn<'a>,
}

impl<'a> LmdbTx<'a> {
	fn get_tree(&self, i: usize) -> TxOpResult<&Database> {
		self.trees.get(i).ok_or_else(|| {
			TxOpError(Error(
				"invalid tree id (it might have been opened after the transaction started)".into(),
			))
		})
	}
}

impl<'a> ITx for LmdbTx<'a> {
	fn get(&self, tree: usize, key: &[u8]) -> TxOpResult<Option<Value>> {
		let tree = self.get_tree(tree)?;
		match tree.get(&self.tx, key)? {
			Some(v) => Ok(Some(v.to_vec())),
			None => Ok(None),
		}
	}
	fn len(&self, tree: usize) -> TxOpResult<usize> {
		let tree = self.get_tree(tree)?;
		Ok(tree.len(&self.tx)? as usize)
	}

	fn insert(&mut self, tree: usize, key: &[u8], value: &[u8]) -> TxOpResult<()> {
		let tree = *self.get_tree(tree)?;
		tree.put(&mut self.tx, key, value)?;
		Ok(())
	}
	fn remove(&mut self, tree: usize, key: &[u8]) -> TxOpResult<()> {
		let tree = *self.get_tree(tree)?;
		tree.delete(&mut self.tx, key)?;
		Ok(())
	}
	fn clear(&mut self, tree: usize) -> TxOpResult<()> {
		let tree = *self.get_tree(tree)?;
		tree.clear(&mut self.tx)?;
		Ok(())
	}

	fn iter(&self, tree: usize) -> TxOpResult<TxValueIter<'_>> {
		let tree = *self.get_tree(tree)?;
		Ok(Box::new(tree.iter(&self.tx)?.map(tx_iter_item)))
	}
	fn iter_rev(&self, tree: usize) -> TxOpResult<TxValueIter<'_>> {
		let tree = *self.get_tree(tree)?;
		Ok(Box::new(tree.rev_iter(&self.tx)?.map(tx_iter_item)))
	}

	fn range<'r>(
		&self,
		tree: usize,
		low: Bound<&'r [u8]>,
		high: Bound<&'r [u8]>,
	) -> TxOpResult<TxValueIter<'_>> {
		let tree = *self.get_tree(tree)?;
		Ok(Box::new(
			tree.range(&self.tx, &(low, high))?.map(tx_iter_item),
		))
	}
	fn range_rev<'r>(
		&self,
		tree: usize,
		low: Bound<&'r [u8]>,
		high: Bound<&'r [u8]>,
	) -> TxOpResult<TxValueIter<'_>> {
		let tree = *self.get_tree(tree)?;
		Ok(Box::new(
			tree.rev_range(&self.tx, &(low, high))?.map(tx_iter_item),
		))
	}
}

// ---- iterators outside transactions ----
// complicated, they must hold the transaction object
// therefore a bit of unsafe code (it is a self-referential struct)

type IteratorItem<'a> = heed::Result<(
	<Bytes as BytesDecode<'a>>::DItem,
	<Bytes as BytesDecode<'a>>::DItem,
)>;

struct TxAndIterator<'a, I>
where
	I: Iterator<Item = IteratorItem<'a>> + 'a,
{
	tx: RoTxn<'a, WithTls>,
	iter: Option<I>,
	_pin: PhantomPinned,
}

impl<'a, I> TxAndIterator<'a, I>
where
	I: Iterator<Item = IteratorItem<'a>> + 'a,
{
	fn iter(self: Pin<&mut Self>) -> &mut Option<I> {
		// Safety: iter is not structural
		unsafe { &mut self.get_unchecked_mut().iter }
	}

	/// Safety: iterfun must not store its argument anywhere but in its result.
	unsafe fn make<F>(tx: RoTxn<'a, WithTls>, iterfun: F) -> Result<ValueIter<'a>>
	where
		F: FnOnce(&'a RoTxn<'a>) -> Result<I>,
	{
		let res = TxAndIterator {
			tx,
			iter: None,
			_pin: PhantomPinned,
		};
		let mut boxed = Box::pin(res);

		let tx_lifetime_overextended: &'a RoTxn<'a> = {
			let tx = &boxed.tx;
			// Safety: Artificially extending the lifetime because
			// this reference will only be stored and accessed from the
			// returned ValueIter which guarantees that it is destroyed
			// before the tx it is pointing  to.
			#[expect(clippy::deref_addrof)]
			unsafe {
				&*&raw const *tx
			}
		};
		let iter = iterfun(tx_lifetime_overextended)?;

		*boxed.as_mut().iter() = Some(iter);

		Ok(Box::new(TxAndIteratorPin(boxed)))
	}
}

impl<'a, I> Drop for TxAndIterator<'a, I>
where
	I: Iterator<Item = IteratorItem<'a>> + 'a,
{
	fn drop(&mut self) {
		// Safety: `new_unchecked` is okay because we know this value is never
		// used again after being dropped.
		let this = unsafe { Pin::new_unchecked(self) };
		drop(this.iter().take());
	}
}

struct TxAndIteratorPin<'a, I>(Pin<Box<TxAndIterator<'a, I>>>)
where
	I: Iterator<Item = IteratorItem<'a>> + 'a;

impl<'a, I> Iterator for TxAndIteratorPin<'a, I>
where
	I: Iterator<Item = IteratorItem<'a>> + 'a,
{
	type Item = Result<(Value, Value)>;

	fn next(&mut self) -> Option<Self::Item> {
		let mut_ref = Pin::as_mut(&mut self.0);
		let next = mut_ref.iter().as_mut()?.next()?;
		let res = match next {
			Err(e) => Err(e.into()),
			Ok((k, v)) => Ok((k.to_vec(), v.to_vec())),
		};
		Some(res)
	}
}

// ---- iterators within transactions ----

fn tx_iter_item<'a>(
	item: std::result::Result<(&'a [u8], &'a [u8]), heed::Error>,
) -> TxOpResult<(Vec<u8>, Vec<u8>)> {
	item.map(|(k, v)| (k.to_vec(), v.to_vec()))
		.map_err(|e| TxOpError(Error::from(e)))
}

// ---- utility ----

#[cfg(target_pointer_width = "64")]
pub fn recommended_map_size() -> usize {
	1usize << 40
}

#[cfg(target_pointer_width = "32")]
pub fn recommended_map_size() -> usize {
	tracing::warn!("LMDB is not recommended on 32-bit systems, database size will be limited");
	1usize << 30
}
