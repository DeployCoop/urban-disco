#![no_main]

use garage_fuzz::check_crdt_laws;
use garage_model::admin_token_table::{AdminApiToken, AdminApiTokenParams, AdminApiTokenScope};
use garage_model::permission::ExpirationTime;
use garage_util::crdt;
use libfuzzer_sys::fuzz_target;

type Input = (
	bool,
	crdt::Lww<String>,
	crdt::Lww<crdt::MergingOption<ExpirationTime>>,
	crdt::Lww<AdminApiTokenScope>,
);

fn make(input: Input) -> AdminApiToken {
	let (deleted, name, expiration, scope) = input;
	let state = if deleted {
		crdt::Deletable::Deleted
	} else {
		crdt::Deletable::present(AdminApiTokenParams {
			created: 0,
			token_hash: String::new(),
			name,
			expiration,
			scope,
		})
	};
	AdminApiToken {
		prefix: String::new(),
		state,
	}
}

fuzz_target!(|inputs: (Input, Input, Input)| {
	let (a, b, c) = inputs;
	check_crdt_laws(make(a), make(b), make(c));
});
