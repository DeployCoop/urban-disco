#![no_main]

use garage_fuzz::check_crdt_laws;
use garage_model::bucket_table::{Bucket, BucketParams};
use garage_util::crdt::{self, Deletable};
use libfuzzer_sys::fuzz_target;

fn make(state: Deletable<BucketParams>) -> Bucket {
	Bucket {
		id: [0u8; 32].into(),
		state,
	}
}

fuzz_target!(|inputs: (
	crdt::Deletable<BucketParams>,
	crdt::Deletable<BucketParams>,
	crdt::Deletable<BucketParams>
)| {
	let (a, b, c) = inputs;
	check_crdt_laws(make(a), make(b), make(c));
});
