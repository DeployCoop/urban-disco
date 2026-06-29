use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use hyper::{header::HeaderName, Method};

use garage_model::bucket_table::CorsRule as GarageCorsRule;

use super::{xmlns_tag, IntValue, Value};
use crate::common_error::{CommonError as Error, OkOrBadRequest};

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename = "CORSConfiguration")]
pub struct CorsConfiguration {
	#[serde(rename = "@xmlns", serialize_with = "xmlns_tag", skip_deserializing)]
	pub xmlns: (),
	// "default" is required to be able to parse an empty list of rules,
	// cf https://docs.rs/quick-xml/latest/quick_xml/de/#sequences-xsall-and-xssequence-xml-schema-types
	#[serde(rename = "CORSRule", default)]
	pub cors_rules: Vec<CorsRule>,
}

#[derive(Debug, ToSchema, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Clone)]
#[schema(as = cors::Rule)]
pub struct CorsRule {
	#[serde(rename = "ID", skip_serializing_if = "Option::is_none")]
	pub id: Option<Value>,
	#[serde(rename = "MaxAgeSeconds", skip_serializing_if = "Option::is_none")]
	pub max_age_seconds: Option<IntValue>,
	#[serde(rename = "AllowedOrigin")]
	pub allowed_origins: Vec<Value>,
	#[serde(rename = "AllowedMethod")]
	pub allowed_methods: Vec<Value>,
	#[serde(rename = "AllowedHeader", default)]
	pub allowed_headers: Vec<Value>,
	#[serde(rename = "ExposeHeader", default)]
	pub expose_headers: Vec<Value>,
}

#[derive(Debug, ToSchema, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Clone)]
#[schema(as = cors::AllowedMethod)]
pub struct AllowedMethod {
	#[serde(rename = "AllowedMethod")]
	pub allowed_method: Value,
}

#[derive(Debug, ToSchema, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Clone)]
#[schema(as = cors::AllowedHeader)]
pub struct AllowedHeader {
	#[serde(rename = "AllowedHeader")]
	pub allowed_header: Value,
}

#[derive(Debug, ToSchema, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Clone)]
#[schema(as = cors::ExposedHeader)]
pub struct ExposeHeader {
	#[serde(rename = "ExposeHeader")]
	pub expose_header: Value,
}

impl CorsConfiguration {
	pub fn validate(&self) -> Result<(), Error> {
		for r in self.cors_rules.iter() {
			r.validate()?;
		}
		Ok(())
	}

	pub fn into_garage_cors_config(self) -> Result<Vec<GarageCorsRule>, Error> {
		Ok(self
			.cors_rules
			.iter()
			.map(CorsRule::to_garage_cors_rule)
			.collect())
	}
}

impl CorsRule {
	pub fn validate(&self) -> Result<(), Error> {
		for method in self.allowed_methods.iter() {
			method
				.0
				.parse::<Method>()
				.ok_or_bad_request("Invalid CORSRule method")?;
		}
		for header in self
			.allowed_headers
			.iter()
			.chain(self.expose_headers.iter())
		{
			header
				.0
				.parse::<HeaderName>()
				.ok_or_bad_request("Invalid HTTP header name")?;
		}
		Ok(())
	}

	pub fn to_garage_cors_rule(&self) -> GarageCorsRule {
		let convert_vec =
			|vval: &[Value]| vval.iter().map(|x| x.0.to_owned()).collect::<Vec<String>>();
		GarageCorsRule {
			id: self.id.as_ref().map(|x| x.0.to_owned()),
			max_age_seconds: self.max_age_seconds.as_ref().map(|x| x.0 as u64),
			allow_origins: convert_vec(&self.allowed_origins),
			allow_methods: convert_vec(&self.allowed_methods),
			allow_headers: convert_vec(&self.allowed_headers),
			expose_headers: convert_vec(&self.expose_headers),
		}
	}

	pub fn from_garage_cors_rule(rule: &GarageCorsRule) -> Self {
		let convert_vec = |vval: &[String]| {
			vval.iter()
				.map(|x| Value(x.clone()))
				.collect::<Vec<Value>>()
		};
		Self {
			id: rule.id.as_ref().map(|x| Value(x.clone())),
			max_age_seconds: rule.max_age_seconds.map(|x| IntValue(x as i64)),
			allowed_origins: convert_vec(&rule.allow_origins),
			allowed_methods: convert_vec(&rule.allow_methods),
			allowed_headers: convert_vec(&rule.allow_headers),
			expose_headers: convert_vec(&rule.expose_headers),
		}
	}
}

#[cfg(test)]
mod tests {
	use crate::xml::{to_xml_with_header, unprettify_xml};

	use super::*;

	use quick_xml::de::from_str;

	#[test]
	fn test_deserialize() {
		let message = r#"<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
 <CORSRule>
   <AllowedOrigin>http://www.example.com</AllowedOrigin>

   <AllowedMethod>PUT</AllowedMethod>
   <AllowedMethod>POST</AllowedMethod>
   <AllowedMethod>DELETE</AllowedMethod>

   <AllowedHeader>*</AllowedHeader>
 </CORSRule>
 <CORSRule>
   <AllowedOrigin>*</AllowedOrigin>
   <AllowedMethod>GET</AllowedMethod>
 </CORSRule>
 <CORSRule>
   <ID>qsdfjklm</ID>
   <MaxAgeSeconds>12345</MaxAgeSeconds>
   <AllowedOrigin>https://perdu.com</AllowedOrigin>

   <AllowedMethod>GET</AllowedMethod>
   <AllowedMethod>DELETE</AllowedMethod>
   <AllowedHeader>*</AllowedHeader>
   <ExposeHeader>*</ExposeHeader>
 </CORSRule>
</CORSConfiguration>"#;
		let conf: CorsConfiguration =
			from_str(message).expect("failed to deserialize xml into `CorsConfiguration` struct");
		let ref_value = CorsConfiguration {
			xmlns: (),
			cors_rules: vec![
				CorsRule {
					id: None,
					max_age_seconds: None,
					allowed_origins: vec!["http://www.example.com".into()],
					allowed_methods: vec!["PUT".into(), "POST".into(), "DELETE".into()],
					allowed_headers: vec!["*".into()],
					expose_headers: vec![],
				},
				CorsRule {
					id: None,
					max_age_seconds: None,
					allowed_origins: vec!["*".into()],
					allowed_methods: vec!["GET".into()],
					allowed_headers: vec![],
					expose_headers: vec![],
				},
				CorsRule {
					id: Some("qsdfjklm".into()),
					max_age_seconds: Some(IntValue(12345)),
					allowed_origins: vec!["https://perdu.com".into()],
					allowed_methods: vec!["GET".into(), "DELETE".into()],
					allowed_headers: vec!["*".into()],
					expose_headers: vec!["*".into()],
				},
			],
		};
		assert_eq! {
			ref_value,
			conf
		};

		let message2 = to_xml_with_header(&ref_value).expect("xml serialization");

		assert_eq!(unprettify_xml(message), unprettify_xml(&message2));
	}

	#[test]
	fn test_deserialize_norules() {
		let message = r#"<?xml version="1.0" encoding="UTF-8"?>
	<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"></CORSConfiguration>"#;
		let conf: CorsConfiguration = from_str(message).unwrap();
		let ref_value = CorsConfiguration {
			xmlns: (),
			cors_rules: vec![],
		};
		assert_eq! {
			ref_value,
			conf
		};

		let message2 = to_xml_with_header(&ref_value).expect("xml serialization");
		assert_eq!(unprettify_xml(&message), unprettify_xml(&message2));
	}
}
