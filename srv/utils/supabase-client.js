const axios = require('axios');

const SUPABASE_CLIENTS = {
  PSA: {
    baseUrl: process.env.PSA_ODS_PUBLIC_SUPABASE_URL,
    key: process.env.PSA_ODS_PUBLIC_SUPABASE_ANON_KEY,
    label: 'PSA'
  },
  DIS: {
    baseUrl: process.env.DIS_CCC_PUBLIC_SUPABASE_URL,
    key: process.env.DIS_CCC_PUBLIC_SUPABASE_ANON_KEY,
    label: 'DIS'
  }
};

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return null;
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function validateClient(client) {
  if (!client.baseUrl || !client.key) {
    throw new Error(`Missing ${client.label} Supabase environment variables.`);
  }
}

function getHeaders(client) {
  return {
    apikey: client.key,
    Authorization: `Bearer ${client.key}`,
    'Content-Type': 'application/json'
  };
}

function buildUrl(client, tableName, queryParams = {}) {
  const baseUrl = normalizeBaseUrl(client.baseUrl);
  const params = new URLSearchParams(queryParams);

  return `${baseUrl}${tableName}?${params.toString()}`;
}

async function fetchSupabase(clientName, tableName, queryParams = {}) {
  const client = SUPABASE_CLIENTS[clientName];

  if (!client) {
    throw new Error(`Invalid Supabase client: ${clientName}`);
  }

  validateClient(client);

  const url = buildUrl(client, tableName, queryParams);

  try {
    const response = await axios.get(url, {
      headers: getHeaders(client)
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      const responseText =
        typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);

      throw new Error(
        `${tableName} HTTP Error: ${error.response.status}. ${responseText}`
      );
    }

    throw error;
  }
}

module.exports = {
  fetchSupabase
};