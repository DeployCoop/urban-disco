### Added

- Operator deployment now includes configurable liveness and readiness probes (hitting `/healthz` and `/readyz`) ([#1956](https://github.com/fluent/fluent-operator/pull/1956))

### Changed

- Hardened default `podSecurityContext` and `securityContext` for the operator: `runAsNonRoot`, `runAsUser/Group 65532`, `readOnlyRootFilesystem`, drop `ALL` capabilities, `seccompProfile: RuntimeDefault` ([#1956](https://github.com/fluent/fluent-operator/pull/1956))
- Bumped default Fluent Bit image tag to `v5.0.5` ([#1968](https://github.com/fluent/fluent-operator/pull/1968))
- Bumped fluent-operator to v3.8.0
