use quick_xml::de::from_reader;

use hyper::{Request, Response, StatusCode};

use garage_api_common::helpers::*;
use garage_api_common::xml::lifecycle::*;

use crate::api_server::{ReqBody, ResBody};
use crate::error::*;
use crate::xml::to_xml_with_header;

use garage_model::bucket_table::Bucket;

pub async fn handle_get_lifecycle(ctx: ReqCtx) -> Result<Response<ResBody>, Error> {
	let ReqCtx { bucket_params, .. } = ctx;

	if let Some(lifecycle) = bucket_params.lifecycle_config.get().inner() {
		let wc = LifecycleConfiguration::from_garage_lifecycle_config(lifecycle);
		let xml = to_xml_with_header(&wc)?;
		Ok(Response::builder()
			.status(StatusCode::OK)
			.header(http::header::CONTENT_TYPE, "application/xml")
			.body(string_body(xml))?)
	} else {
		Err(Error::NoSuchLifecycleConfiguration)
	}
}

pub async fn handle_delete_lifecycle(ctx: ReqCtx) -> Result<Response<ResBody>, Error> {
	let ReqCtx {
		garage,
		bucket_id,
		mut bucket_params,
		..
	} = ctx;
	bucket_params.lifecycle_config.update(None.into());
	garage
		.bucket_table
		.insert(&Bucket::present(bucket_id, bucket_params))
		.await?;

	Ok(Response::builder()
		.status(StatusCode::NO_CONTENT)
		.body(empty_body())?)
}

pub async fn handle_put_lifecycle(
	ctx: ReqCtx,
	req: Request<ReqBody>,
) -> Result<Response<ResBody>, Error> {
	let ReqCtx {
		garage,
		bucket_id,
		mut bucket_params,
		..
	} = ctx;

	let body = req.into_body().collect().await?;

	let conf: LifecycleConfiguration = from_reader(&body as &[u8])?;
	let config = conf
		.validate_into_garage_lifecycle_config()
		.ok_or_bad_request("Invalid lifecycle configuration")?;

	bucket_params.lifecycle_config.update(Some(config).into());
	garage
		.bucket_table
		.insert(&Bucket::present(bucket_id, bucket_params))
		.await?;

	Ok(Response::builder()
		.status(StatusCode::OK)
		.body(empty_body())?)
}
