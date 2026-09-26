# Architecture de PorkOS

Export statique Next 16 (App Router, `output: "export"`), React 19, TypeScript strict. Aucun serveur, aucune clé, aucune API payante.

```
src/
  content/
    types.ts              contrat d'un pack de contenu
    packs/porkos.ts       le pack « Édition Citoyenne »
    porkopedia/*.json     notices Porkopédia assainies au build (scripts/build-porkopedia.mts)
  os/                     cœur PUR (testé) + contextes React
    windows.ts            réducteur du gestionnaire de fenêtres
    scheduler.ts          règles d'événements → actions (déterministe)
    rng.ts                aléatoire rejouable (mulberry32)
    fs.ts                 chemins du système de fichiers du pack
    settings.ts           réglages (localStorage, assainis)
    context.tsx           OsApi (useOs) et WinApi (useWin) pour les applis
  components/             coque : Boot, Login, Session (bureau), WindowFrame, Taskbar, Overlays, Icon
  apps/                   une appli = un composant + sa logique pure ; registry.tsx fait le lien kind → composant
  app/                    layout (polices), page, globals.css (direction « Télé d'État »)
```

## Flux

1. `PorkOS` enchaîne les phases : démarrage (mire → PorkBIOS → titre) → connexion → session (→ veille).
2. `Session` tient les fenêtres (`winReducer`), la file de dialogues, les flash infos, la pub et la mise à jour en cours.
3. Toutes les secondes, `schedule()` reçoit un `tick` ; ouvrir une appli envoie `app-open` ; une appli peut émettre un `signal` (`nappe:incident`, `tv:zapper`…). Les règles du pack décident de ce qui en découle.
4. Une action (`ActionRef`) peut ouvrir une appli, afficher un dialogue ou un flash, lancer une pub, une mise à jour, la veille ou le verrouillage.

## Ajouter…

- **un fichier, un mail, une pub, un programme, un message** : uniquement dans le pack.
- **une réaction du système** : une règle dans `rules` (+ un pool de flash infos ou un dialogue).
- **une appli** : un `kind` dans `types.ts`, un composant dans `src/apps/<kind>/`, une entrée dans `registry.tsx`, un manifeste dans le pack.
- **un nouvel ordinateur** (spin-off) : un nouveau pack ; `page.tsx` choisit le pack.

`tests/pack.test.ts` refuse un pack dont une référence (appli, dialogue, pool, pub, mise à jour, signal) ne mène nulle part.

## Direction visuelle « Télé d'État »

Châssis des fenêtres repris de l'atelier (titre lie-de-vin, liseré or, parchemin biseauté) posé sur une affiche
imprimée trois couleurs (rouge, crème, noir) à trame de points, avec portrait du Fondateur en bichromie. Signal CRT réglable (`--crt`),
bandeau d'info, barre des tâches en « canaux », menu « Au programme », mire au démarrage. Polices : Big Shoulders (affiche), VT323 (terminal),
Tahoma dans les fenêtres. Pictogrammes SVG maison, pas d'emoji. `prefers-reduced-motion` respecté.
