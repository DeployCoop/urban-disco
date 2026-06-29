use quick_xml::de::from_reader;

use hyper::{Request, Response, StatusCode};

use garage_model::bucket_table::Bucket;

use garage_api_common::helpers::*;
use garage_api_common::xml::cors::*;

use crate::api_server::{ReqBody, ResBody};
use crate::error::*;
use crate::xml::to_xml_with_header;

pub async fn handle_get_cors(ctx: ReqCtx) -> Result<Response<ResBody>, Error> {
	let ReqCtx { bucket_params, .. } = ctx;
	if let Some(cors) = bucket_params.cors_config.get().inner() {
		let wc = CorsConfiguration {
			xmlns: (),
			cors_rules: cors
				.iter()
				.map(CorsRule::from_garage_cors_rule)
				.collect::<Vec<_>>(),
		};
		let xml = to_xml_with_header(&wc)?;
		Ok(Response::builder()
			.status(StatusCode::OK)
			.header(http::header::CONTENT_TYPE, "application/xml")
			.body(string_body(xml))?)
	} else {
		Err(Error::NoSuchCORSConfiguration)
	}
}

pub async fn handle_delete_cors(ctx: ReqCtx) -> Result<Response<ResBody>, Error> {
	let ReqCtx {
		garage,
		bucket_id,
		mut bucket_params,
		..
	} = ctx;
	bucket_params.cors_config.update(None.into());
	garage
		.bucket_table
		.insert(&Bucket::present(bucket_id, bucket_params))
		.await?;

	Ok(Response::builder()
		.status(StatusCode::NO_CONTENT)
		.body(empty_body())?)
}

pub async fn handle_put_cors(
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

	let conf: CorsConfiguration = from_reader(&body as &[u8])?;
	conf.validate()?;

	bucket_params
		.cors_config
		.update(Some(conf.into_garage_cors_config()?).into());
	garage
		.bucket_table
		.insert(&Bucket::present(bucket_id, bucket_params))
		.await?;

	Ok(Response::builder()
		.status(StatusCode::OK)
		.body(empty_body())?)
}
