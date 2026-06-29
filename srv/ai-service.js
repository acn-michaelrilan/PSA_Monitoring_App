const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const db = await cds.connect.to('db');

    /**
     * Mock Embedding Generator
     * ------------------------------------
     * Replace this with an actual embedding API later.
     */
    async function generateEmbedding(text) {

        console.log("Generating embedding for:");
        console.log(text);

        // Mock vector (REAL_VECTOR(4))
        return "[0.21,0.45,-0.33,0.55]";
    }

    this.on("saveIncident", async (req) => {
        try {
            const {scenario,description,resolution} = req.data;
            // Build the knowledge text to embed
            const embeddingText = `
                Scenario:
                ${scenario}

                Description:
                ${description}

                Resolution:
                ${resolution}
                `;

            // Generate embedding
            const embedding = await generateEmbedding(embeddingText);

            // Generate UUID
            const id = cds.utils.uuid();

            // Insert into HANA table
            await db.run(`
                INSERT INTO AI_KNOWLEDGE
                (
                    ID,
                    SCENARIO,
                    DESCRIPTION,
                    RESOLUTION,
                    EMBEDDING
                )
                VALUES
                (?,?,?,?,TO_REAL_VECTOR(?))`,
                [
                    id,
                    scenario,
                    description,
                    resolution,
                    embedding
                ]);

            return {
                success: true,
                message: "Knowledge saved successfully.",
                id: id
            };

        } catch (err) {
            console.error(err);
            req.error(500, err.message);
        }

    });

});