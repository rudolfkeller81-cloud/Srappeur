#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { program } = require('commander');
const { scrapeGooglePlaces } = require('./src/scrapers/googlePlaces');
const { exportToCSV } = require('./src/exporters/csvExporter');
const { exportToSheets } = require('./src/exporters/sheetsExporter');
const { verifySirene } = require('./src/utils/sireneChecker');
const logger = require('./src/utils/logger');

program
  .name('srappeur')
  .description('Outil de collecte de prospects B2B français pour étude de marché téléphonique')
  .version('1.0.0');

program
  .command('search')
  .description('Recherche des entreprises et exporte les résultats en CSV')
  .requiredOption(
    '-c, --category <category>',
    'Catégorie d\'entreprise (ex: "plombier", "électricien", "couvreur")'
  )
  .requiredOption(
    '-l, --location <location>',
    'Ville ou département (ex: "Lyon", "Paris 15", "Bordeaux", "69")'
  )
  .option(
    '-m, --max <number>',
    'Nombre maximum de résultats (max réel: 60 via Google Places)',
    '50'
  )
  .option(
    '-o, --output <filename>',
    'Nom du fichier CSV de sortie (sans extension)'
  )
  .option(
    '-s, --sheets',
    'Exporte également dans un nouveau Google Sheet (nécessite un compte de service)'
  )
  .option(
    '--no-sirene',
    'Désactive la vérification SIRENE (plus rapide mais sans contrôle des entreprises fermées)'
  )
  .action(async (options) => {
    const maxResults = parseInt(options.max, 10);

    if (isNaN(maxResults) || maxResults < 1) {
      logger.error('--max doit être un nombre entier positif.');
      process.exit(1);
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const safeName = (str) => str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const outputFilename = options.output
      ? `${options.output}.csv`
      : `prospects_${safeName(options.category)}_${safeName(options.location)}_${date}.csv`;

    const sheetTitle = `Prospects - ${options.category} - ${options.location} - ${date}`;

    console.log('\n══════════════════════════════════════════════');
    console.log('  SRAPPEUR - Collecte de prospects B2B');
    console.log('══════════════════════════════════════════════\n');
    logger.info(`Catégorie  : ${options.category}`);
    logger.info(`Localité   : ${options.location}`);
    logger.info(`Max        : ${maxResults} résultats`);
    logger.info(`Sortie     : output/${outputFilename}`);
    if (options.sheets) logger.info('Google Sheets : activé');
    console.log('');

    try {
      const companies = await scrapeGooglePlaces({
        category: options.category,
        location: options.location,
        maxResults,
      });

      if (companies.length === 0) {
        logger.warn('Aucune entreprise trouvée. Essayez un autre terme ou une autre ville.');
        process.exit(0);
      }

      // Vérification SIRENE (activée par défaut, désactivable avec --no-sirene)
      let finalCompanies = companies;
      if (options.sirene !== false) {
        logger.info('Vérification SIRENE (INSEE) en cours...');
        finalCompanies = await verifySirene(companies);
        const fermees = finalCompanies.filter((c) => c.statut_sirene === 'fermée').length;
        if (fermees > 0) logger.warn(`${fermees} entreprise(s) signalée(s) comme fermée(s) par l'INSEE.`);
      } else {
        finalCompanies = companies.map((c) => ({ ...c, statut_sirene: 'non vérifié' }));
      }

      // Export CSV (toujours)
      await exportToCSV(finalCompanies, outputFilename);

      // Export Google Sheets (optionnel avec --sheets)
      let sheetUrl = null;
      if (options.sheets) {
        sheetUrl = await exportToSheets(finalCompanies, sheetTitle);
      }

      console.log('\n══════════════════════════════════════════════');
      logger.success(`Terminé ! ${companies.length} prospects exportés.`);
      if (sheetUrl) {
        console.log('');
        logger.success(`Google Sheet : ${sheetUrl}`);
      }
      console.log('');
      logger.dim('Prochaines étapes :');
      logger.dim('  1. Ouvrez le CSV ou le Google Sheet');
      logger.dim('  2. Sélectionnez manuellement les entreprises à contacter');
      logger.dim('  3. Appelez-les et remplissez les colonnes d\'étude');
      console.log('══════════════════════════════════════════════\n');

    } catch (error) {
      console.log('');
      logger.error(error.message);
      process.exit(1);
    }
  });

if (process.argv.length < 3) {
  program.help();
}

program.parse(process.argv);
