'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { scrapeGooglePlaces } = require('./src/scrapers/googlePlaces');
const { verifySirene } = require('./src/utils/sireneChecker');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Route de recherche ───
app.post('/api/search', async (req, res) => {
  const { category, location, max, sirene } = req.body;

  if (!category || !location) {
    return res.status(400).json({ error: 'Catégorie et localité sont obligatoires.' });
  }

  const maxResults = Math.min(parseInt(max) || 20, 60);

  try {
    let companies = await scrapeGooglePlaces({ category, location, maxResults });

    if (sirene) {
      companies = await verifySirene(companies);
    } else {
      companies = companies.map((c) => ({ ...c, statut_sirene: 'non vérifié' }));
    }

    res.json({ companies, total: companies.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Route export CSV ───
app.post('/api/export-csv', (req, res) => {
  const { companies, filename } = req.body;

  const headers = [
    'Nom', 'Catégorie', 'Ville', 'Département', 'Adresse complète',
    'Téléphone', 'Site Web', 'Email', 'Note Google', "Nombre d'avis",
    'Statut Google', 'Statut SIRENE',
    'Appelé ?', 'A répondu ?', 'Reçoit beaucoup appels ?',
    'Accepte écouter commerciaux ?', 'A acheté après appel froid ?',
    'Canal préféré', 'Commentaires',
  ];

  const fields = [
    'nom', 'categorie', 'ville', 'departement', 'adresse',
    'telephone', 'site_web', 'email', 'note_google', 'nombre_avis',
    'statut', 'statut_sirene',
    'appele', 'a_repondu', 'recoit_beaucoup_appels_commerciaux',
    'accepte_ecouter_commerciaux', 'a_achete_apres_appel_froid',
    'canal_prefere', 'commentaires',
  ];

  const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
  const rows = [
    headers.map(escape).join(','),
    ...companies.map((c) => fields.map((f) => escape(c[f] || '')).join(',')),
  ];

  const csv = '﻿' + rows.join('\r\n'); // BOM pour Excel
  const safeName = filename || `prospects_${Date.now()}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`\n✅ Srappeur lancé sur http://localhost:${PORT}\n`);
});
