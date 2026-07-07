sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, Fragment, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("psamonitoringui.controller.psa-monitoring-view", {

        SERVICE_PATH: "/monitoring-service",

        ENTITY_SETS: {
            AVAILABLE_BOX_CHECK: "AvailableBoxCheck"
        },

        onInit: function () {
            this._initializeSummaryModel();
            this._loadSummaryData();
        },

        /* =========================================================== */
        /* Initialization                                              */
        /* =========================================================== */

        _initializeSummaryModel: function () {
            const oSummaryModel = new JSONModel({
                availableBoxCheck: {
                    count: "0",
                    valueColor: "Neutral",
                    tileState: "Loading"
                }
            });

            this.getView().setModel(oSummaryModel, "summary");
        },

        _loadSummaryData: function () {
            this._loadAvailableBoxCheckDiscrepancyCount();
        },

        /* =========================================================== */
        /* Summary Requests                                            */
        /* =========================================================== */

        _loadAvailableBoxCheckDiscrepancyCount: async function () {
            const oSummaryModel = this.getView().getModel("summary");

            try {
                oSummaryModel.setProperty("/availableBoxCheck/tileState", "Loading");

                const iCount = await this._getAvailableBoxCheckDiscrepancyCount();

                oSummaryModel.setProperty("/availableBoxCheck/count", String(iCount));
                oSummaryModel.setProperty(
                    "/availableBoxCheck/valueColor",
                    iCount > 0 ? "Error" : "Good"
                );
                oSummaryModel.setProperty("/availableBoxCheck/tileState", "Loaded");

            } catch (oError) {
                console.error("Failed to load Available Box Check discrepancy count:", oError);

                oSummaryModel.setProperty("/availableBoxCheck/count", "0");
                oSummaryModel.setProperty("/availableBoxCheck/valueColor", "Neutral");
                oSummaryModel.setProperty("/availableBoxCheck/tileState", "Failed");

                MessageToast.show("Unable to load Available Box Check count.");
            }
        },

        _getAvailableBoxCheckDiscrepancyCount: async function () {
            const sFilter = encodeURIComponent("Matched eq false");

            const sUrl =
                `${this.SERVICE_PATH}/${this.ENTITY_SETS.AVAILABLE_BOX_CHECK}` +
                `?$filter=${sFilter}&count=true`;

            const oResponse = await fetch(sUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!oResponse.ok) {
                const sErrorText = await oResponse.text();
                throw new Error(sErrorText);
            }

            const oData = await oResponse.json();

            return this._extractCountFromResponse(oData);
        },

        _extractCountFromResponse: function (oData) {
            if (!oData) {
                return 0;
            }

            if (typeof oData === "number") {
                return oData;
            }

            if (oData.count !== undefined) {
                return Number(oData.count);
            }

            if (oData.Count !== undefined) {
                return Number(oData.Count);
            }

            if (oData["@odata.count"] !== undefined) {
                return Number(oData["@odata.count"]);
            }

            if (Array.isArray(oData.value)) {
                if (
                    oData.value.length === 1 &&
                    oData.value[0].count !== undefined
                ) {
                    return Number(oData.value[0].count);
                }

                if (
                    oData.value.length === 1 &&
                    oData.value[0].Count !== undefined
                ) {
                    return Number(oData.value[0].Count);
                }

                return oData.value.length;
            }

            return 0;
        },

        /* =========================================================== */
        /* Tile Navigation                                             */
        /* =========================================================== */

        onAvailableBoxesTilePress: function () {
            const oIconTabBar = this.byId("iconTabBar");

            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("availableBoxCheck");
            }
        },

        /* =========================================================== */
        /* Existing Page Helpers                                       */
        /* =========================================================== */

        getPage: function () {
            return this.byId("dynamicPageId");
        },

        onToggleFooter: function () {
            const oPage = this.getPage();

            oPage.setShowFooter(!oPage.getShowFooter());
        },

        onGenericTagPress: function (oEvent) {
            const oView = this.getView();
            const oSourceControl = oEvent.getSource();

            if (!this._pPopover) {
                this._pPopover = Fragment.load({
                    id: oView.getId(),
                    name: "psamonitoringui.view.Card"
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pPopover.then(function (oPopover) {
                oPopover.openBy(oSourceControl);
            });
        }

    });
});