const fs = require('fs');
const path = require('path');
const promptRegistry = require('../prompts');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

/**
 * Loads a prompt template by checkpoint title and fills in placeholders.
 * @param {string} title - Checkpoint title (e.g., "Available Box Check")
 * @param {object} vars  - Key/value pairs to substitute {{key}} → value
 * @returns {string} Rendered prompt
 */
function loadPrompt(title, vars = {}) {
    const filename = promptRegistry[title];
    if (!filename) {
        throw new Error(`No prompt registered for checkpoint: "${title}"`);
    }

    const filePath = path.join(PROMPTS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Prompt file not found: ${filePath}`);
    }

    let template = fs.readFileSync(filePath, 'utf8');

    // Simple {{key}} substitution
    for (const [key, value] of Object.entries(vars)) {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        template = template.replace(placeholder, value ?? '');
    }

    return template;
}

module.exports = { loadPrompt };