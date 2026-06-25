'use strict';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { companies, filename } = JSON.parse(event.body);

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

  const csv = '﻿' + rows.join('\r\n');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename || 'prospects.csv'}"`,
    },
    body: csv,
  };
};
