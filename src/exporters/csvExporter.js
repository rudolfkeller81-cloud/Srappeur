'use strict';

const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Définition de toutes les colonnes du CSV avec leur en-tête français
const CSV_HEADERS = [
  // ─── Données collectées ───
  { id: 'nom',           title: 'Nom' },
  { id: 'categorie',     title: 'Catégorie' },
  { id: 'ville',         title: 'Ville' },
  { id: 'departement',   title: 'Département' },
  { id: 'adresse',       title: 'Adresse complète' },
  { id: 'telephone',     title: 'Téléphone' },
  { id: 'site_web',      title: 'Site Web' },
  { id: 'email',         title: 'Email' },
  { id: 'note_google',   title: 'Note Google' },
  { id: 'nombre_avis',   title: "Nombre d'avis" },
  { id: 'statut',        title: 'Statut Google' },
  { id: 'statut_sirene', title: 'Statut SIRENE (INSEE)' },
  { id: 'place_id',      title: 'Google Place ID' },

  // ─── Colonnes d'étude de marché (à remplir manuellement après appels) ───
  { id: 'appele',                             title: 'Appelé ? (oui/non)' },
  { id: 'a_repondu',                          title: 'A répondu ? (oui/non)' },
  { id: 'recoit_beaucoup_appels_commerciaux', title: 'Reçoit beaucoup d\'appels commerciaux ? (oui/non)' },
  { id: 'accepte_ecouter_commerciaux',        title: 'Accepte généralement d\'écouter les commerciaux ? (oui/non)' },
  { id: 'a_achete_apres_appel_froid',         title: 'A déjà acheté un service après un appel à froid ? (oui/non)' },
  { id: 'canal_prefere',                      title: 'Canal préféré (téléphone/email/aucun)' },
  { id: 'commentaires',                       title: 'Commentaires' },
];

async function exportToCSV(companies, filename) {
  const outputDir = process.env.OUTPUT_DIR || './output';

  // Crée le dossier output s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, filename);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: CSV_HEADERS,
    // UTF-8 avec BOM pour que Excel l'ouvre correctement avec les accents
    encoding: 'utf8',
    append: false,
  });

  await csvWriter.writeRecords(companies);

  logger.success(`CSV exporté : ${filePath}`);
  logger.dim(`  ${companies.length} lignes | ${CSV_HEADERS.length} colonnes`);

  return filePath;
}

module.exports = { exportToCSV };
