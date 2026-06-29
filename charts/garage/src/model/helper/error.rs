use serde::{Deserialize, Serialize};
use thiserror::Error;

use garage_util::error::Error as GarageError;

#[derive(Debug, Error, Serialize, Deserialize)]
pub enum Error {
	#[error("Internal error: {0}")]
	Internal(#[from] GarageError),

	#[error("Bad request: {0}")]
	BadRequest(String),

	/// Bucket name is not valid according to AWS S3 specs
	#[error("Invalid bucket name: {0}")]
	InvalidBucketName(String),

	#[error("Access key not found: {0}")]
	NoSuchAccessKey(String),

	#[error("Bucket not found: {0}")]
	NoSuchBucket(String),
}

impl From<garage_net::error::Error> for Error {
	fn from(e: garage_net::error::Error) -> Self {
		Error::Internal(GarageError::Net(e))
	}
}

pub trait OkOrBadRequest {
	type S;
	fn ok_or_bad_request<M: AsRef<str>>(self, reason: M) -> Result<Self::S, Error>;
}

impl<T, E> OkOrBadRequest for Result<T, E>
where
	E: std::fmt::Display,
{
	type S = T;
	fn ok_or_bad_request<M: AsRef<str>>(self, reason: M) -> Result<T, Error> {
		match self {
			Ok(x) => Ok(x),
			Err(e) => Err(Error::BadRequest(format!("{}: {}", reason.as_ref(), e))),
		}
	}
}

impl<T> OkOrBadRequest for Option<T> {
	type S = T;
	fn ok_or_bad_request<M: AsRef<str>>(self, reason: M) -> Result<T, Error> {
		match self {
			Some(x) => Ok(x),
			None => Err(Error::BadRequest(reason.as_ref().to_string())),
		}
	}
}
