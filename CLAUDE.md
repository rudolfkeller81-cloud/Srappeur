# CLAUDE.md

Projet : outil Node.js de recherche de prospects B2B pour étude de marché sur la prospection téléphonique en France.

---

# Profil user

- Vibe coder : le user ne sait pas coder.
- Ne jamais demander au user de modifier du code manuellement.
- Faire soi-même toutes les modifications nécessaires.
- Ne jamais poser de questions techniques inutiles.
- Chercher les réponses dans le code ou les créer directement.

---

# Objectif du projet

Le projet sert à faire de la recherche de marché.

Le workflow doit rester :

1. Scraper des entreprises françaises.
2. Exporter les résultats dans un CSV.
3. Sélectionner manuellement les entreprises pertinentes.
4. Appeler manuellement les entreprises.
5. Analyser les réponses.

IMPORTANT :

- Aucun spam.
- Aucun emailing automatique.
- Aucun agent vocal.
- Aucun appel automatique.
- Aucune IA qui contacte les entreprises.
- Aucune automatisation de prospection.

Le projet sert uniquement à collecter des données pour une étude humaine.

---

# Stack

- Node.js
- JavaScript
- Architecture simple
- Code lisible
- Variables d'environnement pour les clés API
- README d'installation

Apify peut être utilisé si cela apporte un avantage, mais ce n'est pas obligatoire.

---

# Sources de données

Privilégier :

1. Google Maps
2. Apify
3. Pages Jaunes
4. Sources publiques pertinentes

---

# Données à récupérer

Pour chaque entreprise récupérer si possible :

- nom
- catégorie
- ville
- département
- téléphone
- site web
- email
- note Google
- nombre d'avis

---

# Colonnes du CSV

Ajouter également :

- appelé
- a répondu
- reçoit beaucoup d'appels commerciaux
- accepte d'écouter les commerciaux
- a déjà acheté après un appel à froid
- canal préféré
- commentaires

Ces colonnes serviront à remplir l'étude manuellement après les appels.

---

# Philosophie du projet

Le but n'est pas de vendre immédiatement.

Le but est de comprendre :

- combien d'appels commerciaux les entreprises reçoivent ;
- si elles répondent aux appels de prospection ;
- quels canaux elles préfèrent ;
- quelles catégories sont les plus ouvertes.

Les décisions business doivent être basées sur des données réelles et non sur des hypothèses.

---

# Livraison fonctionnelle

Toute fonctionnalité livrée doit être immédiatement opérationnelle.

Pas de :

- TODO laissés en suspens ;
- placeholders ;
- code mort ;
- fausses intégrations.

---

# Workflow

Toujours :

1. Faire la version la plus simple possible.
2. Vérifier qu'elle fonctionne.
3. Ajouter de la complexité seulement si nécessaire.

Éviter les usines à gaz.

---

# Style de communication

- Répondre en français.
- Challenger les mauvaises hypothèses avant d'agir.
- Expliquer clairement pourquoi une idée est mauvaise.
- Préférer les solutions simples et robustes.
- Ne jamais compliquer un projet sans raison.

---

# Git

Préfixes :

- feat:
- fix:
- refactor:
- docs:

Commit direct autorisé.

---

# Règle importante

Le user ne cherche pas à construire une agence automatisée.

Le user cherche d'abord à apprendre le marché.

Toujours privilégier :

Scraper → CSV → analyse manuelle → appels humains → conclusions → décision business.