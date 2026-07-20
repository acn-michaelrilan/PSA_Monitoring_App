sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "psamonitoringui/helper/TileConfig"
], function (Controller, Fragment, JSONModel, MessageToast, TileConfig) {
    "use strict";

    return Controller.extend("psamonitoringui.controller.psa-monitoring-view", {

        SERVICE_PATH: "/monitoring-service",

        TILE_CONFIG: TileConfig,

        onInit: function () {
            this._initializeSummaryModel();
            this._loadSummaryData();
        },

        /* =========================================================== */
        /* Initialization                                              */
        /* =========================================================== */

        _initializeSummaryModel: function () {

            const oSummaryData = {};

            Object.keys(this.TILE_CONFIG)
                .forEach(sKey => {

                    oSummaryData[sKey] = {
                        count: "0",
                        valueColor: "Neutral",
                        tileState: "Loading"
                    };

                });

            this.getView().setModel(
                new JSONModel(oSummaryData),
                "summary"
            );
        },

        _loadSummaryData: async function () {
            await Promise.all(
                Object.values(this.TILE_CONFIG)
                    .map(oTile =>
                        this._loadTileCount(
                            oTile.modelPath,
                            oTile.entitySet,
                            oTile.filter
                        )
                    )

            );

        },
        
        _navigateToTab: function (sKey) {

            const oIconTabBar =
                this.byId("iconTabBar");

            if (oIconTabBar) {
                oIconTabBar.setSelectedKey(sKey);
            }
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

        _getAppController: function () {

            return this.getOwnerComponent()
                .getRootControl()
                .getController();

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

        onAvailableBoxesTilePress() {
            this._navigateToTab(
                this.TILE_CONFIG.availableBoxCheck.tabKey
            );
        },

        onShippedBolTilePress() {
            this._navigateToTab(
                this.TILE_CONFIG.shippedBolCheck.tabKey
            );
        },

        onShippedConsigneeBolTilePress() {
            this._navigateToTab(
                this.TILE_CONFIG.shippedConsigneeBOLCheck.tabKey
            );
        },

        onPartNumberBolTilePress() {
            this._navigateToTab(
                this.TILE_CONFIG.partNumberBOLCheck.tabKey
            );
        },

        onMaterialInformationTilePress() {
            this._navigateToTab(
                this.TILE_CONFIG.materialInformationCheck.tabKey
            );
        },
        /* =========================================================== */
        /* Existing Page Helpers                                       */
        /* =========================================================== */

        onAIPress: function (oEvent) {

            const sTileKey =
                oEvent.getSource().data("tileKey");

            const oConfig =
                this.TILE_CONFIG[sTileKey];

            // Build a placeholder response (replace later with real AI call)
            const sResponse =
                `<p>This is a <strong>placeholder</strong> AI response for checkpoint ` +
                `<em>${sTileKey}</em>.</p>` +
                `<p>The actual AI-generated analysis will appear here once the ` +
                `backend integration is complete.</p>`;

            this._getAppController()
                .navigateToAI(
                    `AI Assistant for ${oConfig.title}`,
                    sTileKey,
                    sResponse   // third argument
                );
        },

        getPage: function () {
            return this.byId("dynamicPageId");
        },

        onToggleFooter: function () {
            const oPage = this.getPage();

            oPage.setShowFooter(!oPage.getShowFooter());
        },


    });
});