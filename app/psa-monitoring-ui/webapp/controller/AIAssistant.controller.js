sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "psamonitoringui/helper/TileConfig"
], function (Controller, MessageToast, TileConfig) {
    "use strict";

    return Controller.extend("psamonitoringui.controller.AIAssistant", {

        onInit: function () {
            const oAIModel = this.getOwnerComponent().getModel("ai");
            this.getView().setModel(oAIModel, "ai");
            oAIModel.refresh(true);
        },

        onBack: function () {
            this.getOwnerComponent()
                .getRootControl()
                .getController()
                .navigateBack();
        },

        onRefresh: async function () {
            const oAIModel = this.getOwnerComponent().getModel("ai");
            const sTileKey = oAIModel.getProperty("/lastTileKey");
            const oConfig  = TileConfig[sTileKey];

            if (!oConfig) {
                MessageToast.show("Nothing to refresh.");
                return;
            }

            const sPromptKey = oConfig.promptKey;
            if (!sPromptKey) {
                MessageToast.show(`No prompt configured for "${oConfig.title}".`);
                return;
            }

            oAIModel.setProperty("/busy", true);
            oAIModel.setProperty("/response", "");

            try {
                const aRows = await this._fetchDiscrepancyRows(oConfig.entitySet);

                if (!aRows.length) {
                    this._updateResponse(
                        "<p><em>No discrepancies found for this checkpoint. ✅</em></p>"
                    );
                    return;
                }

                const sAiRaw = await this._callAnalyzeDiscrepancy(
                    sPromptKey,
                    JSON.stringify(aRows, null, 2)
                );

                this._updateResponse(this._markdownToHtml(sAiRaw));
                MessageToast.show("Analysis refreshed");

            } catch (oErr) {
                console.error("Refresh failed:", oErr);
                this._updateResponse(
                    `<p style="color:red;">AI analysis failed: ${oErr.message}</p>`
                );
            }
        },

        /* =========================================================== */
        /* Helpers                                                     */
        /* =========================================================== */

        _updateResponse: function (sHtml) {
            const oAIModel = this.getOwnerComponent().getModel("ai");
            oAIModel.setProperty("/response", sHtml);
            oAIModel.setProperty("/busy", false);
        },

        _fetchDiscrepancyRows: async function (sEntitySet) {
            const sUrl =
                `/monitoring-service/${sEntitySet}` +
                `?$filter=${encodeURIComponent("Matched eq false")}` +
                `&$top=50`;

            const oRes = await fetch(sUrl, {
                method: "GET",
                headers: { Accept: "application/json" }
            });

            if (!oRes.ok) throw new Error(await oRes.text());

            const oData = await oRes.json();
            const aRows = Array.isArray(oData.value) ? oData.value : [];

            return aRows.map(row => {
                const clean = {};
                for (const k in row) {
                    if (!k.startsWith("@") && !k.startsWith("__")) {
                        clean[k] = row[k];
                    }
                }
                return clean;
            });
        },

        _callAnalyzeDiscrepancy: async function (sTitle, sDiscrepancyData) {
            const sUrl = "/odata/v4/ai/analyzeDiscrepancy";

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
            return oData.value ?? oData ?? "";
        },

        _markdownToHtml: function (sText) {
            if (!sText) return "<p><em>No response.</em></p>";

            let s = String(sText)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            s = s.replace(/^### (.*)$/gm, "<h4>$1</h4>");
            s = s.replace(/^## (.*)$/gm,  "<h3>$1</h3>");
            s = s.replace(/^# (.*)$/gm,   "<h2>$1</h2>");
            s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
            s = s.replace(/\*(.+?)\*/g,     "<em>$1</em>");
            s = s.replace(/`([^`]+)`/g,     "<code>$1</code>");
            s = s.replace(/(^|\n)- (.+)/g, (_, p, t) => `${p}<li>${t}</li>`);
            s = s.replace(/(<li>.*<\/li>)/gs, m => `<ul>${m}</ul>`);
            s = s.replace(/\n{2,}/g, "</p><p>");
            s = s.replace(/\n/g, "<br/>");

            return `<p>${s}</p>`;
        }

    });
});