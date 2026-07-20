sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend(
        "psamonitoringui.controller.AIAssistant",
        {

            onInit: function () {

                const oAIModel = this.getOwnerComponent().getModel("ai");

                this.getView().setModel(oAIModel, "ai");

                // Refresh bindings after model updates from App.controller
                oAIModel.refresh(true);
            },

            onBack: function () {

                const oAppController =
                    this.getOwnerComponent()
                        .getRootControl()
                        .getController();

                oAppController.navigateBack();

            }

        }
    );
});