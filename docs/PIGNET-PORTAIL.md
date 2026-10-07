# PigNet : portail et sites

Le portail conserve les rubriques, la recherche, le sondage, les programmes TV et le compteur. Six accès sont visibles dès l’arrivée : Donjonbon, tous les jeux, boutique, banque, musique, annuaire. Quatre publicités illustrées naviguent vers des sites réels du pack, chacune avec son identité et sa destination. Le texte de l’interface reste à 16 px.

## Destinations

- `porko://donjonbon` : jeu, douze chevaliers et leurs blasons, guide, téléchargement. Installer et jouer ouvre l’assistant ; après installation, le même accès relance le jeu. La capture est prise dans le vrai jeu.
- `porko://salle-arcade` : accès aux trois jeux et à leurs sites.
- `porko://douzi-ambree` : brasserie, livraison et comptoir, reliés à Porkomazon, à la banque et à Channel Pork. La bouteille de l’annonce suit la référence produit fournie.
- `porko://saucissignal` : façade de startup crédible, vision et espace investisseurs. Les versements uniques de 5, 12 ou 25 Pork$ vont au compte personnel d’Éric. L’historique de la banque et le reçu révèlent le gag ; aucun prélèvement récurrent, aucune action attribuée. Le débit utilise `banque.debiter`, avec refus si le solde est insuffisant.
- `porko://club-viteau` : discothèque, livre d’or, accès à PorkAmp et Channel Pork.

Ces cinq nouveaux sites comptent treize pages. Contenu, publicités et textes sont dans `src/content/packs/pignet.ts` et les chaînes du pack PorkOS. Les essais graphiques abandonnés ne sont pas distribués.

## Validation

`node tests/e2e/pignet.mjs` après build vérifie les publicités, liens, installation et relance de Donjonbon, blasons, accès aux applis, versement à Éric et refus du dépassement de solde. `FORMATS` sélectionne les formats ; `SHOTS` active les captures. Les tests de pack vérifient les routes et les images. Les sites sont accessibles sur bureau et Poche, y compris 360 px de large et paysage.
