#![no_main]

use garage_fuzz::check_crdt_laws;
use garage_model::s3::mpu_table::{MpuPart, MpuPartKey, MultipartUpload};
use libfuzzer_sys::fuzz_target;

/// Build a MultipartUpload from an arbitrary deleted flag and parts list, using a fixed
/// upload_id/bucket_id/key so that CRDT state can be compared across merge results.
/// `MpuPart.version` is fixed to a constant since it is identity data, not CRDT state:
/// two replicas of the same part (same MpuPartKey) always share the same version UUID.
/// If deleted, parts are cleared to ensure a valid initial CRDT state.
fn make_mpu(deleted: bool, parts: Vec<(MpuPartKey, MpuPart)>) -> MultipartUpload {
	let mut mpu = MultipartUpload::new(
		[0u8; 32].into(),
		0,
		[0u8; 32].into(),
		String::new(),
		deleted,
	);
	for (key, mut part) in parts {
		part.version = [0u8; 32].into();
		mpu.parts.put(key, part);
	}
	if mpu.deleted.get() {
		mpu.parts.clear();
	}
	mpu
}

fuzz_target!(|inputs: (
	(bool, Vec<(MpuPartKey, MpuPart)>),
	(bool, Vec<(MpuPartKey, MpuPart)>),
	(bool, Vec<(MpuPartKey, MpuPart)>)
)| {
	let ((d1, p1), (d2, p2), (d3, p3)) = inputs;
	check_crdt_laws(make_mpu(d1, p1), make_mpu(d2, p2), make_mpu(d3, p3));
});
