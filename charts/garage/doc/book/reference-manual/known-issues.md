+++
title = "Known issues"
weight = 80
+++

Issues in each section are roughly sorted by order of decreasing impact, based on actual reports from  users.

## Architectural limitations

Issues that are caused by design decisions of Garage internals, and that can't
be fixed without major architectural changes in the codebase.

### Metadata performance issues with many objects

**Related issues:**

- [#851 - Performances collapse with 10 millions pictures in a bucket](https://git.deuxfleurs.fr/Deuxfleurs/garage/issues/851)
- [#1222 - Cluster Setup Write Performance Degraded After Writing 10 Million Object (200-300Kb per object)](https://git.deuxfleurs.fr/Deuxfleurs/garage/issues/1222)

### Very big objects cause performance degradation

For each object, there is a single metadata entry called a `Version` that
contains a list of all of the data blocks in the object.  For very big objects,
this entry can contain thousands of block references.  During the uploading of
an object, this metadata entry needs to be read, deserialized, reserialized and
written for each individual data block uploaded.  This means that the
complexity of an upload is `O(n²)` in the number of blocks needed.

This manifests by excessive metadata I/O and CPU usage, and uploads eventually stalling.

**Mitigation:** Increase the `block_size` configuration parameter to reduce the
number of blocks. Make sure multipart uploads use chunks that are at least
`block_size` in size, and that are an exact multiple of `block_size` to avoid
the creation of smaller blocks.

**Long-term solution:** An architectural change in the metadata system would be
required to store block lists in many independent metadata entries instead of
one single big entry per object.

**Related issues:**

- [#662 - Large Files fail to upload](https://git.deuxfleurs.fr/Deuxfleurs/garage/issues/662)
- [#1366 - High CPU usage and performance degradation during long multipart uploads](https://git.deuxfleurs.fr/Deuxfleurs/garage/issues/1366)

### No conditional writes / locking / WORM support (`if-none-match`, ...)

This is structurally impossible to implement in Garage due to the lack of a consensus algorithm,
which is one of Garage's core design choices which we cannot reconsider.

A semi-working, *unsafe* implementation of WORM and object locking could be
implemented, with the following constraint: only after the completion of the
first write (in case of WORM) or the setting of a lock (for object lock) can we
guarantee that the object cannot be overwritten. In case where an overwrite
requests arrives at the same time as the initial request to write or to lock
the object, we cannot implement a safe and consistent way to reject it.  This
means that many practical use-cases for `if-none-match` cannot be supported
(e.g. using it to implement mutual exclusion between concurrent writers).

**Related issues:**

- [#1052 - Support conditional writes](https://git.deuxfleurs.fr/Deuxfleurs/garage/issues/1052)
- [#1127 - Feature Request: WORM (Write Once Read Many) / Object Lock Support](https://git.deuxfleurs.fr/Deuxfleurs/garage/issues/1127)

### `CreateBucket` race condition

Also due to the lack of a consensus algorithm, there is no mutual exclusion
between concurrent `CreateBucket` requests using the same bucket name.

**Related issues:**

- [#649 - Race condition in CreateBucket](https://git.deuxfleurs.fr/Deuxfleurs/garage/issues/649)

### Metadata and data have the same replication factor

There is a single `replication_factor` in the configuration file that applies both to data blocks and metadata entries.
This makes clusters with `replication_factor = 1` particularly vulnerable in cases of metadata corruption (see below), as there
is a single copy of the metadata for each object even in multi-node clusters.

**Mitigation:** Do not use `replication_factor = 1`.

**Long-term solution:** We want to allow scenarios such as replicating the
metadata on 2, 3 or more nodes and the data on only 1 or 2 nodes (for example),
so that the metadata can benefit from better redundancy without increasing the
storage costs for the entire dataset. This will require some important changes
in the codebase.

**Related issues:**

- [#720 - Separate replication modes for metadata/data](https://git.deuxfleurs.fr/Deuxfleurs/garage/issues/720)

### Node count limitation

Garage will have issues in clusters with too many nodes, it will not be able to
spread data uniformly among nodes and some nodes will fill up faster than
other. This starts to manifest when the number of nodes is bigger than `10 ×
replication_factor`.  This is due to the fact that Garage uses only 256
partitions internally.

**Mitigation:** Build clusters with fewer, bigger nodes.

**Potential solution:** This can be fixed by increasing the number of
partitions in Garage. The code paths exist, there is [a `const`
somewhere](https://git.deuxfleurs.fr/Deuxfleurs/garage/src/commit/6fd9bba0cb55062cb1725ab961b7fa8acb9dcc61/src/rpc/layout/mod.rs#L35)
that theoretically allows to increase the number of partitions up to `2^16`,
but this has not been tested so there might be bugs.

### Buckets are not sharded

For each bucket, the first metadata layer that contains an index of all objects
is not sharded.  This index, which includes the names and all metadata (size,
headers, ...) for each object, is stored on `$replication_factor` nodes.

For instance with `replication_factor = 3`, a given bucket will use only 3
specific nodes for this index (chosen at random when the bucket is created) to
store this index.  In a multi-zone deployments, these nodes will be spread in
different zones.  Each bucket uses a different set of 3 random nodes for its
index.

As a consequence, very large buckets might cause uneven load distribution
within a cluster.  If all of the requests on a cluster are for objects in a
single bucket, then the `$replication_factor` nodes that store the index will
become a hotspot in the cluster, with more intensive metadata access patterns.
There is no way of choosing which nodes will have this role.

Currently, we have no report of this being an issue in practice.

**Mitigation:** This impacts in particular clusters that are used for a single
purpose with a single bucket. This can be solved by dividing your dataset among
many buckets, using a client-side sharding strategy that you will have to
design. Use at least as many buckets as you have nodes on your cluster.


## Bugs

Known bugs that are complex to diagnose and fix, and therefore have not been
fixed yet.

### LMDB metadata corruption

Many users have reported situations where the LMDB metadata db becomes
corrupted, sometimes after a forced shutdown of Garage or in case of power
loss.  A corrupted database file is generally not recoverable.

**Mitigation:** Use a `replication_factor` of at least 2. Configure automatic
snapshotting using `metadata_auto_snapshot_interval` so that in case of
corruption you can rollback to a working database.

Note that taking filesystem-level snapshots of your `metadata_dir`, although it
is much faster and less I/O intensive than Garage's built-in snapshotting, does
not ensure that the snapshot will be consistent. If the snapshot is taking
during a metadata write, the snapshot itself might be corrupted and thus not
usable as a rollback point. Therefore, prefer using
`metadata_auto_snapshot_interval` in all cases.

### Layout updates might require manual intervention

In case of disconnected nodes, when changing the cluster layout to remove these
nodes and add other nodes instead, Garage might not be able to properly evict
the old nodes from the system. This is a built-in security measure to avoid any
inconsistent cluster states.

This manifests by several cluster layout versions staying active even after a
full resync. You can diagnose this situation with `garage layout history`,
which will give you instructions to fix it.

### Tag assignment

In the `garage layout assign` command, the `-t` argument has to be repeated
multiple times to set multiple tags on a node. Writing multiple tags separated
by commas will result in a single string.

## General footguns

Choices made by the developers that users must be aware of if they don't want
to run into potential issues.

### Resync tranquility is conservative by default

By default, the worker parameters `resync-tranquility` and `resync-worker-count` are set to very conservative values, to avoid overloading nodes with I/O when data needs to be resynchronized between nodes.
This can cause issues where the resync queue grows faster than it can be cleared, which in turn causes performance issues in the rest of Garage.

This situation is indicated by a big resync queue with few resync errors (the queue is not caused by a disconnected/malfunctionning node).
To fix it, increase the number of resync workers and reduce the resync tranquility. For instance, if you want to resync as fast as possible:

```
garage worker set -a resync-worker-count 8
garage worker set -a resync-tranquility 0
```
