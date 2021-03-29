export const netRules : {[index: string]: any} = {
    Deny_any_any: {
      access: "Deny",
      destinationAddressPrefix: "*",
      destinationPortRange: "*",
      direction: "Inbound",
      priority: 4000,
      protocol: "*",
      sourceAddressPrefix: "*",
      sourcePortRange: "*"
    },
    Permit_AzureLoadBalancer_in: {
      access: "Allow",
      destinationAddressPrefix: "*",
      destinationPortRange: "*",
      direction: "Inbound",
      priority: 210,
      protocol: "*",
      sourceAddressPrefix: "AzureLoadBalancer",
      sourcePortRange: "*"
    },
    Permit_Internet_in: {
      access: "Allow",
      destinationAddressPrefix: "*",
      destinationPortRanges: [
        "80",
        "443"
      ],
      direction: "Inbound",
      priority: 500,
      protocol: "TCP",
      sourceAddressPrefix: "*",
      sourcePortRange: "*"
    },
    Permit_VirtualNetwork_in: {
      access: "Allow",
      destinationAddressPrefix: "VirtualNetwork",
      destinationPortRange: "*",
      direction: "Inbound",
      priority: 220,
      protocol: "*",
      sourceAddressPrefix: "VirtualNetwork",
      sourcePortRange: "*"
    },
    Permit_backend_health_comm_in: {
      access: "Allow",
      destinationAddressPrefix: "*",
      destinationPortRange: "65200-65534",
      direction: "Inbound",
      priority: 200,
      protocol: "*",
      sourceAddressPrefix: "*",
      sourcePortRange: "*"
    }
  }