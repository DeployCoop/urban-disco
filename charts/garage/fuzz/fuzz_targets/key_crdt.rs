#![no_main]

use garage_fuzz::check_crdt_laws;
use garage_model::key_table::{Key, KeyParams};
use garage_model::permission::{BucketKeyPerm, ExpirationTime};
use garage_util::crdt;
use garage_util::data::Uuid;
use libfuzzer_sys::fuzz_target;

type Input = (
	bool,
	crdt::Lww<String>,
	crdt::Lww<crdt::MergingOption<ExpirationTime>>,
	crdt::Lww<bool>,
	crdt::Map<Uuid, BucketKeyPerm>,
	crdt::LwwMap<String, crdt::CancelingOption<Uuid>>,
);

fn make(input: Input) -> Key {
	let (deleted, name, expiration, allow_create_bucket, authorized_buckets, local_aliases) = input;
	let state = if deleted {
		crdt::Deletable::Deleted
	} else {
		crdt::Deletable::present(KeyParams {
			created: None,
			secret_key: String::new(),
			name,
			expiration,
			allow_create_bucket,
			authorized_buckets,
			local_aliases,
		})
	};
	Key {
		key_id: String::new(),
		state,
	}
}

fuzz_target!(|inputs: (Input, Input, Input)| {
	let (a, b, c) = inputs;
	check_crdt_laws(make(a), make(b), make(c));
});
