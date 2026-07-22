const axios = require('axios');
const { GROQ_URL, GROQ_MODEL } = require('./constants');

/**
 * Calls Groq chat completion with a single user prompt.
 * @param {string} prompt - Fully-composed prompt string
 * @returns {Promise<string>} AI response content
 */
async function chat(prompt) {
    const response = await axios.post(
        GROQ_URL,
        {
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );
    return response.data.choices[0].message.content;
}

module.exports = { chat };