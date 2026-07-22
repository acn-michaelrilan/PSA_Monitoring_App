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
        AI_SERVICE_PATH: "/odata/v4/ai",

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
        _fetchDiscrepancyRows: async function (sEntitySet, sFilter) {
        const sUrl =
            `${this.SERVICE_PATH}/${sEntitySet}` +
            `?$filter=${encodeURIComponent(sFilter)}` +
            `&$top=50`;   // cap payload size for the LLM

        const oRes = await fetch(sUrl, {
            method: "GET",
            headers: { Accept: "application/json" }
        });

        if (!oRes.ok) throw new Error(await oRes.text());

        const oData = await oRes.json();
        return Array.isArray(oData.value) ? oData.value : [];
    },

        _callAnalyzeDiscrepancy: async function (sTitle, sDiscrepancyData) {
            const sUrl = `${this.AI_SERVICE_PATH}/analyzeDiscrepancy`;

            const oRes = await fetch(sUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    title: sTitle,
                    discrepancy_data: sDiscrepancyData
                })
            });

            if (!oRes.ok) {
                const sErr = await oRes.text();
                throw new Error(sErr || `HTTP ${oRes.status}`);
            }

            const oData = await oRes.json();
            // OData v4 unbound action returns { value: "..." } or the raw string
            return oData.value ?? oData ?? "";
        },

        /**
         * Minimal markdown → HTML for FormattedText.
         * Handles: **bold**, *italic*, `code`, ### headings, bullet lists, newlines.
         */
        _markdownToHtml: function (sText) {
            if (!sText) return "<p><em>No response.</em></p>";

            let s = String(sText);

            // Escape HTML first
            s = s.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            // Headings
            s = s.replace(/^### (.*)$/gm, "<h4>$1</h4>");
            s = s.replace(/^## (.*)$/gm,  "<h3>$1</h3>");
            s = s.replace(/^# (.*)$/gm,   "<h2>$1</h2>");

            // Bold / italic / inline code
            s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
            s = s.replace(/\*(.+?)\*/g,     "<em>$1</em>");
            s = s.replace(/`([^`]+)`/g,     "<code>$1</code>");

            // Bullet lists
            s = s.replace(/(^|\n)- (.+)/g,
                (_, p, t) => `${p}<li>${t}</li>`);
            s = s.replace(/(<li>.*<\/li>)/gs,
                m => `<ul>${m}</ul>`);

            // Paragraphs / line breaks
            s = s.replace(/\n{2,}/g, "</p><p>");
            s = s.replace(/\n/g, "<br/>");

            return `<p>${s}</p>`;
        },

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

        onAIPress: async function (oEvent) {

            const sTileKey =
                oEvent.getSource().data("tileKey");

            const oConfig =
                this.TILE_CONFIG[sTileKey];

            if (!oConfig) {
                MessageToast.show("Unknown checkpoint: " + sTileKey);
                return;
            }

            const oAppCtrl = this._getAppController();
            oAppCtrl.navigateToAI(
                `AI Assistant for ${oConfig.title}`,
                sTileKey,
                "",
                true
            );
             try {
                //  Pull the actual discrepancy rows for this checkpoint
                const aRows = await this._fetchDiscrepancyRows(
                    oConfig.entitySet,
                    oConfig.filter
                );

                if (!aRows.length) {
                    oAppCtrl.updateAIResponse(
                        "<p><em>No discrepancies found for this checkpoint. ✅</em></p>",
                        false
                    );
                    return;
                }

                //  Serialize to a compact JSON string for the LLM
                const sDiscrepancyData =
                    JSON.stringify(aRows, null, 2);

                //  Call analyzeDiscrepancy action
                const sAiRaw = await this._callAnalyzeDiscrepancy(
                    oConfig.promptKey,     // used to match prompt template
                    sDiscrepancyData
                );

                // 5. Convert simple markdown → HTML for FormattedText
                const sHtml = this._markdownToHtml(sAiRaw);

                oAppCtrl.updateAIResponse(sHtml, false);

            } catch (oErr) {
                console.error("AI analysis failed:", oErr);
                oAppCtrl.updateAIResponse(
                    `<p style="color:red;">AI analysis failed: ${oErr.message}</p>`,
                    false
                );
            }

            
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