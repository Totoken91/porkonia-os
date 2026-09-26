# Rapport d'importation canonique — Porkonia OS

_Généré le 2026-09-26 18:57 UTC par `npm run import:report` (lecture seule)._

## État de la base après import

| Élément | Nombre |
|---|---|
| Articles | 470 (dont 470 importés de Porkopédia, 1 protégé(s)) |
| Personnages | 17 (17 avec portrait canonique) |
| Médias référencés | 674 (650 externes sur Porkopédia, 24 fichiers locaux) |
| Entrées de Bible | 49 |
| Révisions archivées | 2211 |
| Documents sources conservés | Porkonia_Bible_Visuelle_2.docx (SHA-256 `b4e5ba35cdc739b9…`) |
| Anomalies d'intégrité | 0 |

Sauvegardes avant import : `backups/porkonia-2026-09-26T18-54-48-217Z.json`, `backups/porkonia-2026-09-26T18-54-58-299Z.json`.

## 1. Porkopédia

- Site : https://porkopedia.totoken.chatgpt.site/ — instantané du 2026-09-26T18:53:45.270Z (`imports/porkopedia-2026-09-26T18-53-40-528Z/site`), extraction `ext_d086912711c1a653` (extracteur v1.0.0).
- Isolation : chromium (headless), origine fictive `https://porkopedia.snapshot.invalid/` ; 43 fichiers servis depuis l'instantané, 510 requêtes bloquées, 0 tentative(s) d'écriture. **Aucune requête vers le site public pendant l'exécution ; le site n'a pas été modifié.**
- Contrôle de rendu : chaque article ouvert dans la page ; titres affichés tous conformes aux données.
- Import `imp_tf632kj4jz` du 2026-09-26 18:54 : articlesCrees 470, articlesModifies 0, mediasCrees 650, personnagesCrees 17, personnagesLies 0, conflitsLaissesEnPlace 0.

### Articles récupérés : 470

| Origine (script créateur) | Articles |
|---|---|
| `articles.js` | 301 |
| `bestiary.js` | 50 |
| `bestiary-legacy-restore.js` | 50 |
| `brandon.js` | 4 |
| `pierrick-nicolas.js` | 4 |
| `francois-alvarez.js` | 4 |
| `martin-chou.js` | 4 |
| `stanley.js` | 4 |
| `john-pork.js` | 4 |
| `wilfrite-lelouch.js` | 4 |
| `dj-viteau.js` | 4 |
| `edwin-valentin.js` | 4 |
| `mickael-jox.js` | 4 |
| `tonio.js` | 4 |
| `kevin-ranga.js` | 4 |
| `kenny-desaintfuscien.js` | 4 |
| `luis-fontanillas.js` | 3 |
| `bernis-mano.js` | 3 |
| `maxime-mauriac.js` | 3 |
| `index.html#script-en-ligne-1` | 2 |
| `bestiary-revision.js` | 1 |
| `stanley-mairie.js` | 1 |
| `econopork.js` | 1 |
| `douze-sacre.js` | 1 |
| `incident-gras-fond.js` | 1 |
| `chemins-porc-biere.js` | 1 |

**463 articles modifiés par des scripts** après leur création ; 463 versions d'origine (avant transformation) conservées dans l'historique des révisions.

