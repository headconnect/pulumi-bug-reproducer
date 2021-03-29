import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import * as random from "@pulumi/random";

import * as _ from "lodash" 




export const createStorageAccounts = async function(saStack : any) : Promise<any> {

    const config = new pulumi.Config("azure");
    let saConfiguration : any = config.getObject("storageAccount") == undefined ? {} : config.getObject("storageAccount")
    
    /***
     * Setting up default values
     * 
     */

    const saDefaults = {
        kind: "StorageV2",
        sku: {
            name: "Standard_LRS"
        },
        location: saStack.parameters.location,
        resourceGroupName: saStack.parameters.name,
        networkRuleSet: {
            defaultAction: "Deny",
            bypass: "AzureServices",
            virtualNetworkRules: []
        },
        allowBlobPublicAccess: false,
        allowSharedKeyAccess: true
    }


    saStack.storage = {baseConfig: {},accounts: {}}

    /****
     * I genuinely apologize for all the code that is about to follow.
     * I really do.
     */

    if (saConfiguration.hasOwnProperty("common")) {
        // handling subNetReference first if exists
        if (saConfiguration.common.hasOwnProperty("subnetReference")) {
            
            let netRule = {}
            if (saConfiguration.common.subnetReference === "none") {
                netRule = {
                    networkRuleSet: {                    
                        virtualNetworkRules: []
                    }
                }
            } else {
                netRule = {
                    networkRuleSet: {                    
                        virtualNetworkRules: [{
                            virtualNetworkResourceId: saStack.network[saConfiguration.common.subnetReference].subnet.parameters.id
                        }]
                    }
                }
            }            
            
            if (saConfiguration.common.hasOwnProperty("config")) {
                saConfiguration.common.config = _.defaultsDeep(netRule, saConfiguration.common.config)
            } else {
                saConfiguration.common.config = netRule;
            }            
            
        } else {
            // setting default netRule to zone4
            let netRule = {
                networkRuleSet: {                    
                    virtualNetworkRules: [{
                        virtualNetworkResourceId: saStack.network.zone4.subnet.parameters.id
                    }]
                }
            }
            if (saConfiguration.common.hasOwnProperty("config")) {
                saConfiguration.common.config = _.defaultsDeep(netRule, saConfiguration.common.config)
            } else {
                saConfiguration.common.config = netRule;
            }            
        }
        // merging config
        if (saConfiguration.common.hasOwnProperty("config")) {            
            saStack.storage.baseConfig = _.defaultsDeep(saConfiguration.common.config, saDefaults)
        }
        
    } else { // if no generic configuration found
        saStack.storage.baseConfig = saDefaults;
    }
    if (!saConfiguration.hasOwnProperty("accounts")) { // if no account configuration found, set it to baseConfig
        saConfiguration.accounts = {
            storage01: {
                config: saStack.storage.baseConfig
            }
        }
    }

    /***
     * Blob Container defaults
     */


    for (const account in saConfiguration.accounts) {
        /***
         * Handle account-specific config
         */

        // applying networkRuleSet
        
        if (saConfiguration.accounts[account].hasOwnProperty("subnetReference")) {
            
            let netRule = {
                networkRuleSet: {                    
                    virtualNetworkRules: [{
                        virtualNetworkResourceId: saStack.network[saConfiguration.accounts[account].subnetReference].subnet.parameters.id
                    }]
                }
            }
            if (saConfiguration.accounts[account].subnetReference === "none") {
                netRule = {
                    networkRuleSet: {                    
                        virtualNetworkRules: []
                    }
                }
            }
            
            if (saConfiguration.accounts[account].hasOwnProperty("config")) {
                
                saConfiguration.accounts[account].config = _.defaultsDeep(netRule, saConfiguration.accounts[account].config)
            } else {
                
                saConfiguration.accounts[account].config = netRule
            }
        } else if (!saConfiguration.common?.hasOwnProperty("subnetReference")) {
            // default will be set to zone4 if nothing is set from common
            
            saConfiguration.accounts[account].config = _.defaultsDeep({
                networkRuleSet: {                    
                    virtualNetworkRules: [{
                        virtualNetworkResourceId: saStack.network.zone4.subnet.parameters.id
                    }]
                }
            }, saConfiguration.accounts[account].config);
        }
        

        /***
         * I'm so sorry you had to read all of that above code. 
         * Fix it and save some other souls :(
         */

         // applying specific config on top of resolved default
        saConfiguration.accounts[account].config = _.defaultsDeep(saConfiguration.accounts[account].config, saStack.storage.baseConfig)

        /***
         * Create the accounts
         * 
         */
        saConfiguration.accounts[account].config.accountName = `${saStack.netDefs.nodeName}${account}`;
        
        
        const sa = new azure.storage.StorageAccount(saConfiguration.accounts[account].config.accountName, saConfiguration.accounts[account].config)

        saStack.storage.accounts[saConfiguration.accounts[account].config.accountName] = {
            resource: sa,
            parameters: {
                name: sa.name.apply(name => name),
                id: sa.id.apply(id => id)
            }
        }

        /***
         * Now we can do fileshares and blobs and whatever
         */

        if (saConfiguration.accounts[account].hasOwnProperty("blobContainers")) {
            
            if (saStack.storage.accounts[saConfiguration.accounts[account].config.accountName].hasOwnProperty("blobcontainer")) {

            } else {
                saStack.storage.accounts[saConfiguration.accounts[account].config.accountName].blobcontainer = {}
            }
            /***
             * Set some defaults 
             */
            
            const blobContainerDefaults = {
                accountName: sa.name,
                resourceGroupName: saStack.parameters.name,
                publicAccess: "None",
                //containerName: ""
            }
            
            for (const container in saConfiguration.accounts[account].blobContainers) {
            //    const randomContainerName = new random.RandomPet("containerName")
                const containerName = saConfiguration.accounts[account].blobContainers[container].name // making this obligatory to save PITA.
            
                /***
                 * Create ye blob containers here
                 */

                //let config = blobContainerDefaults;
                if (saConfiguration.accounts[account].blobContainers[container].hasOwnProperty("config")) {
                    // good stuff, lets merge
                    saConfiguration.accounts[account].blobContainers[container].config.containerName = containerName
                } else {
                    saConfiguration.accounts[account].blobContainers[container].config = {containerName: containerName}
                }

                let blobConfig = _.defaultsDeep(saConfiguration.accounts[account].blobContainers[container].config, blobContainerDefaults)
                
                const blobContainer = new azure.storage.BlobContainer(containerName, blobConfig);

                saStack.storage.accounts[saConfiguration.accounts[account].config.accountName].blobcontainer[containerName] = {
                    resource: blobContainer,
                    paramters: {
                        name: blobContainer.name.apply(name => name),
                        id: blobContainer.id.apply(id => id)                        
                    }
                }
            }
        }
    }
    return saStack;
}