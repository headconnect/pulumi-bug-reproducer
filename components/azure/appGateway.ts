import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as random from "@pulumi/random";

import * as _ from "lodash" 





export const createAppGW = async function(gwStack : any) : Promise<any> {
    const config = new pulumi.Config("azure");

    let gwConfiguration : any = config.getObject("appGateway") == undefined ? {} : config.getObject("appGateway");
    /***
     * Creating a public IP for the App GW first and foremost - no config here.
     */
    
    const pubIp = new azure.network.PublicIPAddress(`${gwStack.netDefs.nodeName}appgw-publicIp`, {
        resourceGroupName: gwStack.parameters.name,
        location: gwStack.parameters.location,
        publicIPAllocationMethod: "Static",
        sku: {
            name: "Standard"
        }
    })

    gwStack.network.appgw = {
        pubip:{
            resource: pubIp,
            parameters: {
                name: pubIp.name.apply(name => name),
                id: pubIp.id.apply(id => id),
                ip: pubIp.ipAddress.apply(ip => ip)
            }
        },
        conf: {},
        resource: {},
        parameters: {}
    }

    /***
     * Setting defaults for AppGW. 
     * 
     * Fare thee well, thou who toucheth this config.
     * 
     */

    const rgId : pulumi.Output<string> = gwStack.parameters.resource.id;
    const appGwIdPrefix = rgId.apply(rgid => `${rgid}/providers/Microsoft.Network/applicationGateways/${gwStack.netDefs.nodeName}appgw`)

    const defaultAppGwConf = {
        applicationGatewayName: `${gwStack.netDefs.nodeName}appgw`,
        autoscaleConfiguration: {
            maxCapacity: 10,
            minCapacity: 0
        },
        backendAddressPools: [{
           name: "defaultbackendpool" ,
           backendAddresses: []
        }],
        backendHttpSettingsCollection: [{
            cookieBasedAffinity: "Disabled",
            name: "defaulthttpsetting",
            requestTimeout: 20,
            port: 80
        }],
        enableHttp2: true,
        frontendIPConfigurations: [{
            name: "appGwPublicFrontendIp",
            publicIPAddress: {
                id: pubIp.id
            }
        }],
        frontendPorts: [{
            name: "port_80",
            port: 80
        }],
        gatewayIPConfigurations: [{
            name: "appGatewayIpConfig",
            subnet: {
                id: gwStack.network.zone8.subnet.parameters.id
            }
        }],
        httpListeners: [{
            frontendIPConfiguration: {
                id: pulumi.interpolate`${appGwIdPrefix}/frontendIPConfigurations/appGwPublicFrontendIp`,
            },
            frontendPort: {
                id: pulumi.interpolate`${appGwIdPrefix}/frontendPorts/port_80`,
                
            },
            name: "defaulthttplistener",
            protocol: "Http",
        }],
        location: gwStack.parameters.location,
        probes: [],
        requestRoutingRules: [{
            backendAddressPool: {
                id: pulumi.interpolate`${appGwIdPrefix}/backendAddressPools/defaultbackendpool`,
            },
            backendHttpSettings: {
                id: pulumi.interpolate`${appGwIdPrefix}/backendHttpSettingsCollection/defaulthttpsetting`,
            },
            httpListener: {
                id: pulumi.interpolate`${appGwIdPrefix}/httpListeners/defaulthttplistener`,
            },
            name: "appgwrule"
        }],
        resourceGroupName: gwStack.parameters.name,
        sku: {
            name: "WAF_v2",
            tier: "WAF_v2"
        },
        sslCertificates: [],
        tags: gwStack.netDefs.tags,
        webApplicationFirewallConfiguration: {
            enabled: true,
            firewallMode: "Prevention",
            ruleSetType: "OWASP",
            ruleSetVersion: "3.0"
        }
    }

    gwStack.network.appgw.conf = _.defaultsDeep(gwConfiguration, defaultAppGwConf);

    const appGw = new azure.network.ApplicationGateway(gwStack.network.appgw.conf.applicationGatewayName, gwStack.network.appgw.conf);

    gwStack.network.appgw.resource = appGw;
    gwStack.network.appgw.parameters = {
        name: appGw.name.apply(name => name),
        id: appGw.id.apply(id => id)
    }

    return gwStack;
}