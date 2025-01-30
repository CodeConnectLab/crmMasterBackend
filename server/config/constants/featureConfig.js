const featurePermissions = {
    Dashboard: {
      name: "Dashboard",
      availablePermissions: ["view"]
    },
    Lead: {
      name: "Lead",
      availablePermissions: ["add", "edit", "delete", "view"]
    },
    "Add Leads": {
      name: "Add Leads",
      availablePermissions: ["add"]
    },
    "All Leads": {
      name: "All Leads",
      availablePermissions: ["view"]
    },
    "Follow Up Leads": {
      name: "Follow Up Leads",
      availablePermissions: ["view", "edit"]
    },
    "Imported Leads": {
      name: "Imported Leads",
      availablePermissions: ["view"]
    },
    "Outsourced Leads": {
      name: "Outsourced Leads",
      availablePermissions: ["view"]
    },
    "Call Manage": {
      name: "Call Manage",
      availablePermissions: ["view", "add"]
    },
    Calendar: {
      name: "Calendar",
      availablePermissions: ["view", "add", "edit"]
    },
    "SMS Panel": {
      name: "SMS Panel",
      availablePermissions: ["view", "add"]
    },
    "WhatsApp Panel": {
      name: "WhatsApp Panel",
      availablePermissions: ["view", "add"]
    },
    Contacts: {
      name: "Contacts",
      availablePermissions: ["view", "add", "edit", "delete"]
    },
    Reports: {
      name: "Reports",
      availablePermissions: ["view"]
    },
    Api: {
      name: "Api",
      availablePermissions: ["view"]
    },
    "Products & Services": {
      name: "Products & Services",
      availablePermissions: ["view"]
    },
    Setting: {
      name: "Setting",
      availablePermissions: ["view", "edit"]
    }
  };
  
  module.exports = { featurePermissions };