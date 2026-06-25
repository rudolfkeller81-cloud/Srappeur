'use strict';

const axios = require('axios');
const logger = require('../utils/logger');
const sleep = require('../utils/sleep');

const BASE_URL = 'https://places.googleapis.com/v1/places:searchText';

// Champs à récupérer via la nouvelle API Places (New)
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.businessStatus',
].join(',');

// ─── Recherche textuelle avec la nouvelle API Places (New) ───
async function textSearch(query, apiKey, pageToken = null) {
  const body = {
    textQuery: query,
    languageCode: 'fr',
    regionCode: 'fr',
    maxResultCount: 20,
  };

  if (pageToken) {
    body.pageToken = pageToken;
  }

  const response = await axios.post(BASE_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
  });

  return {
    results: response.data.places || [],
    nextPageToken: response.data.nextPageToken || null,
  };
}

// ─── Extrait le code département depuis une adresse française ───
function extractDepartement(address) {
  if (!address) return '';
  const match = address.match(/\b(\d{5})\b/);
  if (match) return match[1].substring(0, 2);
  return '';
}

// ─── Extrait la ville depuis une adresse française ───
function extractCity(address) {
  if (!address) return '';
  const match = address.match(/\d{5}\s+([^,]+)/);
  if (match) return match[1].trim();
  return '';
}

// ─── Fonction principale : scrape Google Places ───
async function scrapeGooglePlaces({ category, location, maxResults }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const delay = parseInt(process.env.REQUEST_DELAY_MS || '200');

  if (!apiKey || apiKey === 'votre_cle_api_google_ici') {
    throw new Error(
      'Clé API Google manquante.\n' +
      '  1. Copiez .env.example en .env\n' +
      '  2. Ajoutez votre clé GOOGLE_PLACES_API_KEY dans .env'
    );
  }

  const query = `${category} ${location} France`;
  logger.info(`Requête Google Places : "${query}"`);

  const allPlaces = [];
  let pageToken = null;
  let page = 1;

  // La nouvelle API permet aussi max 3 pages de 20 résultats = 60 max
  while (allPlaces.length < maxResults && page <= 3) {
    logger.dim(`  Page ${page} en cours...`);

    if (pageToken) await sleep(2000);

    try {
      const { results, nextPageToken } = await textSearch(query, apiKey, pageToken);

      if (results.length === 0) break;

      allPlaces.push(...results);
      pageToken = nextPageToken;
      page++;

      if (!nextPageToken) break;
    } catch (error) {
      if (error.response) {
        const msg = error.response.data?.error?.message || JSON.stringify(error.response.data);
        throw new Error(`Erreur API Google : ${msg}`);
      }
      throw error;
    }

    await sleep(delay);
  }

  const placesToProcess = allPlaces.slice(0, maxResults);
  logger.info(`${placesToProcess.length} établissements trouvés, formatage en cours...`);
  console.log('');

  const companies = [];

  for (let i = 0; i < placesToProcess.length; i++) {
    const place = placesToProcess[i];
    const name = place.displayName?.text || '';
    logger.progress(i + 1, placesToProcess.length, name);

    const address = place.formattedAddress || '';
    const city = extractCity(address);
    const departement = extractDepartement(address);

    // Ignore les entreprises fermées définitivement selon Google
    if (place.businessStatus === 'CLOSED_PERMANENTLY') {
      logger.dim(`  [ignoré] Fermée définitivement : ${name}`);
      continue;
    }

    companies.push({
      // ─── Données collectées automatiquement ───
      nom: name,
      categorie: category,
      adresse: address,
      ville: city,
      departement,
      telephone: place.internationalPhoneNumber || '',
      site_web: place.websiteUri || '',
      email: '',
      note_google: place.rating !== undefined ? place.rating.toString() : '',
      nombre_avis: place.userRatingCount !== undefined ? place.userRatingCount.toString() : '',
      place_id: place.id || '',
      statut: place.businessStatus === 'CLOSED_TEMPORARILY' ? 'fermée temporairement' : 'active',

      // ─── Colonnes vides pour l'étude de marché ───
      appele: '',
      a_repondu: '',
      recoit_beaucoup_appels_commerciaux: '',
      accepte_ecouter_commerciaux: '',
      a_achete_apres_appel_froid: '',
      canal_prefere: '',
      commentaires: '',
    });
  }

  console.log('');

  // Déduplique par numéro de téléphone (garde le premier trouvé)
  const seen = new Set();
  const deduplicated = companies.filter((c) => {
    if (!c.telephone) return true;
    if (seen.has(c.telephone)) {
      logger.dim(`  [doublon ignoré] ${c.nom} (${c.telephone})`);
      return false;
    }
    seen.add(c.telephone);
    return true;
  });

  if (deduplicated.length < companies.length) {
    logger.warn(`${companies.length - deduplicated.length} doublon(s) supprimé(s).`);
  }

  return deduplicated;
}

module.exports = { scrapeGooglePlaces };
