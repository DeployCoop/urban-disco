use std::time::{Duration, SystemTime};

use crate::common;
use aws_sdk_s3::presigning::PresigningConfig;
use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::Request;

const STD_KEY: &str = "hello world";
const BODY: &[u8; 62] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

#[tokio::test]
async fn test_presigned_url() {
	let ctx = common::context();
	let bucket = ctx.create_bucket("presigned");

	let etag = "\"46cf18a9b447991b450cad3facf5937e\"";
	let body = Bytes::from(BODY.to_vec());

	let psc = PresigningConfig::builder()
		.start_time(SystemTime::now() - Duration::from_secs(60))
		.expires_in(Duration::from_secs(3600))
		.build()
		.unwrap();

	{
		// PutObject
		let req = ctx
			.client
			.put_object()
			.bucket(&bucket)
			.key(STD_KEY)
			.presigned(psc.clone())
			.await
			.unwrap();

		let client = ctx.custom_request.client();
		let req = Request::builder()
			.method("PUT")
			.uri(req.uri())
			.body(Full::new(body.clone()))
			.unwrap();
		let res = client.request(req).await.unwrap();
		assert_eq!(res.status(), 200);
		assert_eq!(res.headers().get("etag").unwrap(), etag);
	}

	{
		// GetObject
		let req = ctx
			.client
			.get_object()
			.bucket(&bucket)
			.key(STD_KEY)
			.presigned(psc)
			.await
			.unwrap();

		let client = ctx.custom_request.client();
		let req = Request::builder()
			.method("GET")
			.uri(req.uri())
			.body(Full::new(Bytes::new()))
			.unwrap();
		let res = client.request(req).await.unwrap();
		assert_eq!(res.status(), 200);
		assert_eq!(res.headers().get("etag").unwrap(), etag);

		let body2 = BodyExt::collect(res.into_body()).await.unwrap().to_bytes();
		assert_eq!(body, body2);
	}
}

// Presigned PUT with a user-metadata header whose value contains
// internal sequential whitespace. SigV4 requires collapsing such
// whitespace in canonical header values; missing that normalization
// produces an `Invalid signature` 403 on otherwise-valid requests.
#[tokio::test]
async fn test_presigned_put_with_user_metadata() {
	let ctx = common::context();
	let bucket = ctx.create_bucket("presigned-metadata");

	let key = "cache-archive";
	let metadata_value = "cache-key  --protected";
	let body = Bytes::from_static(b"presigned PUT with user metadata");

	let psc = PresigningConfig::builder()
		.start_time(SystemTime::now() - Duration::from_secs(60))
		.expires_in(Duration::from_secs(3600))
		.build()
		.unwrap();

	let presigned = ctx
		.client
		.put_object()
		.bucket(&bucket)
		.key(key)
		.metadata("cachekey", metadata_value)
		.presigned(psc)
		.await
		.unwrap();

	let req_builder = Request::builder().method("PUT").uri(presigned.uri());
	let req = presigned
		.headers()
		.fold(req_builder, |b, (k, v)| b.header(k, v))
		.body(Full::new(body))
		.unwrap();

	let res = ctx.custom_request.client().request(req).await.unwrap();
	assert_eq!(res.status(), 200);
}
