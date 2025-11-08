# urban-disco
Urban Disco is a repository of helm charts intended to be a base

## fetchr

```
./fetchr
```

This script destroys and recreates the charts directory with the intention being to update the charts.  There are three other files that should be considered when adding more charts:

`list_fetch` has lines like:

```
helm fetch --untar argo/argo-cd
```

`repo_list` has lines like:

```
helm repo add argo https://argoproj.github.io/argo-helm
```

I if you need anything more complicated it goes in the custom file.   In this file you will see me checkout charts that are being incubated here for various purpose, and rename some charts that have generic names that might conflict, and a few other custom scenarios.

### Historical context

I usually just delete the chart and `helm fetch --untar` it again, 
and then do `git diff` to study mainly the differences in the values.yaml file
to see if the structure has changed and values need to be updated or moved, 
for example an ingress might be moved to a subordinate service:

```yaml
ingress:
  enabled: false
  className: nginx
```

to:

```yaml
web:
  ingress:
    enabled: false
    className: nginx
```
