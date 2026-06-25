'use strict';

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');
const logger = require('../utils/logger');

const TOKEN_PATH = path.resolve('./tokens.json');

const HEADERS = [
  'Nom', 'Catégorie', 'Ville', 'Département', 'Adresse complète',
  'Téléphone', 'Site Web', 'Email', 'Note Google', "Nombre d'avis", 'Google Place ID',
  'Appelé ? (oui/non)', 'A répondu ? (oui/non)',
  "Reçoit beaucoup d'appels commerciaux ? (oui/non)",
  "Accepte généralement d'écouter les commerciaux ? (oui/non)",
  'A déjà acheté un service après un appel à froid ? (oui/non)',
  'Canal préféré (téléphone/email/aucun)', 'Commentaires',
];

const FIELDS = [
  'nom', 'categorie', 'ville', 'departement', 'adresse',
  'telephone', 'site_web', 'email', 'note_google', 'nombre_avis', 'place_id',
  'appele', 'a_repondu', 'recoit_beaucoup_appels_commerciaux',
  'accepte_ecouter_commerciaux', 'a_achete_apres_appel_froid',
  'canal_prefere', 'commentaires',
];

// ─── Ouvre le navigateur pour autoriser l'accès ───
function openBrowser(authUrl) {
  const { execSync } = require('child_process');
  try {
    execSync(`start "" "${authUrl}"`, { stdio: 'ignore' });
  } catch {
    console.log(`\nOuvrez ce lien dans votre navigateur :\n${authUrl}\n`);
  }
}

// ─── Attend le code OAuth via un serveur local temporaire ───
function waitForOAuthCode(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
      const code = qs.get('code');
      const error = qs.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (error) {
        res.end('<h2>Autorisation refusée. Fermez cet onglet et relancez.</h2>');
        server.close();
        reject(new Error('Autorisation refusée par l\'utilisateur.'));
        return;
      }
      res.end('<h2>✅ Autorisation réussie ! Vous pouvez fermer cet onglet.</h2>');
      server.close();
      resolve(code);
    });

    server.listen(3000, () => {
      logger.info('En attente de votre autorisation dans le navigateur...');
    });

    server.on('error', reject);
  });
}

// ─── Récupère ou crée les tokens OAuth2 ───
async function getAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Variables GOOGLE_OAUTH_CLIENT_ID et GOOGLE_OAUTH_CLIENT_SECRET manquantes dans .env\n' +
      '  Suivez les instructions : créez un "ID client OAuth 2.0" de type "Application de bureau"\n' +
      '  sur console.cloud.google.com → APIs et services → Identifiants'
    );
  }

  const oAuth2Client = new OAuth2Client(clientId, clientSecret, 'http://localhost:3000');

  // Si un token existe déjà, on le réutilise
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // Sinon, on lance le flux d'autorisation
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });

  logger.info('Première utilisation : autorisation Google requise.');
  logger.info('Votre navigateur va s\'ouvrir...');
  openBrowser(authUrl);

  const code = await waitForOAuthCode(oAuth2Client);
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Sauvegarde le token pour les prochaines fois
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  logger.success('Autorisation enregistrée — vous n\'aurez plus à le faire.');

  return oAuth2Client;
}

// ─── Fonction principale : exporte vers Google Sheets ───
async function exportToSheets(companies, sheetTitle) {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  logger.info('Création du Google Sheet...');

  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: sheetTitle },
      sheets: [{ properties: { title: 'Prospects' } }],
    },
  });

  const spreadsheetId = createResponse.data.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  const rows = [
    HEADERS,
    ...companies.map((c) => FIELDS.map((f) => c[f] || '')),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Prospects!A1',
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });

  // Mise en forme : en-tête en gras fond bleu + colonne figée
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.27, green: 0.51, blue: 0.71 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          autoResizeDimensions: {
            dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: HEADERS.length },
          },
        },
      ],
    },
  });

  logger.success(`Google Sheet créé : ${spreadsheetUrl}`);
  return spreadsheetUrl;
}

module.exports = { exportToSheets };
