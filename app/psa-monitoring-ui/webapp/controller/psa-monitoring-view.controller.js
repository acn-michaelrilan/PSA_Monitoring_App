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
            AVAILABLE_BOX_CHECK: "AvailableBoxCheck",
            SHIPPED_BOL_CHECK: "ShippedBolCheck",
            SHIPPED_CONSIGNEE_BOL_CHECK: "ShippedConsigneeBOLCheck",
            PART_NUMBER_BOL_CHECK: "PartNumberBOLCheck",
            MATERIAL_INFORMATION_CHECK: "MaterialInformationCheck"
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
                },
                shippedBolCheck: {
                    count: "0",
                    valueColor: "Neutral",
                    tileState: "Loading"
                },
                shippedConsigneeBOLCheck: {
                    count: "0",
                    valueColor: "Neutral",
                    tileState: "Loading"
                },
                partNumberBOLCheck: {
                    count: "0",
                    valueColor: "Neutral",
                    tileState: "Loading"
                },
                materialInformationCheck: {
                    count: "0",
                    valueColor: "Neutral",
                    tileState: "Loading"
                }
            });

            this.getView().setModel(oSummaryModel, "summary");
        },

        _loadSummaryData: function () {
            this._loadAvailableBoxCheckDiscrepancyCount();
            this._loadShippedBolCheckDiscrepancyCount();
            this._loadShippedConsigneeBOLCheckDiscrepancyCount();
            this._loadPartNumberBOLCheckDiscrepancyCount();
            this._loadMaterialInformationCheckDiscrepancyCount();
        },

        /* =========================================================== */
        /* Summary Request Helpers                                     */
        /* =========================================================== */
        _loadTileCount: async function (
            sModelPath,
            sEntitySet,
            sFilter
        ) {
            const oSummaryModel = this.getView().getModel("summary");

            try {
                oSummaryModel.setProperty(
                    `${sModelPath}/tileState`,
                    "Loading"
                );

                const iCount =
                    await this._getDiscrepancyCount(
                        sEntitySet,
                        sFilter
                    );

                oSummaryModel.setProperty(
                    `${sModelPath}/count`,
                    String(iCount)
                );

                oSummaryModel.setProperty(
                    `${sModelPath}/valueColor`,
                    iCount > 0 ? "Error" : "Good"
                );

                oSummaryModel.setProperty(
                    `${sModelPath}/tileState`,
                    "Loaded"
                );

            } catch (oError) {

                console.error(oError);

                oSummaryModel.setProperty(
                    `${sModelPath}/count`,
                    "0"
                );

                oSummaryModel.setProperty(
                    `${sModelPath}/valueColor`,
                    "Neutral"
                );

                oSummaryModel.setProperty(
                    `${sModelPath}/tileState`,
                    "Failed"
                );
            }
        },
        _getDiscrepancyCount: async function (
            sEntitySet,
            sFilter
        ) {
            const sUrl =
                `${this.SERVICE_PATH}/${sEntitySet}` +
                `?$filter=${encodeURIComponent(sFilter)}` +
                `&count=true`;

            const oResponse = await fetch(sUrl, {
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            });

            if (!oResponse.ok) {
                throw new Error(
                    await oResponse.text()
                );
            }

            const oData =
                await oResponse.json();

            return this._extractCountFromResponse(
                oData
            );
        },

        _loadAvailableBoxCheckDiscrepancyCount: function () {
            return this._loadTileCount(
                "/availableBoxCheck",
                this.ENTITY_SETS.AVAILABLE_BOX_CHECK,
                "Matched eq false"
            );
        },
        _loadShippedBolCheckDiscrepancyCount: function () {
            return this._loadTileCount(
                "/shippedBolCheck",
                this.ENTITY_SETS.SHIPPED_BOL_CHECK,
                "Matched eq false"
            );
        },

        _loadShippedConsigneeBOLCheckDiscrepancyCount: function () {
            return this._loadTileCount(
                "/shippedConsigneeBOLCheck",
                this.ENTITY_SETS.SHIPPED_CONSIGNEE_BOL_CHECK,
                "Matched eq false"
            );
        },
        _loadPartNumberBOLCheckDiscrepancyCount: function () {
            return this._loadTileCount(
                "/partNumberBOLCheck",
                this.ENTITY_SETS.PART_NUMBER_BOL_CHECK,
                "Matched eq false"
            );
        },

        _loadMaterialInformationCheckDiscrepancyCount: function () {
            return this._loadTileCount(
                "/materialInformationCheck",
                this.ENTITY_SETS.MATERIAL_INFORMATION_CHECK,
                "Matched eq false"
            );
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
        onShippedBolTilePress: function () {
            const oIconTabBar = this.byId("iconTabBar");

            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("shippedBol");
            }
        },
        onShippedConsigneeBolTilePress: function () {
            const oIconTabBar = this.byId("iconTabBar");

            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("shippedConsigneePerBol");
            }
        },
        onPartNumberBolTilePress: function () {
            const oIconTabBar = this.byId("iconTabBar");

            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("partNumberPerBolCheck");
            }
        },
        onMaterialInformationTilePress: function () {
            const oIconTabBar = this.byId("iconTabBar");

            if (oIconTabBar) {
                oIconTabBar.setSelectedKey("materialInformationCheck");
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


    });
});