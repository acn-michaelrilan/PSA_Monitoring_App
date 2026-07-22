const cds   = require('@sap/cds');
const { loadPrompt } = require('./lib/prompt-loader');
const { findSimilar, formatSimilarCases } = require('./lib/similarity-search');
const { chat } = require('./lib/groq-client');

require('dotenv').config();

module.exports = cds.service.impl(async function () {
    const { CheckpointEmbedding } = cds.entities("psamonitoring.db");

    // --- insert embedding ---
    this.on('insertCheckpointEmbedding', async (req) => {
        const { title, resolution, discrepancy_data } = req.data;
        try {
            await cds.run(
                INSERT.into(CheckpointEmbedding).entries({
                    title, resolution, discrepancy_data
                })
            );
            return "Checkpoint embedding inserted successfully";
        } catch (err) {
            console.error('Insert failed:', err);
            req.error(500, err.message || 'Failed to insert checkpoint embedding');
        }
    });

    //  --- AI analyze discrepancy ---
    this.on('analyzeDiscrepancy', async (req) => {
        const { title, discrepancy_data } = req.data;

        if (!title || !discrepancy_data) {
            return req.error(400, "Both 'title' and 'discrepancy_data' are required.");
        }

        try {
            //  Similarity search — use discrepancy_data as the query text
            const similar       = await findSimilar(discrepancy_data);
            const similar_cases = formatSimilarCases(similar);

            //  Load prompt template for this checkpoint & fill placeholders
            const prompt = loadPrompt(title, {
                discrepancy_data,
                similar_cases
            });

            //  Call the AI
            const aiResponse = await chat(prompt);
            return aiResponse;

        } catch (err) {
            console.error('analyzeDiscrepancy failed:', err.response?.data || err.message);
            req.error(500, err.message || "Failed to analyze discrepancy");
        }
    });
});