#![no_main]

use garage_fuzz::check_crdt_laws;
use garage_model::s3::version_table::{Version, VersionBacklink, VersionBlock, VersionBlockKey};
use libfuzzer_sys::fuzz_target;

/// Build a Version from an arbitrary deleted flag and block list, using a fixed uuid/backlink
/// so that CRDT state can be compared across merge results.
/// Duplicate block keys are dropped before construction.
/// If deleted, blocks are cleared to ensure a valid initial CRDT state.
fn make_version(deleted: bool, mut blocks: Vec<(VersionBlockKey, VersionBlock)>) -> Version {
	blocks.sort_by_key(|(k, _)| *k);
	blocks.dedup_by_key(|(k, _)| *k);
	let mut v = Version::new(
		[0u8; 32].into(),
		VersionBacklink::Object {
			bucket_id: [0u8; 32].into(),
			key: String::new(),
		},
		deleted,
	);
	for (key, block) in blocks {
		v.blocks.put(key, block);
	}
	if v.deleted.get() {
		v.blocks.clear();
	}
	v
}

fuzz_target!(|inputs: (
	(bool, Vec<(VersionBlockKey, VersionBlock)>),
	(bool, Vec<(VersionBlockKey, VersionBlock)>),
	(bool, Vec<(VersionBlockKey, VersionBlock)>)
)| {
	let ((d1, b1), (d2, b2), (d3, b3)) = inputs;
	check_crdt_laws(
		make_version(d1, b1),
		make_version(d2, b2),
		make_version(d3, b3),
	);
});
