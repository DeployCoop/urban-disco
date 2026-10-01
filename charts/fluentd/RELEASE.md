
### Added

- Support `tpl` evaluation in `podAnnotations` to allow dynamic checksums from parent charts. ([#709](https://github.com/fluent/helm-charts/pull/709)) @elimayost
- Add `variantVersion` value to specify the version of the variant to use. ([#720](https://github.com/fluent/helm-charts/pull/720)) @stevehipwell
- Add `topologySpreadConstraints` value to spread pods across zones or nodes. ([#747](https://github.com/fluent/helm-charts/pull/747)) @ranyhb

### Changed

- Use SemVer for chart versioning (remove `v` prefix from `appVersion`). ([#720](https://github.com/fluent/helm-charts/pull/720)) @stevehipwell
- Update _Fluentd_ app version to [`1.19.2`](https://github.com/fluent/fluentd/releases/tag/v1.19.2). ([#720](https://github.com/fluent/helm-charts/pull/720)) @stevehipwell
- Update _elasticsearch7_ variant version to `1.6`. ([#720](https://github.com/fluent/helm-charts/pull/720)) @stevehipwell
- Update _Fluentd_ app version to [`1.19.3`](https://github.com/fluent/fluentd/releases/tag/v1.19.3). ([#750](https://github.com/fluent/helm-charts/pull/750)) @stevehipwell
- Update _elasticsearch7_ variant version to `1.1`. ([#750](https://github.com/fluent/helm-charts/pull/750)) @stevehipwell

### Fixed

- Fix test connection pod to actually run so CI can pass. ([#720](https://github.com/fluent/helm-charts/pull/720)) @stevehipwell
- Don't render `spec.replicas` on the _Deployment_ when `autoscaling.enabled` is `true` or `replicaCount` is unset, so the _HorizontalPodAutoscaler_ owns the replica count. ([#745](https://github.com/fluent/helm-charts/pull/745)) @ranyhb
