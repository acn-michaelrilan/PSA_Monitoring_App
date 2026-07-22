sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend(
        "psamonitoringui.controller.App",
        {

            navigateToAI: function (
                sTitle,
                sCheckpoint,
                sResponse,
                bBusy
            ) {

                const oAIModel =
                    this.getView()
                        .getModel("ai");
                oAIModel.setData({
                    title: sTitle,
                    checkpoint: sCheckpoint,
                    response: sResponse || "Loading AI analysis...",
                    busy: !!bBusy,
                    lastTileKey: sCheckpoint
                });

                const oApp = this.byId("app");

                const oAIView = this.byId("aiAssistantView");
                console.log("APP", oApp);
                console.log("AI VIEW", oAIView);

                oApp.to(oAIView);

            },
             /** Called by tab controller once the async AI call finishes */
            updateAIResponse: function (sResponse, bBusy) {
                const oAIModel = this.getView().getModel("ai");
                oAIModel.setProperty("/response", sResponse || "");
                oAIModel.setProperty("/busy", !!bBusy);
            },
            navigateBack: function () {

                this.byId("app")
                    .back();

            }

        }
    );
});