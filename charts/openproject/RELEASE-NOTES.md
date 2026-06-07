

### Minor Changes

- 6c7258d: Make `openproject.useTmpVolumes` fall back to `containerSecurityContext.readOnlyRootFilesystem` rather than `not develop`.
- b02b701: Allow iam credentials for s3 access
- 2cc6632: Fix Ruby pods crashing on CSI drivers that mount tmp volumes world-writable without the sticky bit. A non-root init container now creates a sticky-bit /tmp/ruby directory and TMPDIR is pointed at it. Can be disabled with openproject.tmpVolumesPermissionFix=false.

