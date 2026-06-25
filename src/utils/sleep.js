'use strict';

// Pause entre les requêtes pour respecter les limites de l'API Google
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = sleep;
