pub use telemetry::init_tracing;

#[cfg(not(feature = "telemetry-otlp"))]
mod telemetry {
	use garage_util::data::Uuid;
	use garage_util::error::Error;

	#[expect(clippy::unnecessary_wraps)]
	pub fn init_tracing(_: &str, _: Uuid) -> Result<(), Error> {
		error!("Garage was built without OTLP exporter, admin.trace_sink is ignored.");
		Ok(())
	}
}

#[cfg(feature = "telemetry-otlp")]
mod telemetry {
	use std::time::Duration;

	use opentelemetry::sdk::{
		trace::{self, IdGenerator, Sampler},
		Resource,
	};
	use opentelemetry::KeyValue;
	use opentelemetry_otlp::WithExportConfig;

	use garage_util::data::*;
	use garage_util::error::*;

	pub fn init_tracing(export_to: &str, node_id: Uuid) -> Result<(), Error> {
		let node_id = hex::encode(&node_id.as_slice()[..8]);

		opentelemetry_otlp::new_pipeline()
			.tracing()
			.with_exporter(
				opentelemetry_otlp::new_exporter()
					.tonic()
					.with_endpoint(export_to)
					.with_timeout(Duration::from_secs(3)),
			)
			.with_trace_config(
				trace::config()
					.with_id_generator(IdGenerator::default())
					.with_sampler(Sampler::AlwaysOn)
					.with_resource(Resource::new(vec![
						KeyValue::new("service.name", "garage"),
						KeyValue::new("service.instance.id", node_id),
					])),
			)
			.install_batch(opentelemetry::runtime::Tokio)
			.ok_or_message("Unable to initialize tracing")?;

		Ok(())
	}
}
