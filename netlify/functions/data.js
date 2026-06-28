'use strict';

const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

// Vérifie le code d'accès (même mécanisme que search / export-csv)
function checkAuth(event) {
  const authCode = process.env.AUTH_CODE;
  if (!authCode) return true; // rétrocompat si non configuré
  const token = event.headers['x-auth-token'] || '';
  return token === authCode;
}

// Clé de stockage dérivée du code (on ne stocke jamais le code en clair)
function userKey(event) {
  const token = event.headers['x-auth-token'] || 'anon';
  return 'user_' + crypto.createHash('sha256').update(token).digest('hex').slice(0, 24);
}

const EMPTY = { history: [], study: {} };

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Non autorisé.' }) };
  }

  let store;
  try {
    store = getStore('srappeur');
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Stockage indisponible : ' + e.message }) };
  }

  const key = userKey(event);

  // ─── Lecture des données de l'utilisateur ───
  if (event.httpMethod === 'GET') {
    try {
      const data = await store.get(key, { type: 'json' });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || EMPTY),
      };
    } catch (e) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ─── Sauvegarde des données de l'utilisateur ───
  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Corps invalide.' }) };
    }

    const payload = {
      history: Array.isArray(body.history) ? body.history : [],
      study: body.study && typeof body.study === 'object' ? body.study : {},
    };

    try {
      await store.setJSON(key, payload);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
