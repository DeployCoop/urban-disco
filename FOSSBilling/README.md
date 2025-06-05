# fossbilling_katernary

A Helm chart for fossbilling_katernary

## Installing the Chart

To install the chart with the release name `my-release`:

```bash
# Standard Helm install
$ helm install  my-release fossbilling_katernary

# To use a custom namespace and force the creation of the namespace
$ helm install my-release --namespace my-namespace --create-namespace fossbilling_katernary

# To use a custom values file
$ helm install my-release -f my-values.yaml fossbilling_katernary
```

See the [Helm documentation](https://helm.sh/docs/intro/using_helm/) for more information on installing and managing the chart.

## Configuration

The following table lists the configurable parameters of the fossbilling_katernary chart and their default values.

| Parameter                                                 | Default                   |
| --------------------------------------------------------- | ------------------------- |
| `fossbilling.imagePullPolicy`                             | `IfNotPresent`            |
| `fossbilling.persistence.fossbilling.accessMode[0].value` | `ReadWriteOnce`           |
| `fossbilling.persistence.fossbilling.enabled`             | `true`                    |
| `fossbilling.persistence.fossbilling.size`                | `1Gi`                     |
| `fossbilling.persistence.fossbilling.storageClass`        | `-`                       |
| `fossbilling.replicas`                                    | `1`                       |
| `fossbilling.repository.image`                            | `fossbilling/fossbilling` |
| `fossbilling.repository.tag`                              | `latest`                  |
| `fossbilling.serviceAccount`                              | ``                        |
| `mysql.imagePullPolicy`                                   | `IfNotPresent`            |
| `mysql.persistence.mysql.accessMode[0].value`             | `ReadWriteOnce`           |
| `mysql.persistence.mysql.enabled`                         | `true`                    |
| `mysql.persistence.mysql.size`                            | `1Gi`                     |
| `mysql.persistence.mysql.storageClass`                    | `-`                       |
| `mysql.replicas`                                          | `1`                       |
| `mysql.repository.image`                                  | `mysql`                   |
| `mysql.repository.tag`                                    | `8.2`                     |
| `mysql.serviceAccount`                                    | ``                        |


