const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const SIMILARITY_CASE_LIMIT = 10;  // minimum number of similar cases to retrieve for prompt injection

module.exports = Object.freeze({
    GROQ_URL,
    GROQ_MODEL,
    SIMILARITY_CASE_LIMIT
});
