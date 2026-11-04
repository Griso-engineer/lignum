# Lignum — vérification des éléments bois (Tracés)

Application web statique de vérification des poutres et poteaux bois de section rectangulaire
selon NF EN 1990, NF EN 1995-1-1 et NF EN 1995-1-2 avec annexes nationales françaises :
ELU fondamental, incendie (section réduite), séisme, flèches (ELS).

**En ligne : https://griso-engineer.github.io/lignum/**

Reprise et correction des classeurs « Poutre bois V02.xlsx » et « STR_OUT_Bois_Poteau_V1_2017.xlsx »
(même moteur de calcul ; les corrections sont listées dans l'onglet *Méthode*).

## Fonctions

- **Vérification** : section, matériau (EN 338 / EN 14080), classe de service, k<sub>sys</sub>, longueurs de
  flambement et de déversement, durée de stabilité au feu et faces exposées.
- **Sollicitations**, au choix :
  - saisie directe des cas unitaires (PP, G, G fragile, Q1, Q2, S, W, EX±, EY±) en daN ou kN — un bloc
    copié depuis Excel / GSA se colle directement dans le tableau ;
  - hypothèses de charges *poutre* (bandes, rampant, dévers, façade) ;
  - hypothèses de charges *poteau* (descente de charges par niveaux, vent).
- **Combinaisons** générées automatiquement (ψ et k<sub>mod</sub> tirés des catégories), enveloppe par critère,
  détail de la combinaison dimensionnante, flèches w<sub>inst</sub>, w<sub>fin</sub>, w<sub>active</sub>.
- **Fiche NDC** : aperçu A4, export PDF (impression du navigateur), Word (.doc) et JPEG.
- **Projets** : enregistrement des vérifications dans le navigateur (localStorage, ~3 ko par
  vérification), export / import .json, fiches NDC de tout un projet.

## Lancer en local

Scripts classiques, sans dépendance : `index.html` s'ouvre par double-clic. Ou :

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

`tests.html` compare le moteur aux valeurs des classeurs Excel d'origine.

## Fichiers

| Fichier | Rôle |
|---|---|
| `js/data.js` | Propriétés des bois, k<sub>mod</sub>, k<sub>def</sub>, γ<sub>M</sub>, ψ |
| `js/ec5.js` | Moteur de calcul (fonction pure `LignumEC5.compute`) |
| `js/store.js` | État par défaut, projets (localStorage) |
| `js/report.js` | Fiche NDC et exports |
| `js/app.js` | Interface |
