#![no_main]

use std::collections::BTreeMap;

use garage_fuzz::check_crdt_laws;
use garage_model::k2v::item_table::{DvvsEntry, DvvsValue, K2VItem};
use libfuzzer_sys::fuzz_target;

// Timestamps are encoded as `(ts << 32) | shift` so that items built with different
// shifts (0, 1, 2) have disjoint timestamp spaces that still interleave in the sorted merge.
fn make(raw: BTreeMap<u64, (u32, BTreeMap<u32, DvvsValue>)>, shift: u32) -> K2VItem {
	let shift = shift as u64;
	let items = raw
		.into_iter()
		.map(|(node, (t_discard, values))| {
			let entry = DvvsEntry::from_raw(
				(t_discard as u64) << 32 | shift,
				values
					.into_iter()
					.map(|(ts, v)| ((ts as u64) << 32 | shift, v))
					.collect(),
			);
			(node, entry)
		})
		.collect();
	K2VItem::with_raw_items(items)
}

fuzz_target!(|inputs: (
	BTreeMap<u64, (u32, BTreeMap<u32, DvvsValue>)>,
	BTreeMap<u64, (u32, BTreeMap<u32, DvvsValue>)>,
	BTreeMap<u64, (u32, BTreeMap<u32, DvvsValue>)>,
)| {
	let (a, b, c) = inputs;
	check_crdt_laws(make(a, 0), make(b, 1), make(c, 2));
});
