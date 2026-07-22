sap.ui.define([], function () {
    "use strict";

    return {
        availableBoxCheck: {
            title: "Available Boxes",
            promptKey: "Available Box Check",
            entitySet: "AvailableBoxCheck",
            filter: "Matched eq false",
            tabKey: "availableBoxCheck",
            modelPath: "/availableBoxCheck"
        },

        shippedBolCheck: {
            title: "Shipped BOL",
            promptKey: "Shipped BOL Check",
            entitySet: "ShippedBolCheck",
            filter: "Matched eq false",
            tabKey: "shippedBol",
            modelPath: "/shippedBolCheck"
        },

        shippedConsigneeBOLCheck: {
            title: "Shipped Consignee",
            promptKey: "Shipped Consignee per BOL Check",
            entitySet: "ShippedConsigneeBOLCheck",
            filter: "Matched eq false",
            tabKey: "shippedConsigneePerBol",
            modelPath: "/shippedConsigneeBOLCheck"
        },

        partNumberBOLCheck: {
            title: "Part Number",
            promptKey: "Part Number per BOL Check",
            entitySet: "PartNumberBOLCheck",
            filter: "Matched eq false",
            tabKey: "partNumberPerBolCheck",
            modelPath: "/partNumberBOLCheck"
        },

        materialInformationCheck: {
            title: "Material Information",
            promptKey: "Material Information Check",
            entitySet: "MaterialInformationCheck",
            filter: "Matched eq false",
            tabKey: "materialInformationCheck",
            modelPath: "/materialInformationCheck"
        }
    };
});