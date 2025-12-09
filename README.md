# Void
an api auth gateway

## Ansible
use the ansible/module.py module in your ansible play to interactively configure grafana alloy to send loki and prometheus logs through void

## Deploy
### Docker
1. copy .env.example to .env
2. modify variables in .env
3. docker compose up

### Kubernetes
1. compile and push image to registry
2. modify image ref in ./manifests/deployment.yaml
3. modify variables in ./manifests/deployment.yaml
4. create secret following the variable names from ./manifests/secret.txt
5. deploy all manifests on kubernetes
