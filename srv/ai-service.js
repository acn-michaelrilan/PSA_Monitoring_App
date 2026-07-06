const cds = require('@sap/cds');
const axios = require('axios');
require('dotenv').config();

module.exports = cds.service.impl(function () {

    this.on('askAI', async (req) => {

        const { prompt } = req.data;

        try {

            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
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

        } catch (err) {

            console.error(err.response?.data || err.message);

            req.error(500,
                err.response?.data?.error?.message ||
                "Groq API Error"
            );

        }

    });

});