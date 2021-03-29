import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

import { createNetworks } from "./components/azure/network";
import { createStorageAccounts } from "./components/azure/storageAccount";
import { createAppGW } from "./components/azure/appGateway";




/***
 * 
 * Structure:
 * Resources created are assumed to be an array of resources, and will be indexed in the various
 * rgStacks which then get fed into the created.
 */


export const createFunction = async () => {
    const config = new pulumi.Config("azure");
    const netDefs : any = config.requireObject("netDefs")
    const shouldCreate : any = config.requireObject("create")
        
    let created : any = {netDefs: netDefs, kubeConfigs: []};
    /***
     * Creating the resource group first
     * This should ideally overwrite the rgInfo object with the result
     * of an API call so that it's properly handled, but if not, then
     * we can just use the rgInfo from config
     * 
     */


    for (const group of netDefs) {
        // setting up resources structure for the RG
        
        
        const rg = new azure.resources.ResourceGroup(`${group.logicalName}_${group.location}`, {
            location: group.location,
            resourceGroupName: `${group.logicalName}_${group.location}`,
            tags: group.tags
        },{
            protect: false // prevents this resource from being deleted. unprotect with `pulumi state unprotect <resource URN>`
        })
        let rgStack : any = {
            netDefs: group,
            parameters: {
                name:  rg.name.apply(name => name),
                location: rg.location.apply(location => location), 
                id: rg.id.apply(id => id),
                resource: rg
            },
            resources: {}
        }

        /***
         * Next is the network. 
         * To save the souls of all involved, we're going to try to set this
         * up in a seperate module. Have mercy.
         */

        if (shouldCreate.network) {
            rgStack = await createNetworks(rgStack);
        }
        /***
         * Then on to storage accounts
         * Why did I have to make this even more complicated than the "#¤" network?!
         */        

        if (shouldCreate.storageAccount) {
            rgStack = await createStorageAccounts(rgStack);
        }

        if (shouldCreate.appgw) {
            rgStack = await createAppGW(rgStack);
        }

        // Add to the outputs only what's actually useful to share betwen stacks or groups within a stack.
        created.kubeConfigs.push(rgStack?.cluster?.kubeconfig)
    }

    

    

    return created
    
}

export const stackInfo = createFunction();

