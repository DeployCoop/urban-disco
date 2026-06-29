use std::sync::Arc;

use http::header::{
	HeaderValue, ACCESS_CONTROL_ALLOW_HEADERS, ACCESS_CONTROL_ALLOW_METHODS,
	ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_EXPOSE_HEADERS, ACCESS_CONTROL_REQUEST_HEADERS,
	ACCESS_CONTROL_REQUEST_METHOD, VARY,
};
use hyper::{body::Body, body::Incoming as IncomingBody, Request, Response, StatusCode};

use garage_model::bucket_table::{BucketParams, CorsRule as GarageCorsRule};
use garage_model::garage::Garage;

use crate::common_error::{CommonError, OkOrBadRequest, OkOrInternalError};
use crate::helpers::*;

// Return both the matching rule and the parsed Origin header so callers that
// apply CORS headers don't have to repeat Origin lookup and validation.
pub fn find_matching_cors_rule<'a, B>(
	bucket_params: &'a BucketParams,
	req: &'a Request<B>,
) -> Result<Option<(&'a GarageCorsRule, &'a str)>, CommonError> {
	if let Some(cors_config) = bucket_params.cors_config.get().inner() {
		if let Some(origin) = req.headers().get("Origin") {
			let origin = origin.to_str()?;
			let request_headers = match req.headers().get(ACCESS_CONTROL_REQUEST_HEADERS) {
				Some(h) => h.to_str()?.split(',').map(|h| h.trim()).collect::<Vec<_>>(),
				None => vec![],
			};
			return Ok(cors_config
				.iter()
				.find(|rule| {
					cors_rule_matches(rule, origin, req.method().as_ref(), request_headers.iter())
				})
				.map(|rule| (rule, origin)));
		}
	}
	Ok(None)
}

pub fn cors_rule_matches<'a, HI, S>(
	rule: &GarageCorsRule,
	origin: &'a str,
	method: &'a str,
	mut request_headers: HI,
) -> bool
where
	HI: Iterator<Item = S>,
	S: AsRef<str>,
{
	rule.allow_origins.iter().any(|x| x == "*" || x == origin)
		&& rule.allow_methods.iter().any(|x| x == "*" || x == method)
		&& request_headers.all(|h| {
			rule.allow_headers
				.iter()
				.any(|x| x == "*" || x == h.as_ref())
		})
}

pub fn add_cors_headers(
	resp: &mut Response<impl Body>,
	rule: &GarageCorsRule,
	request_origin: &str,
) -> Result<(), http::header::InvalidHeaderValue> {
	let h = resp.headers_mut();
	let is_wildcard_origin = rule.allow_origins.iter().any(|origin| origin == "*");
	let allow_origin = if is_wildcard_origin {
		"*"
	} else {
		request_origin
	};
	h.insert(ACCESS_CONTROL_ALLOW_ORIGIN, allow_origin.parse()?);
	h.insert(
		ACCESS_CONTROL_ALLOW_METHODS,
		rule.allow_methods.join(", ").parse()?,
	);
	h.insert(
		ACCESS_CONTROL_ALLOW_HEADERS,
		rule.allow_headers.join(", ").parse()?,
	);
	h.insert(
		ACCESS_CONTROL_EXPOSE_HEADERS,
		rule.expose_headers.join(", ").parse()?,
	);
	// When ACAO reflects the request origin instead of returning "*",
	// caches must vary on the Origin request header to avoid reusing
	// a response generated for one origin when serving another origin.
	if !is_wildcard_origin {
		h.insert(VARY, HeaderValue::from_static("Origin"));
	}
	Ok(())
}

pub fn handle_options_api(
	garage: Arc<Garage>,
	req: &Request<IncomingBody>,
	bucket_name: Option<String>,
) -> Result<Response<EmptyBody>, CommonError> {
	// FIXME: CORS rules of buckets with local aliases are
	// not taken into account.

	// If the bucket name is a global bucket name,
	// we try to apply the CORS rules of that bucket.
	// If a user has a local bucket name that has
	// the same name, its CORS rules won't be applied
	// and will be shadowed by the rules of the globally
	// existing bucket (but this is inevitable because
	// OPTIONS calls are not authenticated).
	if let Some(bn) = bucket_name {
		let helper = garage.bucket_helper();
		let bucket_opt = helper.resolve_global_bucket_fast(&bn)?;
		if let Some(bucket) = bucket_opt {
			let bucket_params = bucket.state.into_option().unwrap();
			handle_options_for_bucket(req, &bucket_params)
		} else {
			// If there is a bucket name in the request, but that name
			// does not correspond to a global alias for a bucket,
			// then it's either a non-existing bucket or a local bucket.
			// We have no way of knowing, because the request is not
			// authenticated and thus we can't resolve local aliases.
			// We take the permissive approach of allowing everything,
			// because we don't want to prevent web apps that use
			// local bucket names from making API calls.
			Ok(Response::builder()
				.header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
				.header(ACCESS_CONTROL_ALLOW_METHODS, "*")
				.header(ACCESS_CONTROL_ALLOW_HEADERS, "*")
				.status(StatusCode::OK)
				.body(EmptyBody::new())?)
		}
	} else {
		// If there is no bucket name in the request,
		// we are doing a ListBuckets call, which we want to allow
		// for all origins.
		Ok(Response::builder()
			.header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
			.header(ACCESS_CONTROL_ALLOW_METHODS, "GET")
			.status(StatusCode::OK)
			.body(EmptyBody::new())?)
	}
}

