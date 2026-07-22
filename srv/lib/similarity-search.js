const cds = require('@sap/cds');
const { SIMILARITY_CASE_LIMIT } = require('./constants');
const EMBEDDING_MODEL = 'SAP_NEB.20240715';

async function findSimilar(queryText) {
    const limit = SIMILARITY_CASE_LIMIT;

    if (!queryText) return [];
    const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || limit, 20));

    const { CheckpointEmbedding } = cds.entities('psamonitoring.db');

    const rows = await cds.run(
        SELECT.from(CheckpointEmbedding)
            .columns(
                'ID',
                'title',
                'discrepancy_data',
                'resolution',
                { func: 'COSINE_SIMILARITY', args: [
                    { ref: ['embedding'] },
                    { func: 'TO_REAL_VECTOR', args: [
                        { func: 'VECTOR_EMBEDDING', args: [
                            { val: queryText }, { val: 'QUERY' }, { val: EMBEDDING_MODEL }
                        ]}
                    ]}
                  ], as: 'cosine_similarity'
                },
                { func: 'L2DISTANCE', args: [
                    { ref: ['embedding'] },
                    { func: 'TO_REAL_VECTOR', args: [
                        { func: 'VECTOR_EMBEDDING', args: [
                            { val: queryText }, { val: 'QUERY' }, { val: EMBEDDING_MODEL }
                        ]}
                    ]}
                  ], as: 'l2distance'
                }
            )
            .where`embedding is not null`
            .orderBy({ ref: ['cosine_similarity'], sort: 'desc' })
            .limit(safeLimit)
    );

    return (rows || []).map(r => ({
        ID: r.ID,
        title: r.title ?? r.TITLE,
        discrepancy_data: r.discrepancy_data ?? r.DISCREPANCY_DATA,
        resolution: r.resolution ?? r.RESOLUTION,
        cosine_similarity: r.cosine_similarity ?? r.COSINE_SIMILARITY,
        l2distance: r.l2distance ?? r.L2DISTANCE
    }));
}
/**
 * Formats similarity results into a Markdown block for prompt injection.
 */
function formatSimilarCases(results) {
    if (!results || !results.length) return "_No similar past cases found._";

    return results.map((r, i) => (
        `### Case ${i + 1} (similarity: ${(r.cosine_similarity ?? 0).toFixed(3)})\n` +
        `- **Title:** ${r.title}\n` +
        `- **Past Discrepancy:** ${r.discrepancy_data}\n` +
        `- **Past Resolution:** ${r.resolution}`
    )).join('\n\n');
}
module.exports = { findSimilar, formatSimilarCases };