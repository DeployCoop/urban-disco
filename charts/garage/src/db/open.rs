use std::path::{Path, PathBuf};

use crate::{Db, Error, Result};

/// List of supported database engine types
///
/// The `enum` holds list of *all* database engines that are are be supported by crate, no matter
/// if relevant feature is enabled or not. It allows us to distinguish between invalid engine
/// and valid engine, whose support is not enabled via feature flag.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Engine {
	Lmdb,
	Sqlite,
	Fjall,
}

impl Engine {
	/// Return variant name as static `&str`
	pub fn as_str(&self) -> &'static str {
		match self {
			Self::Lmdb => "lmdb",
			Self::Sqlite => "sqlite",
			Self::Fjall => "fjall",
		}
	}

	/// Return engine-specific DB path from base path
	pub fn db_path(&self, base_path: &Path) -> PathBuf {
		let suffix = match self {
			Self::Lmdb => "db.lmdb",
			Self::Sqlite => "db.sqlite",
			Self::Fjall => "db.fjall",
		};
		base_path.join(suffix)
	}
}

impl std::fmt::Display for Engine {
	fn fmt(&self, fmt: &mut std::fmt::Formatter) -> std::fmt::Result {
		self.as_str().fmt(fmt)
	}
}

impl std::str::FromStr for Engine {
	type Err = Error;

	fn from_str(text: &str) -> Result<Engine> {
		match text {
			"lmdb" | "heed" => Ok(Self::Lmdb),
			"sqlite" | "sqlite3" | "rusqlite" => Ok(Self::Sqlite),
            "fjall" => Ok(Self::Fjall),
			"sled" => Err(Error("Sled is no longer supported as a database engine. Converting your old metadata db can be done using an older Garage binary (e.g. v0.9.4).".into())),
			kind => Err(Error(
				format!(
					"Invalid DB engine: {} (options are: lmdb, sqlite, fjall)",
					kind
				)
				.into(),
			)),
		}
	}
}

#[derive(Default)]
pub struct OpenOpt {
	pub fsync: bool,
	pub lmdb_map_size: Option<usize>,
	pub fjall_block_cache_size: Option<usize>,
}

pub fn open_db(path: &PathBuf, engine: Engine, opt: &OpenOpt) -> Result<Db> {
	match engine {
		// ---- Sqlite DB ----
		#[cfg(feature = "sqlite")]
		Engine::Sqlite => crate::sqlite_adapter::open_db(path, opt),

		// ---- LMDB DB ----
		#[cfg(feature = "lmdb")]
		Engine::Lmdb => crate::lmdb_adapter::open_db(path, opt),

		// ---- Fjall DB ----
		#[cfg(feature = "fjall")]
		Engine::Fjall => crate::fjall_adapter::open_db(path, opt),

		// Pattern is unreachable when all supported DB engines are compiled into binary. The allow
		// attribute is added so that we won't have to change this match in case stop building
		// support for one or more engines by default.
		#[allow(unreachable_patterns)]
		engine => Err(Error(
			format!("DB engine support not available in this build: {}", engine).into(),
		)),
	}
}
