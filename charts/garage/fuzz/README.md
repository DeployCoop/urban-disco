# Fuzzing

## Setup

Install cargo fuzz: `cargo install cargo-fuzz`

## Launch

Run `cargo fuzz run <fuzz_target>` where `<fuzz_target>` is the name (without extension) of one of the `.rs` files in the `fuzz_targets` directory.

If you launch the command outside of the fuzz directory, you need to force the nightly toolchain with `cargo +nightly`.