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
    desktop.ts            grille magnétique des icônes du bureau (placement, glisser, lasso, clavier)
    sons.ts               sons système synthétisés (WebAudio, aucun fichier)
    context.tsx           OsApi (useOs) et WinApi (useWin) pour les applis
  components/             coque : Monitor (tube, alimentation), Boot (ScanDisque, BIOS), Login, Session, Desktop, Menu, Economiseur,
                          Wallpaper, WindowFrame, Taskbar, Overlays, Icon + pixel.ts (icônes et curseurs en pixel art)
  apps/                   une appli = un composant + sa logique pure ; registry.tsx fait le lien kind → composant
  app/                    layout (police du BIOS), page, globals.css (direction « PorkOS 98 »)
```

## Flux

1. `PorkOS` gère l'alimentation (bouton du moniteur) et enchaîne les phases dans le `Monitor` (écran logique 800×600 mis à l'échelle ; les déplacements de fenêtres sont divisés par l'échelle) : (ScanDisque si le poste n'a pas été arrêté proprement) → PorkBIOS → chargement → connexion → session → fermeture → « vous pouvez éteindre ». Un marqueur en localStorage détecte les arrêts brutaux, y compris un onglet fermé.
2. `Session` tient les fenêtres (`winReducer`), la file de dialogues, les flash infos, la pub et la mise à jour en cours.
3. Toutes les secondes, `schedule()` reçoit un `tick` ; ouvrir une appli envoie `app-open` ; une appli peut émettre un `signal` (`nappe:incident`, `tv:zapper`…). Les règles du pack décident de ce qui en découle.
4. Une action (`ActionRef`) peut ouvrir une appli, afficher un dialogue ou une bulle, lancer une pub, une mise à jour, la veille ou le verrouillage.

## Ajouter…

- **un fichier, un mail, une pub, un programme, un message** : uniquement dans le pack.
- **une réaction du système** : une règle dans `rules` (+ un pool de flash infos ou un dialogue).
- **une appli** : un `kind` dans `types.ts`, un composant dans `src/apps/<kind>/`, une entrée dans `registry.tsx`, un manifeste dans le pack.
- **un nouvel ordinateur** (spin-off) : un nouveau pack ; `page.tsx` choisit le pack.

`tests/pack.test.ts` refuse un pack dont une référence (appli, dialogue, pool, pub, mise à jour, signal) ne mène nulle part.

## Direction visuelle « PorkOS 98 »

Un poste administratif qui aurait pu sortir en 1998, sans copier aucun système existant : écran 4:3 de 800×600 dans un moniteur
beige (plaque PORKONIA, voyant vert), léger balayage cathodique réglable. Châssis des fenêtres repris de l'atelier : parchemin biseauté,
titre lie-de-vin liseré d'or, titres à empattements, Tahoma 11 px. Bureau uni (vert bouteille par défaut ; lie-de-vin, portrait du Fondateur
centré ou mosaïque d'emblèmes), icônes 32 px, barre des tâches en relief, menu PorkOS à bandeau vertical et sous-menus, bulles de notification.
BIOS en VT323. Pictogrammes SVG maison, pas d'emoji. `prefers-reduced-motion` respecté.
