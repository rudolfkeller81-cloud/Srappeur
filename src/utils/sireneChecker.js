'use strict';

const axios = require('axios');
const sleep = require('./sleep');

const SIRENE_API = 'https://recherche-entreprises.api.gouv.fr/search';

// Vérifie le statut d'une entreprise via l'API SIRENE (INSEE)
// Retourne : 'active', 'fermée', ou 'introuvable'
async function checkSireneStatus(nom, departement) {
  try {
    const response = await axios.get(SIRENE_API, {
      params: {
        q: nom,
        departement: departement || undefined,
        per_page: 1,
        mtm_campaign: 'srappeur',
      },
      timeout: 5000,
    });

    const results = response.data?.results;
    if (!results || results.length === 0) return 'introuvable';

    const entreprise = results[0];
    const etat = entreprise.siege?.etat_administratif || entreprise.etat_administratif;

    if (etat === 'A') return 'active';
    if (etat === 'F') return 'fermée';
    return 'introuvable';

  } catch {
    // En cas d'erreur réseau ou timeout, on ne bloque pas
    return 'introuvable';
  }
}

// Vérifie toutes les entreprises d'une liste en parallèle (par batch de 5)
async function verifySirene(companies) {
  const BATCH_SIZE = 5;
  const results = [...companies];

  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (company, idx) => {
        const statut = await checkSireneStatus(company.nom, company.departement);
        results[i + idx].statut_sirene = statut;
      })
    );
    await sleep(300); // Respecte le rate limiting de l'API
  }

  return results;
}

module.exports = { verifySirene };