pub fn handle_options_for_bucket<B>(
	req: &Request<B>,
	bucket_params: &BucketParams,
) -> Result<Response<EmptyBody>, CommonError> {
	let origin = req
		.headers()
		.get("Origin")
		.ok_or_bad_request("Missing Origin header")?
		.to_str()?;
	let request_method = req
		.headers()
		.get(ACCESS_CONTROL_REQUEST_METHOD)
		.ok_or_bad_request("Missing Access-Control-Request-Method header")?
		.to_str()?;
	let request_headers = match req.headers().get(ACCESS_CONTROL_REQUEST_HEADERS) {
		Some(h) => h.to_str()?.split(',').map(|h| h.trim()).collect::<Vec<_>>(),
		None => vec![],
	};

	if let Some(cors_config) = bucket_params.cors_config.get().inner() {
		let matching_rule = cors_config
			.iter()
			.find(|rule| cors_rule_matches(rule, origin, request_method, request_headers.iter()));
		if let Some(rule) = matching_rule {
			let mut resp = Response::builder()
				.status(StatusCode::OK)
				.body(EmptyBody::new())?;
			add_cors_headers(&mut resp, rule, origin)
				.ok_or_internal_error("Invalid CORS configuration")?;
			// Preflight responses vary not only on Origin but also on the
			// requested method and requested headers, so caches must not
			// reuse one preflight decision for a different preflight input.
			resp.headers_mut().insert(
				VARY,
				"Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
					.parse()
					.expect("static vary header"),
			);
			return Ok(resp);
		}
	}

	Err(CommonError::Forbidden(
		"This CORS request is not allowed.".into(),
	))
}

#[cfg(test)]
mod tests {
	use super::*;

	fn bucket_params_with_rule(allow_origins: Vec<&str>) -> BucketParams {
		let mut bucket_params = BucketParams::default();
		bucket_params.cors_config.update(
			Some(vec![GarageCorsRule {
				id: Some("cors-test".into()),
				max_age_seconds: None,
				allow_origins: allow_origins.into_iter().map(str::to_string).collect(),
				allow_methods: vec!["GET".into(), "PUT".into()],
				allow_headers: vec!["*".into()],
				expose_headers: vec![],
			}])
			.into(),
		);
		bucket_params
	}

	fn preflight_request(origin: &str) -> Request<()> {
		Request::builder()
			.method("OPTIONS")
			.uri("http://example.test/bucket")
			.header("Origin", origin)
			.header(ACCESS_CONTROL_REQUEST_METHOD, "PUT")
			.body(())
			.unwrap()
	}

	#[test]
	fn preflight_with_single_allowed_origin_returns_request_origin() {
		let bucket_params = bucket_params_with_rule(vec!["https://app.example.test"]);
		let req = preflight_request("https://app.example.test");

		let resp = handle_options_for_bucket(&req, &bucket_params).unwrap();

		assert_eq!(
			resp.headers().get(ACCESS_CONTROL_ALLOW_ORIGIN).unwrap(),
			"https://app.example.test"
		);
		let vary_values: Vec<_> = resp
			.headers()
			.get_all(VARY)
			.iter()
			.map(|value| value.to_str().unwrap())
			.collect();
		assert_eq!(
			vary_values,
			vec!["Origin, Access-Control-Request-Method, Access-Control-Request-Headers",]
		);
	}

	#[test]
	fn preflight_with_multiple_allowed_origins_reflects_request_origin() {
		let bucket_params = bucket_params_with_rule(vec![
			"https://app.example.test",
			"https://admin.example.test",
		]);
		let req = preflight_request("https://app.example.test");

		let resp = handle_options_for_bucket(&req, &bucket_params).unwrap();

		// This assertion documents the behavior browsers expect:
		// even if multiple origins are allowed by configuration, the
		// response should reflect the request origin rather than emit
		// a comma-separated list. It currently fails and is meant to
		// turn green once header generation is corrected.
		assert_eq!(
			resp.headers().get(ACCESS_CONTROL_ALLOW_ORIGIN).unwrap(),
			"https://app.example.test"
		);
	}

	#[test]
	fn preflight_with_wildcard_allowed_origin_returns_wildcard() {
		let bucket_params = bucket_params_with_rule(vec!["*"]);
		let req = preflight_request("https://app.example.test");

		let resp = handle_options_for_bucket(&req, &bucket_params).unwrap();

		assert_eq!(
			resp.headers().get(ACCESS_CONTROL_ALLOW_ORIGIN).unwrap(),
			"*"
		);
		let vary_values: Vec<_> = resp
			.headers()
			.get_all(VARY)
			.iter()
			.map(|value| value.to_str().unwrap())
			.collect();
		assert_eq!(
			vary_values,
			vec!["Origin, Access-Control-Request-Method, Access-Control-Request-Headers",]
		);
	}
}
