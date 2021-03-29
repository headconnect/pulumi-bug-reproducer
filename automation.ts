const fs = require('fs');
const yaml = require('js-yaml');
import * as pulumiAutomation from "@pulumi/pulumi/x/automation";
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
console.log("importing function")
//import * as current from "./index"
import { createFunction } from "./index"
console.info("Starting pulumi")


console.info("Reading Pulumi.yaml")
const currentProject = yaml.load(fs.readFileSync("./Pulumi.yaml"))
console.log(currentProject)

const envState = "dev"
const stackSuffix = "debugger"


const applyConfig = async () => {
    
    

    const stack = await pulumiAutomation.LocalWorkspace.selectStack({
        projectName: "debug-infra",
        program: createFunction,
        stackName: `${envState}.infra.${stackSuffix}`
    },{
        workDir: ".",
        // turning this on will load the existing Pulumi.yaml into projectSettings and thereby avoid the issue of overwriting Pulumi.yaml
        //projectSettings: currentProject
        
    })
        
    console.log("getting stack info")
    console.log(await stack.info())
    console.log("getting stack config")
    console.log(await stack.getAllConfig())
    //await stack.refresh({onOutput: console.info})
    console.log("previewing stack")
    const stackPreview = await stack.preview()
    console.info(stackPreview.changeSummary)
    console.info(stackPreview.stdout)

    






}

//server.on("get", applyConfig().catch(err => console.log(err));)
applyConfig().catch(err => console.log(err));