#![no_main]

use garage_fuzz::check_crdt_laws;
use garage_model::bucket_alias_table::BucketAlias;
use garage_util::data::Uuid;
use libfuzzer_sys::fuzz_target;

/// Build a BucketAlias with a fixed name so that CRDT state can be compared
/// across merge results. The timestamp and optional bucket ID are the CRDT state.
fn make_bucket_alias(ts: u64, bucket_id: Option<[u8; 32]>) -> BucketAlias {
	BucketAlias::new(String::new(), ts, bucket_id.map(Uuid::from))
}

fuzz_target!(|inputs: (
	(u64, Option<[u8; 32]>),
	(u64, Option<[u8; 32]>),
	(u64, Option<[u8; 32]>)
)| {
	let ((ts1, b1), (ts2, b2), (ts3, b3)) = inputs;
	check_crdt_laws(
		make_bucket_alias(ts1, b1),
		make_bucket_alias(ts2, b2),
		make_bucket_alias(ts3, b3),
	);
});
