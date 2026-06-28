'use strict';

const { scrapeGooglePlaces } = require('../../src/scrapers/googlePlaces');
const { verifySirene } = require('../../src/utils/sireneChecker');

function checkAuth(event) {
  const authCode = process.env.AUTH_CODE;
  if (!authCode) return true; // si pas configuré, on laisse passer (rétrocompat)
  const token = event.headers['x-auth-token'] || '';
  return token === authCode;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!checkAuth(event)) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Non autorisé. Veuillez vous connecter.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide.' }) };
  }

  const { category, location, max, sirene } = body;

  if (!category || !location) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Catégorie et localité obligatoires.' }) };
  }

  const maxResults = Math.min(parseInt(max) || 20, 60);

  try {
    let companies = await scrapeGooglePlaces({ category, location, maxResults });

    if (sirene) {
      companies = await verifySirene(companies);
    } else {
      companies = companies.map((c) => ({ ...c, statut_sirene: 'non vérifié' }));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companies, total: companies.length }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
