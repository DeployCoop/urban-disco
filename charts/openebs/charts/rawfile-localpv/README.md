# rawfile-localpv

![Version: 0.12.0](https://img.shields.io/badge/Version-0.12.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 0.12.0](https://img.shields.io/badge/AppVersion-0.12.0-informational?style=flat-square)

RawFile Driver Container Storage Interface

**Homepage:** <https://openebs.io/>

## Source Code

* <https://github.com/openebs/rawfile-localpv>

## Requirements

Kubernetes: `>= 1.21`

| Repository | Name | Version |
|------------|------|---------|
|  | crds | 0.0.1 |

## Install and Upgrades

Please follow the [install guide](https://github.com/openebs/rawfile-localpv/tree/v0.12.0/docs/install-guide.md)

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| auth.enabled | bool | `true` | Enables authentication for internal gRPC server |
| auth.token | string | `""` | Sets authentication token for internal gRPC server, will generate one if nothing provided |
| capacityOverride | string | `""` | Overrides total capacity of the storage for data dir storage on each host (Support size values) [e.g. `50GB` or `10MiB`] |
| controller.externalResizer.image.registry | string | `""` | Image registry for `csi-resizer` |
| controller.externalResizer.image.repository | string | `"sig-storage/csi-resizer"` | Image Repository for `csi-resizer` |
| controller.externalResizer.image.tag | string | `"v1.13.2"` | Image tag for `csi-resizer` |
| controller.grpcWorkers | int | `10` | Number of gRPC workers for controller component |
| controller.image.pullPolicy | string | `""` | Overrides default image pull policy for node component |
| controller.image.repository | string | `""` | Overrides default image repository for node component |
| controller.image.tag | string | `""` | Overrides default image tag for node component |
| controller.priorityClassName | string | `"system-cluster-critical"` | priorityClassName for controller component since this part is critical for cluster `system-cluster-critical` is default |
| controller.resources | object | `{}` | Sets compute resources for controller component |
| controller.tolerations | list | `[{"effect":"NoSchedule","key":"node-role.kubernetes.io/master","operator":"Equal","value":"true"}]` | Tolerations for controller component |
| crds.csi.volumeSnapshots.enabled | bool | `true` | Install Volume Snapshot CRDs |
| crds.enabled | bool | `true` | Disables the installation of all CRDs if set to false |
| global.analytics.enabled | bool | `true` | Enable OpenEBS analytics which help track engine traction and usage. |
| global.imagePullPolicy | string | `"IfNotPresent"` | Default pull policy for images |
| global.imagePullSecrets | list | `[]` | Default image pull secret for images |
| global.imageRegistry | string | `"docker.io"` | Default image registry for Images from DockerHub |
| global.k8sImageRegistry | string | `"registry.k8s.io"` | Default image registry for Images from Kubernetes (registry.k8s.io) |
| image.pullPolicy | string | `"IfNotPresent"` | Default image pull policy for node and controller components |
| image.registry | string | `""` | Image registry for rawfile-localpv (default is global.imageRegistry) |
| image.repository | string | `"openebs/rawfile-localpv"` | Image repository for rawfile-localpv |
| image.tag | string | `""` | Default image tag for node and controller components (uses AppVersion if empty) |
| imagePullSecrets | list | `[]` | Sets image pull secret while pulling images from a private registry |
| logFormat | string | `"json"` | Format of the logs (json, pretty) |
| logLevel | string | `"INFO"` | Level of the logs (DEBUG, INFO, etc.) |
| metrics.enabled | bool | `true` | Completely enable or disable metrics |
| metrics.port | int | `9100` | Sets metrics port |
| metrics.serviceMonitor.enabled | bool | `false` | Enables prometheus service monitor |
| metrics.serviceMonitor.interval | string | `"1m"` | Sets prometheus target interval |
| node.dataDirPath | string | `"/var/csi/rawfile"` | Data dir path for provisioner to be used by provisioner |
| node.driverRegistrar.image.registry | string | `""` | Image Registry for `csi-node-driver-registrar` |
| node.driverRegistrar.image.repository | string | `"sig-storage/csi-node-driver-registrar"` | Image Repository for `csi-node-driver-registrar` |
| node.driverRegistrar.image.tag | string | `"v2.13.0"` | Image Tag for `csi-node-driver-registrar` |
| node.externalProvisioner.image.registry | string | `""` | Image Registry for `csi-provisioner` |
| node.externalProvisioner.image.repository | string | `"sig-storage/csi-provisioner"` | Image Repository for `csi-provisioner` |
| node.externalProvisioner.image.tag | string | `"v5.2.0"` | Image Tag for `csi-provisioner` |
| node.externalSnapshotter.image.registry | string | `""` | Image Registry for `csi-snapshotter` |
| node.externalSnapshotter.image.repository | string | `"sig-storage/csi-snapshotter"` | Image Repository for `csi-snapshotter` |
| node.externalSnapshotter.image.tag | string | `"v8.2.1"` | Image Tag for `csi-snapshotter` |
| node.grpcWorkers | int | `10` | Number of gRPC workers for node component |
| node.image.pullPolicy | string | `""` | Overrides default image pull policy for node component |
| node.image.repository | string | `""` | Overrides default image repository for node component |
| node.image.tag | string | `""` | Overrides default image tag for node component |
| node.internalGRPC.port | int | `4500` | Port Number used for internal communication gRPC server |
| node.internalGRPC.workers | int | `10` | gRPC worker count used for internal communication |
| node.kubeletPath | string | `"/var/lib/kubelet"` | Kubelet path (Set to `/var/lib/k0s/kubelet` for k0s) |
| node.metadataDirPath | string | `"/var/local/openebs/rawfile/{{ .Release.Name }}/meta"` | Metadata dir path for rawfile volumes metadata and tasks store file |
| node.metrics.enabled | bool | `false` |  |
| node.priorityClassName | string | `"system-node-critical"` | priorityClassName for node component since this part is critical for node `system-node-critical` is default |
| node.resources | object | `{}` | Sets compute resources for node component |
| node.snapshotController.image.registry | string | `""` | Image Registry for `snapshot-controller` |
| node.snapshotController.image.repository | string | `"sig-storage/snapshot-controller"` | Image Repository for `snapshot-controller` |
| node.snapshotController.image.tag | string | `"v8.2.1"` | Image Tag for `snapshot-controller` |
| node.tolerations | string | `nil` | Tolerations for node component |
| provisionerName | string | `"rawfile.csi.openebs.io"` | Name of the registered CSI Driver in the cluster |
| reservedCapacity | string | `""` | Used to reserve capacity on each node for data dir storage on each host (Supports percentage and size) [e.g. `25%` or `50GB` or `10MiB`] |
| snapshotClasses[0].deletionPolicy | string | `"Delete"` | Sets deletion policy for snapshots created using this class (Delete or Retain) |
| snapshotClasses[0].enabled | bool | `true` | Enable or disable SnapshotClass |
| snapshotClasses[0].isDefault | bool | `false` | Make the snapshot class as default |
| snapshotClasses[0].name | string | `"rawfile-localpv"` | Name of the SnapshotClass |
| storageClasses[0].allowVolumeExpansion | bool | `true` | volumes are able to expand/resize or not? |
| storageClasses[0].copyOnWrite | string | `""` | Enables CoW on storage class (defaults to autodetect) |
| storageClasses[0].enabled | bool | `true` | Enable or disable StorageClass |
| storageClasses[0].formatOptions | list | `[]` | Sets format options for filesystem volumes |
| storageClasses[0].freezeFs | string | `""` | Enables FreezeFS on storage class can be used to enable snapshotting of inused volumes when CoW is disabled/not supported (False by default) |
| storageClasses[0].fsType | string | `"ext4"` | Sets filesystem type for volumes (Currently supports `btrfs`, `xfs` and `ext4` [which is default]) |
| storageClasses[0].isDefault | bool | `false` | Make the storage class as default |
| storageClasses[0].mountOptions | list | `[]` | Sets mount options for filesystem volumes |
| storageClasses[0].name | string | `"rawfile-localpv"` | Name of the StorageClass |
| storageClasses[0].reclaimPolicy | string | `"Delete"` | Sets default reclaimPolicy for StorageClass volumes |
| storageClasses[0].thinProvision | string | `""` | Enables thin provisioning of volumes |
| storageClasses[0].volumeBindingMode | string | `"WaitForFirstConsumer"` | Sets volumeBindingMode for StorageClass |
