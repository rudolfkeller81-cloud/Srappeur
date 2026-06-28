'use strict';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const authCode = process.env.AUTH_CODE;
  if (!authCode) {
    return { statusCode: 500, body: JSON.stringify({ error: 'AUTH_CODE non configuré sur le serveur.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps invalide.' }) };
  }

  if (!body.code || body.code !== authCode) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Code incorrect.' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
