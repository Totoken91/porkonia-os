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
    vfs.ts                disque du poste : opérations pures (créer, renommer, déplacer, copier, jeter, restaurer), Bureau, assainissement
    glisser.ts            glisser-déposer de fichiers (type de données, zones [data-depot])
    settings.ts           réglages (localStorage, assainis)
    desktop.ts            grille magnétique des icônes du bureau (placement, glisser, lasso, clavier)
    sons.ts               sons système (WebAudio) : carillons synthétisés, machine en échantillons (public/audio/pc/, scripts/sons-pc.py)
    distinctions.ts       distinctions civiques (succès) : signaux et ouvertures d'applis → médailles, rang, état conservé
    mailbox.ts            boîte aux lettres (livraison, lecture, corbeille sans destruction, brouillons, envoi, réponses)
    menus.ts              lettres d'accès et raccourcis des barres de menus
    context.tsx           OsApi (useOs) et WinApi (useWin) pour les applis
  components/             coque : Monitor (tube, alimentation), Boot (ScanDisque, BIOS), Login, Session, Desktop, Menu, Economiseur,
                          Wallpaper, WindowFrame, Taskbar, Overlays, Icon + pixel.ts (icônes et curseurs en pixel art)
  apps/                   une appli = un composant + sa logique pure ; registry.tsx fait le lien kind → composant
  app/                    layout (police du BIOS), page, globals.css (direction « PorkOS 98 »)
```

## Flux

1. `PorkOS` gère l'alimentation (bouton du moniteur) et enchaîne les phases dans le `Monitor` (écran logique 800×600 mis à l'échelle ; les déplacements de fenêtres sont divisés par l'échelle ; sur téléphone ou fenêtre étroite, PorkOS Poche : `choisirEcran` de `src/os/ecran.ts` donne un écran à la taille de l'appareil, zones sûres comprises, fourni par `EcranContext`) : (ScanDisque si le poste n'a pas été arrêté proprement) → PorkBIOS → chargement → connexion → session → fermeture → « vous pouvez éteindre ». Un marqueur en localStorage détecte les arrêts brutaux, y compris un onglet fermé.
2. `Session` tient les fenêtres (`winReducer`), la file de dialogues, les flash infos, la pub et la mise à jour en cours.
3. Toutes les secondes, `schedule()` reçoit un `tick` ; ouvrir une appli envoie `app-open` ; une appli peut émettre un `signal` (`nappe:incident`, `tv:zapper`…). Les règles du pack décident de ce qui en découle.
4. Une règle peut livrer un courrier tardif (action `mail`) : il arrive dans la boîte de réception, avec bulle et enveloppe dans la zone de notification. La boîte est retenue dans le navigateur.
5. Une action (`ActionRef`) peut ouvrir une appli, afficher un dialogue ou une bulle, lancer une pub, une mise à jour, la veille ou le verrouillage.

## Ajouter…

- **un fichier, un mail, une pub, un programme, un message** : uniquement dans le pack.
- **une réaction du système** : une règle dans `rules` (+ un pool de flash infos ou un dialogue).
- **une appli** : un `kind` dans `types.ts`, un composant dans `src/apps/<kind>/`, une entrée dans `registry.tsx`, un manifeste dans le pack.
- **un programme à télécharger** : un manifeste `installable: true` (absent des menus tant qu'aucun raccourci vers lui n'existe sur le disque), une entrée de `telechargements` et d'`installeurs`, un bloc `{ t: "telecharger" }` sur une page PigNet. La boîte « Téléchargement de fichier » dépose le programme d'installation sur le disque ; l'assistant (`src/apps/installeur/`) crée le dossier, les raccourcis et le désinstalleur. Exemple : Jambonjon (`src/apps/jambonjon/` : logique au tour par tour, rendu par lancer de rayons en 224×168).
- **argent, bourse et ivresse** : le compte en banque (Pork$, fictif, `localStorage`) est de la logique pure dans `src/os/banque.ts`, partagé par `src/os/banqueStore.ts` entre le site de la Caisse (`{ t: "banque" }`, `src/apps/navigateur/Banque.tsx`, courtage sur `coursSeance`) et la Course de Grosses (`src/apps/grosses/` : course calculée à l'avance puis rejouée). Boire (buvette) alimente `src/os/ivresse.ts` / `ivresseStore.ts` ; le moniteur lit ce niveau et tord l'écran (filtre SVG `#ivresse` + classes `.tube.ivre`, CSS seul sur le Poche).
- **une réplique de Gruik** (l'assistant du bureau) : `assistant` dans le pack (question à la première ouverture d'un programme, remarque sur un signal, conseils) ; logique dans `src/os/assistant.ts`, dessin pixel dans `src/components/gruik.ts`.
- **un nouvel ordinateur** (spin-off) : un nouveau pack ; `page.tsx` choisit le pack.

`tests/pack.test.ts` refuse un pack dont une référence (appli, dialogue, pool, pub, mise à jour, signal) ne mène nulle part.

## Direction visuelle « PorkOS 98 »

Un poste administratif qui aurait pu sortir en 1998, sans copier aucun système existant : écran 4:3 de 800×600 dans un moniteur
beige (plaque PORKONIA, voyant vert), léger balayage cathodique réglable. Châssis des fenêtres repris de l'atelier : parchemin biseauté,
titre lie-de-vin liseré d'or, titres à empattements, Pixel Operator 16 px (sa taille native). Bureau uni (vert bouteille par défaut ; lie-de-vin, portrait du Fondateur
centré ou mosaïque d'emblèmes), icônes 32 px, barre des tâches en relief, menu PorkOS à bandeau vertical et sous-menus, bulles de notification.
BIOS en VT323. Pictogrammes SVG maison, pas d'emoji. `prefers-reduced-motion` respecté.

Sur téléphone, le **PorkOS Poche** : plus de boîtier, l'écran épouse l'appareil à l'échelle 1 (zones sûres comprises) pour que la police
pixel reste nette. Barre d'état lie-de-vin en haut (titre du programme, courrier, son, réseau, mousse, plein écran, heure), lanceur
d'icônes au doigt à la place du bureau, barre de navigation en bas (menu PorkOS en tiroir, Retour au programme précédent, Accueil,
programmes ouverts). Fenêtres en plein écran, cibles tactiles d'au moins 44 px, bulles en haut. PorkTV a son plein écran (API du
navigateur et verrou paysage quand c'est permis, couche fixe sinon) avec une télécommande qui s'efface. Effets cathodiques allégés.
Installable sur l'écran d'accueil (`app/manifest.ts`, plein écran). Le format se choisit dans Réglages d'État › Affichage (ou `?ecran=poche|moniteur`).

## Courrier aux personnalités

Seul point serveur de PorkOS. Le Courrier d'État reconnaît l'adresse d'un correspondant du pack (`trouverCorrespondant`), envoie à
`/api/courrier` l'identifiant, l'objet, le texte du citoyen (sans citation ni signature) et les derniers échanges avec ce
personnage. Le relais valide la demande, fixe lui-même l'invite (consignes communes + fiche), appelle Groq avec la clé du
serveur, nettoie la réponse et la renvoie ; la session la livre quelques secondes plus tard comme un courrier ordinaire.
Toute erreur (relais absent en export statique, quota, réseau) donne la lettre de secours du personnage.
