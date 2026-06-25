# Srappeur — Collecte de prospects B2B français

Outil Node.js pour collecter des prospects B2B en France et organiser une étude de marché sur la prospection téléphonique.

**Ce que cet outil fait :**
- Recherche des entreprises locales via l'API Google Places
- Exporte les résultats dans un CSV prêt à l'emploi
- Inclut des colonnes vides pour noter vos appels manuellement

**Ce que cet outil ne fait PAS :**
- Il n'envoie aucun email
- Il ne passe aucun appel automatique
- Il ne contacte pas les entreprises

---

## Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur
- Une clé API Google Maps Platform (Places API)

---

## Installation

### 1. Installer les dépendances

```bash
cd Srappeur
npm install
```

### 2. Obtenir une clé API Google Places

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un projet (ou utilisez un existant)
3. Activez l'**API Places** dans "APIs & Services" > "Bibliothèque"
4. Créez une clé dans "APIs & Services" > "Identifiants" > "Créer des identifiants" > "Clé API"
5. (Recommandé) Restreignez la clé à l'API Places uniquement

> **Coût :** Google offre 200 $ de crédits gratuits par mois.
> - Text Search : ~3,50 $ / 1 000 requêtes
> - Place Details : ~17 $ / 1 000 requêtes
> Pour 50 résultats : environ 1 $ de coût

### 3. Configurer les variables d'environnement

```bash
# Copier le fichier exemple
copy .env.example .env

# Ouvrir .env et remplir votre clé API
notepad .env
```

Contenu de `.env` :
```
GOOGLE_PLACES_API_KEY=AIzaSy... (votre vraie clé ici)
```

---

## Utilisation

### Commande de base

```bash
node index.js search --category "plombier" --location "Lyon"
```

### Avec toutes les options

```bash
node index.js search \
  --category "électricien" \
  --location "Bordeaux" \
  --max 30 \
  --output ma_liste_elec
```

### Options disponibles

| Option | Raccourci | Description | Défaut |
|--------|-----------|-------------|--------|
| `--category` | `-c` | Catégorie d'entreprise | *requis* |
| `--location` | `-l` | Ville ou département | *requis* |
| `--max` | `-m` | Nombre max de résultats (plafond: 60) | `50` |
| `--output` | `-o` | Nom du fichier de sortie (sans .csv) | auto-généré |

### Exemples de recherches

```bash
# Plombiers à Paris
node index.js search -c "plombier" -l "Paris"

# Couvreurs dans le département 69 (Rhône)
node index.js search -c "couvreur" -l "Rhône" -m 40

# Paysagistes à Nantes, 25 résultats max
node index.js search -c "paysagiste" -l "Nantes" -m 25

# Menuisiers à Toulouse avec nom de fichier personnalisé
node index.js search -c "menuisier" -l "Toulouse" -o menuisiers_toulouse_juin
```

---

## Résultat : le fichier CSV

Les fichiers CSV sont générés dans le dossier `output/`.

### Colonnes collectées automatiquement

| Colonne | Source |
|---------|--------|
| Nom | Google Places |
| Catégorie | Votre paramètre |
| Ville | Extraite de l'adresse |
| Département | Code postal (2 premiers chiffres) |
| Adresse complète | Google Places |
| Téléphone | Google Places Details |
| Site Web | Google Places Details |
| Email | Non disponible via Google* |
| Note Google | Google Places |
| Nombre d'avis | Google Places |
| Google Place ID | Pour vérification sur Maps |

*Google Places ne fournit pas les emails. Vous pouvez les trouver manuellement sur les sites web.

### Colonnes vides pour votre étude (à remplir manuellement)

| Colonne | Ce que vous remplissez |
|---------|----------------------|
| Appelé ? | oui / non |
| A répondu ? | oui / non |
| Reçoit beaucoup d'appels commerciaux ? | oui / non |
| Accepte généralement d'écouter les commerciaux ? | oui / non |
| A déjà acheté un service après un appel à froid ? | oui / non |
| Canal préféré | téléphone / email / aucun |
| Commentaires | Notes libres |

---

## Workflow recommandé

```
1. COLLECTER    node index.js search -c "plombier" -l "Lyon" -m 50
                → output/prospects_plombier_lyon_20240624.csv

2. SÉLECTIONNER Ouvrez le CSV dans Excel ou Google Sheets
                Supprimez les lignes non pertinentes
                Gardez 15-20 entreprises à appeler

3. APPELER      Appelez chaque entreprise manuellement
                Posez vos questions d'étude de marché
                Remplissez les colonnes au fur et à mesure

4. ANALYSER     Filtrez / pivotez les données dans Excel
                Calculez les taux de réponse, canaux préférés, etc.
```

---

## Structure du projet

```
Srappeur/
├── src/
│   ├── scrapers/
│   │   └── googlePlaces.js     # Appels à l'API Google Places
│   ├── exporters/
│   │   └── csvExporter.js      # Génération du fichier CSV
│   └── utils/
│       ├── logger.js            # Affichage coloré dans le terminal
│       └── sleep.js             # Délai entre les requêtes
├── output/                      # Fichiers CSV générés (gitignorés)
├── index.js                     # Point d'entrée CLI
├── package.json
├── .env.example                 # Modèle de configuration
├── .env                         # Votre configuration (ne pas committer)
└── README.md
```

---

## Limites connues

- **Maximum 60 résultats** par recherche (limite de l'API Google Places Text Search)
- **Emails non disponibles** via Google Places — à récupérer manuellement sur les sites web
- **Résultats en doublon possibles** si une entreprise a plusieurs établissements
- Pour des villes très peuplées, précisez un arrondissement ou un quartier (ex: "Paris 11")

---

## Questions fréquentes

**Puis-je lancer plusieurs recherches et fusionner les CSV ?**
Oui. Lancez plusieurs commandes avec des villes différentes, puis fusionnez les fichiers dans Excel.

**Comment ouvrir le CSV avec les accents corrects dans Excel ?**
Le fichier est encodé en UTF-8. Dans Excel : Données > Obtenir des données > À partir d'un fichier texte/CSV, puis choisissez "UTF-8" comme encodage.

**Puis-je ajouter d'autres colonnes d'étude ?**
Oui, modifiez le tableau `CSV_HEADERS` dans `src/exporters/csvExporter.js` et ajoutez les champs correspondants dans `src/scrapers/googlePlaces.js`.
