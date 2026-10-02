@AGENTS.md

# PorkOS — consignes de travail

Démo jouable (export statique Next 16) de l'OS officiel de la République de Porkonia. Ton : humour absurde d'État, raffiné, trash et random ; jamais d'humour « IA » convenu. Détails : README.md et docs/ARCHITECTURE.md. L'ancien atelier vit sur `archive/atelier`.

## Règles
- Tout contenu (textes, fichiers, mails, pubs, programmes, événements) vit dans un pack (`src/content/packs/`), jamais dans un composant.
- Logique pure dans `src/os/` et `src/apps/*/logic|url|timeline.ts`, testée dans `tests/`.
- Images de Porkopédia : copiées dans `public/porkopedia/` (le site est protégé par mot de passe depuis octobre 2026 ; copie autorisée par l'utilisateur). Le mot de passe n'entre jamais dans le dépôt ni dans le client. Porkopédia n'est jamais modifiée d'ici.
- Ne jamais inventer de canon Porkonia présenté comme officiel ; les notices viennent d'une extraction.
- Direction « PorkOS 98 » : écran 4:3 800×600 dans un moniteur, look carré et d'époque, châssis de fenêtres de l'atelier (parchemin, lie-de-vin, or). Police d'interface : Pixel Operator (CC0, `src/app/fonts/`) à 16 px uniquement (taille native, sinon floue). Pas une copie de Windows. Pas d'emoji, pas de dégradés violets, pas d'Inter.
- Téléphone : PorkOS Poche (`src/os/ecran.ts`), l'écran épouse l'appareil à l'échelle 1 (barre d'état, lanceur, barre de navigation, fenêtres plein écran). Toute interface nouvelle doit tenir à 360 px de large et en paysage (390 px de haut) ; styles du Poche sous `.ecran.poche`, marges via `--haut` et `--bas`. L'e2e passe en bureau, poche paysage et poche portrait.
- Aucun secret côté client, aucune API payante, pas de Supabase. Seule exception : le Courrier aux personnalités (`correspondants` du pack) passe par le relais serveur `src/app/api/courrier/route.serveur.ts` vers Groq (offre gratuite, `openai/gpt-oss-120b`) ; la clé `GROQ_API_KEY` vit uniquement dans les variables d'environnement Vercel. Le relais n'existe qu'au build Vercel (`next.config.ts`) ; ailleurs, lettre de secours.
- Personnages et voix de Channel Pork (jeu télévisé, pubs) : suivre docs/CASTING.md et scripts/channel-pork/casting.json pour rester constant.
- Next 16 : lire `node_modules/next/dist/docs/` avant d'utiliser une API.

## Commandes
`npm run dev` · `npm run typecheck` · `npm test` · `npm run build` · `npm run test:e2e` (après build ; `SHOTS=dossier` pour les captures) · `npm run content:porkopedia -- extraction.json`

## Méthode
Lire seulement les fichiers concernés. Valider par `npm run typecheck && npm test`, puis build + e2e si l'UI change.
