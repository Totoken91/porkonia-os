@AGENTS.md

# PorkOS — consignes de travail

Démo jouable (export statique Next 16) de l'OS officiel de la République de Porkonia. Ton : humour absurde d'État, raffiné, trash et random ; jamais d'humour « IA » convenu. Détails : README.md et docs/ARCHITECTURE.md. L'ancien atelier vit sur `archive/atelier`.

## Règles
- Tout contenu (textes, fichiers, mails, pubs, programmes, événements) vit dans un pack (`src/content/packs/`), jamais dans un composant.
- Logique pure dans `src/os/` et `src/apps/*/logic|url|timeline.ts`, testée dans `tests/`.
- Images de Porkopédia : liens vers l'hébergement d'origine, aucune copie. Porkopédia n'est jamais modifiée d'ici.
- Ne jamais inventer de canon Porkonia présenté comme officiel ; les notices viennent d'une extraction.
- Direction « Télé d'État » : châssis de fenêtres de l'atelier + affiche rouge/crème/noir, trame, CRT. Pas d'emoji, pas de dégradés violets, pas d'Inter.
- Aucun secret côté client, aucune API payante, pas de Supabase.
- Next 16 : lire `node_modules/next/dist/docs/` avant d'utiliser une API.

## Commandes
`npm run dev` · `npm run typecheck` · `npm test` · `npm run build` · `npm run test:e2e` (après build ; `SHOTS=dossier` pour les captures) · `npm run content:porkopedia -- extraction.json`

## Méthode
Lire seulement les fichiers concernés. Valider par `npm run typecheck && npm test`, puis build + e2e si l'UI change.
