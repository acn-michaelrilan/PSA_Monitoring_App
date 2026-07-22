sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "psamonitoringui/model/models"
], (UIComponent, JSONModel, models) => {
    "use strict";

    return UIComponent.extend("psamonitoringui.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {

            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // Device Model
            this.setModel(
                models.createDeviceModel(),
                "device"
            );

            // AI Model
            this.setModel(
                new JSONModel({
                    title: "",
                    checkpoint: "",
                    response: "",
                    busy: false,
                    lastTileKey: "",
                    lastPromptKey: ""
                }),
                "ai"
            );

            // enable routing
            this.getRouter().initialize();
        }
    });
});