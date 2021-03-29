## Pulumi Bug Reproduction Repo

This repo is set up to show code for reproducing some pulumi bugs. 

### Pulumi Automation #6633: Promise leaks in azure devops pipelines

Passphrase = password

azure-pipelines.yaml is set up to use azure-cli task, either change this or provide a serviceConnection.

Ensure that you set up a remote backend for the stack so that there is something there (or not, I don't know).

Execute the pipeline.

Note the leaks.