## Pulumi Bug Reproduction Repo

This repo is set up to show code for reproducing some pulumi bugs. 

## Azure Native #699: vnet - nsg - subnet creation issue

https://github.com/pulumi/pulumi-azure-native/issues/699

### Reproduction

Simply clone this repo, select the stack "dev.infra.debugger" & run `pulumi up`.

Output should look similar to this:

```
Updating (dev.infra.debugger):
     Type                                          Name                            Status
 +   pulumi:pulumi:Stack                           debug-infra-dev.infra.debugger  **creating failed**
 +   ├─ azure-native:resources:ResourceGroup       Debugger1234_westeurope         created
 +   ├─ azure-native:network:PublicIPAddress       node1234appgw-publicIp          created
 +   ├─ azure-native:network:VirtualNetwork        Debugger1234vnet                created
 +   ├─ azure-native:network:NetworkSecurityGroup  Debugger1234_zone2-node1234     created
 +   ├─ azure-native:network:NetworkSecurityGroup  Debugger1234_zone4-node1234     created
 +   ├─ azure-native:network:NetworkSecurityGroup  Debugger1234_zone8-node1234     created
 +   ├─ azure-native:network:Subnet                zone7-node1234                  created
 +   ├─ azure-native:network:Subnet                zone4-node1234                  created
 +   ├─ azure-native:network:Subnet                zone8-node1234                  **creating fail
 +   └─ azure-native:network:Subnet                zone2-node1234                  **creating fail
 ```