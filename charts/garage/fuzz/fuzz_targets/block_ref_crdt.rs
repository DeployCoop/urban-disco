#![no_main]

use garage_fuzz::check_crdt_laws;
use garage_model::s3::block_ref_table::BlockRef;
use libfuzzer_sys::fuzz_target;

/// Build a BlockRef with a fixed block hash and version UUID so that CRDT state
/// can be compared across merge results. Only the deleted flag varies.
fn make_block_ref(deleted: bool) -> BlockRef {
	BlockRef {
		block: [0u8; 32].into(),
		version: [0u8; 32].into(),
		deleted: deleted.into(),
	}
}

fuzz_target!(|inputs: (bool, bool, bool)| {
	let (d1, d2, d3) = inputs;
	check_crdt_laws(make_block_ref(d1), make_block_ref(d2), make_block_ref(d3));
});
