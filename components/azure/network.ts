import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

import { netRules } from "./netRules" // default firewall rule set
import * as _ from "lodash" 


export const createNetworks = async function(netStack : any) : Promise<any> {
    const config = new pulumi.Config("azure");
    
    let networkConfiguration : any = config.getObject("network") == undefined ? {} : config.getObject("network")
    let subnetConfiguration : any = config.getObject("subnets") == undefined ? {} : config.getObject("subnets")

    /// DEFAULTS

    const networkDefaults = {
        vnet: {            
            enableDdosProtection: false,
            enableVmProtection: false,
            virtualNetworkPeerings: []
        }
    }

    const subnetDefaults = {
        // zone1: null,
        zone2: {
            cidr: netStack.netDefs.zone2cidr,
            makeSubnet: true,
            makeNsg: true,
            k8sNodeSubnet: false,            
            serviceEndpoints: [],
            nsgRules: [ "Permit_VirtualNetwork_in" ]
        },
        // zone3: null,
        zone4: {
            cidr: netStack.netDefs.zone4cidr,
            makeSubnet: true,
            makeNsg: true,
            k8sNodeSubnet: true,
            serviceEndpoints: [{
                service: "Microsoft.Storage"
            }],
            nsgRules: [ "Permit_VirtualNetwork_in" ]
        },
        // zone5: null,
        // zone6: null,
        zone7: {
            cidr: netStack.netDefs.zone7cidr,
            makeSubnet: true,
            gatewaySubnet: false,
            makeNsg: false,
            k8sNodeSubnet: false,            
            serviceEndpoints: [],
            nsgRules: []
        },
        zone8: {
            cidr: netStack.netDefs.zone8cidr,
            makeSubnet: true,
            gatewaySubnet: true,
            makeNsg: true,
            k8sNodeSubnet: false,            
            serviceEndpoints: [],
            nsgRules: [
                "Permit_backend_health_comm_in",
                "Permit_AzureLoadBalancer_in",
                "Permit_VirtualNetwork_in",
                "Deny_any_any",
                "Permit_Internet_in"
            ]
        }
    }

    // now we can merge config

    netStack.network = {
        net: _.defaultsDeep(networkConfiguration, networkDefaults),
        subnet: _.defaultsDeep(subnetConfiguration, subnetDefaults)
    }  

     /***
     * Creating VNet
     * - This might be premature, but we'll never know.. I think subnet needs it at least
     */

    const vnetName = `${netStack.netDefs.logicalName}vnet`;
    let addressPrefixArray = [];
    for (const net in netStack.network.subnet) {
        addressPrefixArray.push(netStack.network.subnet[net].cidr)
    }


    const virtualNetwork = new azure.network.VirtualNetwork(vnetName, {
        virtualNetworkName: vnetName,
        resourceGroupName: netStack.parameters.name,
        location: netStack.parameters.location,
        tags: netStack.netDefs.tags,
        addressSpace: {addressPrefixes: addressPrefixArray},
        enableDdosProtection: netStack.network.net.vnet.enableDdosProtection,
        enableVmProtection: netStack.network.net.vnet.enableVmProtection,
        virtualNetworkPeerings: netStack.network.net.vnet.virtualNetworkPeerings
    },{
        ignoreChanges: ['subnets'] // re: https://github.com/pulumi/pulumi-azure-native/issues/611
    });

    netStack.network.vnet = {
        resource: virtualNetwork,
        parameters: {
            name: virtualNetwork.name.apply(name => name),
            id: virtualNetwork.id.apply(id => id)
        }
    }
    

    /***
     *  Looping for subnets and ngsgs
     */

    for (const netName in netStack.network.subnet) {
        netStack.network[netName] = {};
        /****
         * Creating NSGs first
         */
        
        if (netStack.network.subnet[netName].makeNsg) {
            
            // assigning actual rules to configuration
            for (const [rulenr, rule] of netStack.network.subnet[netName].nsgRules.entries()) {
                netStack.network.subnet[netName].nsgRules[rulenr] = _.defaults({name: rule}, netRules[rule])
            }
            const nsgName = `${netStack.netDefs.logicalName}_${netName}-${netStack.netDefs.nodeName}`
            const nsg = new azure.network.NetworkSecurityGroup(nsgName, {
                tags: netStack.netDefs.tags,
                location: netStack.parameters.location,
                networkSecurityGroupName: nsgName,
                resourceGroupName: netStack.parameters.name,
                securityRules: netStack.network.subnet[netName].nsgRules,
            });
            netStack.network[netName].nsg = {
                resource: nsg,
                parameters: {
                    name: nsg.name.apply(name => name),
                    id: nsg.id.apply(id => id)
                }
            }
        }


        /****
         * Creating Subnets
         */

        if (netStack.network.subnet[netName].makeSubnet) {
            const subnetName = `${netName}-${netStack.netDefs.nodeName}` 
            let subnetConf : any = {
                name: subnetName,
                resourceGroupName: netStack.parameters.name,
                addressPrefix: netStack.network.subnet[netName].cidr,
                virtualNetworkName: netStack.network.vnet.parameters.name,
                serviceEndpoints: netStack.network.subnet[netName].serviceEndpoints
            }
            let subnetDeps;
            if (netStack.network.subnet[netName].makeNsg) { // trusting that nsg has been made ;)
                subnetDeps = [netStack.network.vnet.resource, netStack.network[netName].nsg.resource]
                subnetConf.networkSecurityGroup = {id: netStack.network[netName].nsg.parameters.id}
            } else {
                subnetDeps = [netStack.network.vnet.resource]
            }
            
            const subnet = new azure.network.Subnet(subnetName, subnetConf, {dependsOn: subnetDeps})

            netStack.network[netName].subnet = {
                resource: subnet,
                parameters: {
                    name: subnet.name.apply(name => name),
                    id: subnet.id.apply(id => id)
                }
            }
            
        }
    }

    
    return netStack;
}
