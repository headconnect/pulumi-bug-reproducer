## Pulumi Bug Reproduction Repo

This repo is set up to show code for reproducing some pulumi bugs. 

## Pulumi Automation #6632: Overwriting Pulumi.yaml

Password for stack will likely not be necessary, but set `PULUMI_CONFIG_PASSPHRASE=password` nonetheless just in case.

### Reproduction:

Run the `automation.ts` file any way you like (`ts-node automation.ts` or `npm run start`). 
It is set up to use local workdir (".").

It will error out with something similar to this:

```
previewing stack
CommandError: code: 4294967295
 stdout: Previewing update (dev.infra.debugger):

    pulumi:pulumi:Stack debug-infra-dev.infra.debugger running
    pulumi:pulumi:Stack debug-infra-dev.infra.debugger running error: Missing required configuration variable 'azure:netDefs'
    pulumi:pulumi:Stack debug-infra-dev.infra.debugger running error: Missing required configuration variable 'azure:netDefs'
    pulumi:pulumi:Stack debug-infra-dev.infra.debugger  2 errors

Diagnostics:
  pulumi:pulumi:Stack (debug-infra-dev.infra.debugger):
    error: Missing required configuration variable 'azure:netDefs'
        please set a value using the command `pulumi config set azure:netDefs <value>`
    error: Missing required configuration variable 'azure:netDefs'
        please set a value using the command `pulumi config set azure:netDefs <value>`
```

This is a symptom that it could not read the `stack/Pulumi.dev.infra.debugger.yaml` file.

You will also note that it has created that file in the local (".") directory - as well as having overwritten the Pulumi.yaml file (ironically removes the `stack:` parameter).


