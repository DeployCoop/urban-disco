use std::sync::Arc;
use std::time::Duration;

use garage_rpc::layout::*;
use garage_rpc::{replication_mode::ConsistencyMode, system::System};
use garage_util::data::*;
use garage_util::error::Error;

use crate::replication::*;

// TODO: find a way to track layout changes for this as well
// The hard thing is that this data is stored also on gateway nodes,
// whereas sharded data is stored only on non-Gateway nodes (storage nodes)
// Also we want to be more tolerant to failures of gateways so we don't
// want to do too much holding back of data when progress of gateway
// nodes is not reported in the layout history's ack/sync/sync_ack maps.

/// Full replication schema: all nodes store everything
/// Advantage: do all reads locally, extremely fast
/// Inconvenient: only suitable to reasonably small tables
/// Inconvenient: if some writes fail, nodes will read outdated data
#[derive(Clone)]
pub struct TableFullReplication {
	/// The membership manager of this node
	pub system: Arc<System>,
	pub consistency_mode: ConsistencyMode,
}

impl TableReplication for TableFullReplication {
	type WriteSets = WriteLock<Vec<Vec<Uuid>>>;

	// Do anti-entropy every 10 seconds.
	// Compared to sharded tables, anti-entropy is much less costly as there is
	// a single partition hash to exchange.
	// Also, it's generally a much bigger problem for fullcopy tables to be out of sync.
	const ANTI_ENTROPY_INTERVAL: Duration = Duration::from_secs(10);

	fn storage_nodes(&self, _hash: &Hash) -> Result<Vec<Uuid>, Error> {
		Ok(self.system.cluster_layout().all_nodes()?.to_vec())
	}

	fn read_nodes(&self, _hash: &Hash) -> Result<Vec<Uuid>, Error> {
		Ok(self
			.system
			.cluster_layout()
			.read_version()?
			.all_nodes()
			.to_vec())
	}
	fn read_quorum(&self) -> Result<usize, Error> {
		match self.consistency_mode {
			ConsistencyMode::Dangerous | ConsistencyMode::Degraded => Ok(1),
			ConsistencyMode::Consistent => {
				let layout = self.system.cluster_layout();
				let nodes = layout.read_version()?.all_nodes();
				Ok(nodes.len().div_ceil(2))
			}
		}
	}

	fn write_sets(&self, _hash: &Hash) -> Result<Self::WriteSets, Error> {
		self.system.layout_manager.write_lock_with(write_sets)
	}
	fn write_quorum(&self) -> Result<usize, Error> {
		match self.consistency_mode {
			ConsistencyMode::Dangerous => Ok(1),
			ConsistencyMode::Degraded | ConsistencyMode::Consistent => {
				let layout = self.system.cluster_layout();
				let min_len = layout
					.versions()?
					.iter()
					.map(|x| x.all_nodes().len())
					.min()
					.unwrap();
				let max_quorum = layout
					.versions()?
					.iter()
					.map(|x| x.all_nodes().len().div_euclid(2) + 1)
					.max()
					.unwrap();
				if min_len < max_quorum {
					warn!("Write quorum will not be respected for TableFullReplication operations due to multiple active layout versions with vastly different number of nodes");
					Ok(std::cmp::max(1, min_len))
				} else {
					Ok(max_quorum)
				}
			}
		}
	}

	fn partition_of(&self, _hash: &Hash) -> Result<Partition, Error> {
		Ok(0u16)
	}

	fn sync_partitions(&self) -> Result<SyncPartitions, Error> {
		let layout = self.system.cluster_layout();
		let layout_version = layout.ack_map_min();

		let partitions = vec![SyncPartition {
			partition: 0u16,
			first_hash: [0u8; 32].into(),
			last_hash: [0xff; 32].into(),
			storage_sets: write_sets(layout.versions()?),
		}];

		Ok(SyncPartitions {
			layout_version,
			partitions,
		})
	}
}

fn write_sets(layout_versions: &[LayoutVersion]) -> Vec<Vec<Uuid>> {
	layout_versions
		.iter()
		.map(|x| x.all_nodes().to_vec())
		.collect()
}
