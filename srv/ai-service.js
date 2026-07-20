// const cds = require('@sap/cds');
// const axios = require('axios');
// require('dotenv').config();

// module.exports = cds.service.impl(async function () {
//     const { CheckpointEmbedding } = cds.entities("psamonitoring.db");
//     this.on('askAI', async (req) => {

//         const { prompt } = req.data;

//         try {
//             const response = await axios.post(
//                 "https://api.groq.com/openai/v1/chat/completions",
//                 {
//                     model: "llama-3.3-70b-versatile",
//                     messages: [
//                         {
//                             role: "user",
//                             content: prompt
//                         }
//                     ],
//                     temperature: 0.7
//                 },
//                 {
//                     headers: {
//                         Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
//                         "Content-Type": "application/json"
//                     }
//                 }
//             );

//             return response.data.choices[0].message.content;

//         } catch (err) {

//             console.error(err.response?.data || err.message);

//             req.error(500,
//                 err.response?.data?.error?.message ||
//                 "Groq API Error"
//             );

//         }

//     });

//     this.on('insertCheckpointEmbedding', async (req) => {
//         const { title, resolution, discrepancy_data } = req.data;
//         try {
//             await cds.run(
//                 INSERT.into(CheckpointEmbedding).entries({
//                     title,
//                     resolution,
//                     discrepancy_data
//                 })
//             );
//             return "Checkpoint embedding inserted successfully";
//         } catch (err) {
//             console.error('Insert failed:', err);
//             req.error(500, err.message || 'Failed to insert checkpoint embedding');
//         }
//     });

// });

const cds   = require('@sap/cds');
require('dotenv').config();

const { loadPrompt }              = require('./lib/prompt-loader');
const { findSimilar, formatSimilarCases } = require('./lib/similarity-search');
const { chat }                    = require('./lib/groq-client');

module.exports = cds.service.impl(async function () {
    const { CheckpointEmbedding } = cds.entities("psamonitoring.db");

    // --- raw prompt For AI Testing ---
    this.on('askAI', async (req) => {
        const { prompt } = req.data;
        try {
            return await chat(prompt);
        } catch (err) {
            console.error(err.response?.data || err.message);
            req.error(500, err.response?.data?.error?.message || "Groq API Error");
        }
    });

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

    //  ---analyze discrepancy end-to-end ---
    this.on('analyzeDiscrepancy', async (req) => {
        const { title, discrepancy_data } = req.data;

        if (!title || !discrepancy_data) {
            return req.error(400, "Both 'title' and 'discrepancy_data' are required.");
        }

        try {
            //  Similarity search — use discrepancy_data as the query text
            const similar       = await findSimilar(discrepancy_data, 3);
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