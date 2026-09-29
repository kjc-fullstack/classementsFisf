# Classements FISF — Saison 2026-2027

Application web **statique** de consultation vivante et interactive des classements
mondiaux FISF de Scrabble : **Duplicate** (13 783 joueurs) et **Classique** (1 681 joueurs),
plus l'onglet officiel *Barres et quotas*.

Aucun serveur applicatif, aucune base de données : le site lit un fichier de données
généré depuis les classements Excel officiels. Hébergeable gratuitement partout.

---

## Démarrer en local

Le site fonctionne même en double-cliquant sur `index.html`, mais un petit serveur
local est recommandé :

```bash
python -m http.server 8765
# puis ouvrir http://localhost:8765/
```

## Déployer (GitHub Pages, Netlify, Cloudflare Pages…)

Le projet est un site 100 % statique : il suffit de publier le dossier.

- **Netlify / Cloudflare Pages / Vercel** : glisser-déposer le dossier ou connecter le dépôt, aucune commande de build.
- **GitHub Pages** : pousser sur un dépôt, puis *Settings → Pages → Deploy from branch* (racine), ou utiliser le workflow CI fourni (voir plus bas).
- **Exporter en un fichier** : `python tools/export.py` produit `dist/classements-fisf-<date>.zip`, déployable tel quel sur n'importe quel hébergeur statique.

## Déploiement automatique (GitHub Actions)

Le fichier `.github/workflows/deploy.yml` est fourni : à chaque push sur `main`,
il régénère les données depuis `archives/`, emballe le site et le publie sur
GitHub Pages. Dans le dépôt : *Settings → Pages → Source : GitHub Actions* (une fois).

Mettre à jour le classement devient alors :
déposer le nouvel XLSX dans `archives/` → commit → push → le site se met à jour tout seul.

> Astuce : les graphiques et l'upload XLSX chargent ECharts et SheetJS depuis un CDN.
> Sans connexion, le site reste utilisable (tableaux, filtres, fiches) et les graphiques
> affichent un message de repli.

---

## Publier une mise à jour du classement (toutes les 2-4 semaines)

### Voie recommandée — script Python (durable, pour tout le monde)

1. Déposer le nouveau fichier officiel dans `archives/` avec la date en préfixe, ex. :
   `archives/2026-10-29_classements-2026-2027.xlsx`
2. Régénérer les données :
   ```bash
   python tools/build_data.py        # nécessite : pip install openpyxl
   ```
3. Déployer le nouveau `assets/data/data.js` (commit + push si GitHub Pages).

Le script lit **tous** les snapshots de `archives/` (triés par date) : le plus récent
devient le classement courant, le précédent sert à calculer les vraies places
antérieures (`pv`) et l'historique du top 200 (bump charts). Tant qu'un seul snapshot
existe, ces valeurs sont **simulées** (bandeau d'avertissement affiché sur le site).

### Voie rapide — panneau Admin (navigateur, local)

`#/admin` (mot de passe par défaut : `fisf2026`) → *Publier un classement* :
charger le `.xlsx`, vérifier la détection des colonnes, publier.
L'édition est stockée dans le **localStorage du navigateur** : parfaite pour préparer
ou dépanner, mais invisible des autres visiteurs — le déploiement durable passe par le script.

Le panneau Admin permet aussi d'**enrichir les fiches joueurs** (photo, pseudo
WebScrabble/ISC, ancienneté, objectifs, lien topping, palmarès, anecdotes, bio…),
de changer le mot de passe et d'exporter/importer les données locales.

---

## Structure

```
├── index.html                  # coquille SPA + CDN (ECharts, SheetJS)
├── assets/
│   ├── css/style.css           # thème « table de Scrabble »
│   ├── js/app.js               # routeur, vues, animations, admin
│   └── data/data.js            # données générées (window.FISF_DATA)
├── tools/build_data.py         # Excel → data.js (multi-snapshots)
└── archives/                   # classements XLSX datés (source de vérité)
```

## Fonctionnalités

- **Classements Duplicate & Classique** : recherche instantanée, filtres pays/séries,
  tris (place, score/cote, mouvement), vue tableau ou cartes, pagination,
  flèches de progression, badges montées/descentes de séries, compteurs animés.
- **Graphiques** : course au sommet (top 20), matrice de transition des séries
  (heatmap), top pays, distribution des scores, nuage cote/expérience (Classique).
- **Fiche joueur** : évolution du classement, radar S1–S6, statistiques,
  « Ta cible » (joueurs juste devant), profil public enrichi par l'admin.
- **Quoi de neuf ?** : bilan automatique de chaque publication (entrants,
  changements de série, plus grosses progressions/régressions).
- **Records & curiosités**, **Duels** (comparaison tête-à-tête), **Quiz « Qui suis-je ? »**.
- **Barres & quotas** officiels 2026-2027.
- **Admin** : enrichissement des fiches, publication XLSX, réglages, export/import.

## Notes

- En Duplicate, le score affiché est le **%S de la série du joueur** ; sa fiche détaille
  aussi les %S de la série précédente et de la suivante (les trois % qui comptent pour
  sa série). Le **classement officiel (Place)** reste la référence.
- Les fiches admin et publications « rapides » vivent dans le navigateur
  (localStorage, ~5 Mo max) : pensez à exporter avant de changer de machine/navigateur.
- Données : © classements officiels FISF — saison 2026-2027, fichier initial du 2026-10-01.
