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
                sResponse
            ) {

                const oAIModel =
                    this.getView()
                        .getModel("ai");

                oAIModel.setData({

                    title: sTitle,

                    checkpoint: sCheckpoint,

                    response:
                        sResponse ||
                        "Loading AI analysis..."

                });

                const oApp =
                    this.byId("app");

                const oAIView =
                    this.byId("aiAssistantView");

                console.log("APP", oApp);
                console.log("AI VIEW", oAIView);

                oApp.to(oAIView);

            },

            navigateBack: function () {

                this.byId("app")
                    .back();

            }

        }
    );
});