| Script de transformation (ordre d'exécution) | Articles modifiés |
|---|---|
| `content-fixes.js` | 1 |
| `bestiary-legacy-snapshot.js` | 50 |
| `editorial-uniqueness.js` | 363 |
| `editorial-rewrite.js` | 352 |
| `image-overrides.js` | 55 |
| `lore-polish.js` | 357 |
| `foundational-bestiary-pass.js` | 18 |
| `figure-galleries.js` | 17 |
| `banquet-levels.js` | 3 |
| `douzi-epopee.js` | 1 |
| `econopork.js` | 2 |
| `editorial-batch-01.js` | 3 |
| `editorial-batch-02.js` | 3 |
| `editorial-batch-03.js` | 3 |
| `stanley-mairie.js` | 2 |
| `index.html#script-en-ligne-1` | 3 |

### Article protégé : Sofiane Douzi (`#article=douzi`)

- Chaîne réelle : `articles.js` → `editorial-uniqueness.js` → `editorial-rewrite.js` → `lore-polish.js` → `figure-galleries.js` → `index.html#script-en-ligne-1 (featuredArticles : remplacement complet)` → `douzi-epopee.js (PORKO_DOUZI_EPIC, appliqué par index.html)` → `index.html#script-en-ligne-1 (modification directe)`.
- Version importée : 12 scènes « douzi-scene », image principale `assets/douzi-archives/fondation-table.jpg`.
- Ancienne version (`articles.js`, image `assets/article-sofiane-douzi.jpg`) conservée **uniquement dans l'historique** (révision 1), jamais comme version courante.
- Protection active : oui — toute future mise à jour par import exige une décision humaine ; une version sans les 12 scènes est refusée par défaut.

### Médias : 650 références

- Affichées sur le site : 590 (statut « officiel ») ; présentes dans le code mais non affichées : 60 (statut « archive »).
- Chemins relatifs `assets/…` : 650, résolus en URL absolues ; le chemin d'origine est conservé. Aucune image n'a été déplacée ni copiée.
- Vérification HEAD : 650 OK / 0 indisponible(s).
- ⚠ Un catalogue d'URL n'est pas une sauvegarde physique : `npm run media:backup` en fait une copie facultative.

### Doublons, liens, provenance

- Contenus identiques : 0 ; titres identiques : 0 ; images partagées entre articles : 95.
- Liens internes `#article=` cassés : 0.
- Provenance incertaine : `artefacts` (index.html#script-en-ligne-1 (featuredArticles)), `gastronomie` (index.html#script-en-ligne-1 (featuredArticles)).

### Idempotence (nouveau passage du planificateur sur la même extraction)

Nouveaux : 0 · inchangés : 470 · conflits : 0 · médias nouveaux : 0 · fiches nouvelles : 0.

## 2. Bible visuelle (Porkonia_Bible_Visuelle_2.docx)

- Original conservé intact : `data/originals/b4e5ba35cdc739b97060f1265dc093e1defe240b34c8091ab71e1668eef65f63.docx` (lecture seule, 16.3 Mo) ; copie de sécurité `backups/originals/`.
- Structure : 144 paragraphes, 5 tableaux, 34 titres → 33 sections.
- Import `imp_ii14jp7kh1` : entreesBible 49, images 24, personnagesCrees 0, personnagesAssocies 17.

### Images extraites : 24 (octet pour octet, empreintes vérifiées)

| Image | Rôle | Dimensions | Contexte |
|---|---|---|---|
| `thumbnail.jpeg` | miniature | 395×512 | miniature du fichier |
| `image1.jpg` | non-placee | 1200×1200 | non placée dans le texte |
| `image2.png` | portrait | 771×865 | Références canoniques |
| `image3.png` | portrait | 610×581 | Registre des visages canoniques > Contrôle avant réutilisation — LULENGE WALALA Tonio |
| `image4.png` | portrait | 601×570 | Registre des visages canoniques > Contrôle avant réutilisation — Stanley Ferret |
| `image5.png` | portrait | 565×561 | Registre des visages canoniques > Contrôle avant réutilisation — Brandon Pichoff |
| `image6.png` | portrait | 400×400 | Registre des visages canoniques > Contrôle avant réutilisation — Kevin Ranga |
| `image7.png` | portrait | 1254×1254 | Registre des visages canoniques > Contrôle avant réutilisation — François Alvarez |
| `image8.png` | portrait | 437×427 | Registre des visages canoniques > Contrôle avant réutilisation — Wilfrite Lelouch |
| `image9.png` | portrait | 495×566 | Registre des visages canoniques > Contrôle avant réutilisation — DJ Viteau |
| `image10.png` | portrait | 587×587 | Registre des visages canoniques > Contrôle avant réutilisation — Edwin Valentin |
| `image11.png` | portrait | 553×606 | Registre des visages canoniques > Contrôle avant réutilisation — John Pork alias Axel Pork |
| `image12.png` | portrait | 605×587 | Registre des visages canoniques > Contrôle avant réutilisation — Martin Chou |
| `image13.png` | portrait | 578×580 | Registre des visages canoniques > Contrôle avant réutilisation — Pierrick Nicolas |
| `image14.png` | portrait | 602×581 | Registre des visages canoniques > Contrôle avant réutilisation — Mickael Jox |
| `image15.png` | portrait | 1448×1086 | Registre des visages canoniques > Contrôle avant réutilisation — Kenny Desaintfuscien |
| `image16.png` | portrait | 400×400 | Registre des visages canoniques > Maxime Mauriac |
| `image17.png` | portrait | 478×489 | Influence Catsoup légère > FONTANILLAS Luis |
| `image18.png` | portrait | 597×616 | Influence Catsoup légère > Général Mano Bernis |
| `image19.png` | identite | 1200×1200 | Références canoniques |
| `image20.png` | identite | 584×610 | Système d’identité de Porkonia > Écusson compact |
| `image21.png` | identite | 480×480 | Système d’identité de Porkonia > Insigne |
| `image22.png` | identite | 1200×340 | Système d’identité de Porkonia > Signature horizontale |
| `image23.png` | reference | 1200×900 | Choix du registre par sujet > Hamelot et les Grands Coteaux |

### Portraits canoniques → personnages

| Nom dans la Bible | Fiche | Fichier source déclaré | Apparence |
|---|---|---|---|
| Sofiane Douzi | Sofiane Douzi (proposition) | `43598a5b-1d5a-4a0e-b2a1-53feb2a4fc5c.png` | renseignée depuis la Bible |
| LULENGE WALALA Tonio | Lulenge Walala Tonio (proposition) | `39793864-c75f-4b29-87d8-13875dc8f220.png` | renseignée depuis la Bible |
| Stanley Ferret | Stanley Ferret (proposition) | `b28fa526-f58f-4ccb-848d-4144ab427a77.png` | renseignée depuis la Bible |
| Brandon Pichoff | Brandon Pichoff (proposition) | `ef227075-6275-4405-bf4f-c31e32cb56c4.png` | renseignée depuis la Bible |
| Kevin Ranga | Kevin Ranga (proposition) | `839a3c7f-2eb8-445c-9b21-fe919b1ed6de.png` | renseignée depuis la Bible |
| François Alvarez | François Alvarez (proposition) | `e91bccc0-706e-4873-a980-11dc665fef90.png` | renseignée depuis la Bible |
| Wilfrite Lelouch | Wilfrite Lelouch (proposition) | `de4c1526-a512-46cf-bd81-f214e7f4015b.png` | renseignée depuis la Bible |
| DJ Viteau | DJ Viteau (proposition) | `552be84a-1170-4e24-a66c-54ca86e7db56.png` | renseignée depuis la Bible |
| Edwin Valentin | Edwin Valentin (proposition) | `9c8150ab-bab0-4090-b3ee-766a1c80993d.png` | renseignée depuis la Bible |
| John Pork alias Axel Pork | John Pork (proposition) | `73adc826-c76b-41d3-9092-8691305f9a9b.png` | renseignée depuis la Bible |
| Martin Chou | Martin Chou (proposition) | `5f45e39b-ccf1-4166-a043-18362d4f9445.png` | renseignée depuis la Bible |
| Pierrick Nicolas | Pierrick Nicolas (proposition) | `bc9643f3-411f-49ad-a40b-84ea3756957a.png` | renseignée depuis la Bible |
| Mickael Jox | Mickael Jox (proposition) | `df5a5f0a-1147-45c8-8805-efda76f69315.png` | renseignée depuis la Bible |
| Kenny Desaintfuscien | Kenny Desaintfuscien (proposition) | `38e9d770-19fa-4a29-91d8-93969c033478.png` | renseignée depuis la Bible |
| Maxime Mauriac | Maxime Mauriac (proposition) | `7a8b100a-2f24-4a5f-b3a1-de4d70316dd6.png` | renseignée depuis la Bible |
| FONTANILLAS Luis | Luis Fontanillas (proposition) | `4df9bba8-e739-4e87-931f-f3a0d778aa36.png` | renseignée depuis la Bible |
| Général Mano Bernis | Général Mano Bernis (proposition) | `a71cbdc6-b525-463d-9b03-b1138adeb0ce.png` | renseignée depuis la Bible |

- Catégories sans aucune section dans le document (laissées vides, rien d'inventé) : chronologie, organisations.

## 3. Points restant à valider par un humain

- **17 fiches personnages au statut « proposition »** : créées depuis les pages « Figures historiques » et associées aux visages de la Bible. À relire puis passer en « canon » (Registre des individus).
- Section(s) de la Bible non importée(s) faute de catégorie : « Introduction » — à classer dans le Bureau des Importations si utile.
- Image(s) présente(s) dans le DOCX mais non placée(s) dans le texte : `image1.jpg` — importée(s) au statut « archive », rôle à préciser.
- Provenance à confirmer pour « Sept artefacts impossibles » (`artefacts`), « Gastronomie porkoniaise » (`gastronomie`) : articles définis uniquement dans le script en ligne d'index.html (« featuredArticles »).
- Nature des 650 images de Porkopédia : « indéterminée » (impossible de savoir automatiquement lesquelles sont des générations). À reclasser si besoin ; elles ne peuvent de toute façon pas remplacer un portrait source.
- Aucun conflit d'article n'est ouvert : premier import sur une base vide. Les conflits apparaîtront lors des prochains imports si un article est modifié à la fois ici et sur le site.

