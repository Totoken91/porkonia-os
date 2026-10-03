# Casting de Channel Pork

Référence pour garder les personnages constants d'un épisode à l'autre : qui ils sont, comment ils parlent, quelle voix et quelles images. Réglages machine dans `scripts/channel-pork/casting.json`, répliques déjà enregistrées dans `scripts/channel-pork/*-repliques.json`.

Tout ce qui suit est de la fiction de démo (jeu télévisé et pub), pas du canon Porkopédia.

## « Ferme ta gueule et réponds »

Jeu télévisé de Canal 1, d'après le script fourni (télé porkoniaise du début des années 2000, humour joué sérieusement : personne ne sait qu'il est dans une comédie). De gauche à droite : Frédéric, Kevin, Martin, Tonio ; Jean-Groin à son pupitre, à droite. Sponsor : Brasswagen.

| Personnage | Qui il est | Comment il parle | Voix |
|---|---|---|---|
| **Jean-Groin Laverdure** (présentateur) | Hybride porc-humain : oreilles porcines, petit groin, mains humaines. Veste bordeaux brillante, cravate moutarde, micro argenté filaire. | Bateleur de jeu ringard, sourit presque tout le temps, même quand il menace. Piques sucrées (« Parfait. Vous expliquerez aux autres pourquoi vous perdez »), froid d'un coup (« Vous me prenez pour un con ? »). | ElevenLabs v3, **Arnold** |
| **Frédéric Legaigneur** | Polo rose, cigarette éteinte derrière l'oreille, yeux très rouges. Docteur en imprimantes, ancien négociateur. | Baratineur qui se la pète, toujours sûr de lui, mauvaise foi totale. Tics : « s'il vous plaît », « hein », « moi », « mon vieux », « Ça, vous l'aviez pas vu venir ». S'énerve en criant quand on le contredit. | ElevenLabs v3, **Callum** |
| **Kevin Ranga** | Blazer gris, chemise noire, téléphone toujours en main. Spécialité : la cuisine assistée par intelligence artificielle. | Puceau timide qui bégaie (« La… la cu-cuisine »), voix qui déraille, marmonne. RangaNet, son téléphone, est « son meilleur ami. Son seul ami ». Compétent en cuisine quand même. | ElevenLabs v3, **Harry** |
| **Martin Chou** | Chemise blanche, cheveux courts dressés, deux moulures dorées posées sur son pupitre. Esthète des finitions. | Patriote chinois à fond : tout est mieux en Chine (« En Chine, à Jingdezhen, on renvoie l'artisan pour moins que ça », « La porcelaine. Chinoise, évidemment »). Méprisant, soupire (« Pfff »). Accent mandarin. | Qwen (Alibaba), **Ethan**, avec consigne d'accent |
| **Tonio** | Chemise crème, cheveux courts. Propriétaire d'une Brasswagen Palou à un milliard de kilomètres. | Très calme, lent, pinailleur (exige des précisions même quand il gagne). Fait des lapsus et inverse les mots, puis se corrige posément (« Un kilo de milliards de mètres. Euh… non. Un milliard de kilomètres »). Voix ordinaire de type un peu bête, fier de lui, sans accent (aucun moteur n'a réussi l'accent congolais ; Brian, trop solennel, a été écarté). | ElevenLabs v3, **Josh** |

Voix secondaires : chauffeur de salle **George** (crie au public), homme du public **Sam** (lance des vannes), jury **Daniel** (sec, ennuyé). Narrateur de la pub Brasswagen : **Bill**. Narrateur d'Initial P : **Patrick**.

Découpage prévu : épisode 1 = introduction et questions 1 à 3 (en ligne) ; épisode 2 = questions 4 à 8 ; épisode 3 = questions 9 à 12 et finale.

Épisode 2 (en ligne) : voix passées en ElevenLabs **v4** (mêmes voix). Le jury s'appelle **Gérard** (Daniel). Nouveau : **la capuche**, intrus au visage aux proportions fausses qui débarque, insulte tout le monde et repart (voix Ethan d'ElevenLabs, descendue et collée au micro) ; personne ne réagit. Scores en fin d'épisode : Tonio 4, Kevin 2, Martin 2, Frédéric 0 ; Kevin et Martin ont encore leur « J'insiste ». Mixage `scripts/channel-pork/mix-ftg-ep2.py`.

## Pub Brasswagen Palou

Pub auto façon années 90 : la petite voiture violette aux pare-chocs cuivrés, compteur « 1 000 000 000 porkomètres ». Tonio y témoigne avec ses lapsus. Slogans : « Elle ne s'arrête pas. Elle se repose en roulant. », « Brasswagen. Et toujours plus de route. ». Mention légale débitée vite : partenaire officiel du jeu, « Kilométrage non contractuel. Route non fournie. »

## Pub « Judas Qui c'est ? »

Télé-achat trash d'après le script de l'utilisateur : un vendeur moustachu en veste de velours vante un judas en laiton qui montre les visiteurs douze minutes à l'avance, aperçoit son propre double paniqué sur le palier, puis finit en pleurs quand la poignée descend. Doublage ElevenLabs **v4** (nettement plus vivant que v3). Le vendeur et son double ont la même voix, **Clyde** (le double est étouffé comme à travers la porte au mixage) ; voix off finale radieuse : **Charlotte**. Images dans `public/tv/judas/`, mixage `scripts/channel-pork/mix-pub-judas.py` (sonnette, coups, poignée, coup violent : bruitages CC0).

## « Éric présente Saucissignal »

Faux talk-show de startup d'après le script de l'utilisateur : Éric vend un abonnement pour entendre un saucisson à distance ; le client ne reçoit rien. Éric (**Dave**, ElevenLabs v4) dit chaque absurdité avec une conviction professionnelle absolue, sans grimace ; le présentateur (**Paul**) reste poli quoi qu'il arrive. Pas de bip, pas de bruitage comique sur les jurons, silences qui respirent ; fond de plateau (bourdon électrique, chaudière de brasserie, toux en régie), jingle minable et coupe nette. Images dans `public/tv/eric/`, mixage `scripts/channel-pork/mix-eric-saucissignal.py`.

## Choisir un moteur de voix

Comparatif d'octobre 2026 (même réplique, étendue de hauteur en demi-tons) : ElevenLabs v4 18,5 · MiniMax 2.8 HD 17,3 · Fish Audio 16,0 · OpenAI 12,5 · Hume Octave 2 11,6 · Inworld 9,3 · ElevenLabs v3 7,9. Pour toute nouvelle voix : `eleven_v4`, qui garde les balises de jeu.

## Initial P

Parodie d'animé de course des années 80, en images fixes : Tonio livre de la Douzi Ambrée la nuit sur le Mont Porcin dans sa Brasswagen Palou et gagne une course de drift à 40 km/h contre **John Pork**, parce que celui-ci s'arrête pour ne pas le dépasser. Doublage VF surjoué, musique « Night Highway Heartbreak » (fournie). Images dans `public/tv/initial-p/` ; brief ChatGPT : style « capture d'écran d'une série animée japonaise télévisée de 1986, celluloïd peint à la main, aplats, contours noirs nets, ombrage en deux tons, grain de pellicule, 4:3 », avec aquarelle, rendu peinture et 3D explicitement interdits (sinon ChatGPT fait de l'aquarelle).

| Personnage | Qui il est | Comment il parle | Voix |
|---|---|---|---|
| **Tonio** | Héros, gilet violet sur pull crème, au volant de la Palou violette pleine de caisses. | Gonflé à bloc mais toujours un peu bête, lapsus et inversions (« douze aubes avant la caisse »). | ElevenLabs v3, **Josh** |
| **John Pork** | Rival : cheveux noirs, t-shirt noir, très musclé, voiture de sport noire à phares escamotables. | Voix grave, divine, ultra sexy ; parle lentement, susurre ses défis, s'effondre avec sensualité quand il perd. | ElevenLabs v3, **Brian** |
| Narrateur | Voix off d'animé. | Surexcité, crie chaque évidence comme une finale du monde. | ElevenLabs v3, **Patrick** |

## Voix off des autres émissions

Toutes doublées en ElevenLabs v3 avec des balises de jeu (ton vivant, pas de lecture plate). Prises dans `scripts/channel-pork/voix/<émission>/` avec `repliques.json` ; fichiers diffusés dans `public/audio/channel-pork/` sous leurs noms d'origine.

| Émission | Voix off | Voix | Ton |
|---|---|---|---|
| Le Journal du Groin | Présentatrice | **Rachel** | Assurée, pince-sans-rire |
| Pub Douzi Ambrée | Narrateur | **Adam** | Grave, intime, fier |
| Ma Pork ID et moi | Institutrice | **Matilda** | Enjouée, un peu condescendante |
| Groinball | Commentateur | **Antoni** | Commentateur sportif surexcité |
| Petites Bêtes de la République | Narratrice | **Elli** | Documentaire animalier, amusée |
| Bestiaire | Narrateur | **Thomas** | Documentaire sérieux, chuchote |
| Grand Zouk (DJ Viteau) | Animateur | **Will** | Ambianceur qui crie à la foule |
| Météo de la mousse | Présentatrice | **Freya** | Météo souriante, pince-sans-rire à la chute |
| Brume (Nuit) | — | inchangée | **Garde son ton monotone d'origine : ne pas la revoicer.** |

## Images

Les images de référence sont dans `public/tv/ftg/` (gros plans : `frederic`, `kevin`, `martin`, `tonio`, `animateur`, `animateur-crispe` ; décor : `plateau`, `public`, `vitrine`, `regie`, `buzzer`, `logo`) et `public/tv/brasswagen/`. Pour un nouveau plan, joindre ces images à ChatGPT pour garder les mêmes visages, et finir chaque prompt par :

> Format 4:3 paysage, télé porkoniaise du début des années 2000, décor bordeaux, tubes turquoise, texture digicam dégradée, lumière dure, aucun texte dans l'image.

## Fabriquer des voix

Outil Speko `audio.synthesize`. Corps : la `base` du moteur (`casting.json`) + `voice` (+ `instructions` pour Qwen) + `text`.

- **ElevenLabs v3** : jeu indiqué par des balises en anglais entre crochets dans le texte (`[smug, bragging, chuckles] Frédéric. Docteur en imprimantes…`). Garder les balises courtes : une balise longue avec des virgules peut être lue à voix haute (« still smiling through gritted teeth »).
- **Qwen** (Martin) : pas de balises ; tout le jeu passe par `instructions`. Pour un mot qu'il mâche, ajouter « Parle lentement et articule bien. »
- Réponse : PCM 24 kHz en base64, enregistrée dans un fichier de résultat ; `python3 scripts/channel-pork/commun.py reponse.json Lxx.wav` la convertit. Ranger la prise en opus dans `scripts/channel-pork/voix/<émission>/`.
- Vérifier chaque prise par transcription (faster-whisper, modèle « small », langue forcée `fr`) avant de mixer.

Pièges connus :

- Un nombre ou un mot isolé peut sortir en anglais : écrire « Trente-six bouteilles. » plutôt que « Trente-six. ».
- Les mots étirés se déforment (« BONSOIIIR » devient « Bonne sœur ») : écrire normalement, la balise suffit.
- Les balises d'accent (« [Chinese accent] ») n'ont aucun effet sur les voix ElevenLabs du catalogue : il faut un moteur ou une voix qui porte l'accent.
- Pas de voix africaine francophone disponible via Speko ; Gemini TTS est refusé (pas de tarif publié).

## Mixer et publier

Bruitages : de vrais sons enregistrés, sous licence CC0, rangés dans `scripts/channel-pork/sons/bruitages/` (sources dans `LICENCES.md`). Pas de nappe ni de moteur synthétiques : ils sonnent faux. La musique reste présente sous les voix et ne s'efface que de 6 dB au plus, en douceur, sans « pomper » à chaque réplique.

```
cd scripts/channel-pork
python3 mix-ftg-ep1.py           # sortie/ftg-ep1.mp3 + ftg-ep1.json
python3 programme.py sortie/ftg-ep1.json > /tmp/prog.txt   # slides et sous-titres pour le pack
python3 mix-pub-brasswagen.py    # sortie/pub-brasswagen.mp3 + .json
python3 mix-initial-p-ep1.py     # sortie/initial-p-ep1.mp3 + .json
```

Copier le mp3 dans `public/audio/channel-pork/` et coller slides et sous-titres dans le programme du pack (`src/content/packs/porkos.ts`, champ `bande` pour une bande son complète). Pour un nouvel épisode, copier `mix-ftg-ep1.py` : le déroulé (`DEROULE`) liste répliques, bruitages, plans et scores dans l'ordre. Dépendances : numpy, scipy, ffmpeg (ou `pip install imageio-ffmpeg`).

## Reportage « DJ Fatbass à bord du Gras-Fond »

Reportage local des années 2000 d'après le script de l'utilisateur (ElevenLabs v4). DJ Fatbass / lieutenant Salamander (**Drew**) parle lentement, fatigué dès le début, sans surjouer, puis s'endort ; ses ronflements sont des prises v4 non verbales de la même voix. Le reporter (**Charlie**) pose ses questions sérieusement, micro trop près (effet de proximité, légère saturation). Le marin hors champ (**Fin**) est banal. Son : générique de magazine régional synthétisé, puis uniquement le bruit de bord (ventilation, tuyaux, chaudière, secteur), pings de sonar, trois secondes de techno-zouk synthétisée coupées au fader, silences gênants, coupe franche au noir en plein ronflement. Images fixes sans bandeau dans `public/tv/fatbass/`, mixage `scripts/channel-pork/mix-reportage-fatbass.py` (instruments dans `synthe.py`).

## Publicité d'État « Le répulsif à gobelins officiel »

D'après le script de l'utilisateur. Le fonctionnaire (**Michael**, v4) reste neutre, lent et appliqué, et n'avoue jamais la présence de Luis ; il prononce « goblins » à l'anglaise, d'où l'orthographe phonétique « gobeulin » / « gaubelin » dans les textes envoyés. Luis Fontanillas (**Giovanni**) est un opportuniste ordinaire et gourmand, étouffé dans le placard derrière. Son : néon qui grésille, sifflement de téléviseur cathodique, souffle de micro, bouteilles dans le placard, orgue bon marché de trois notes (synthétisé), mastication très audible, claquement de langue, coupe au noir sur un dernier bruit de mastication. Images dans `public/tv/repulsif/`, mixage `scripts/channel-pork/mix-pub-repulsif.py`.

## Génériques d'émission

Chaque émission ouvre sur un carton titre et un jingle (`scripts/channel-pork/generiques.py` : musique synthétisée dans `synthe.py`, cartons dans `public/tv/generiques/`). La voix d'antenne de Channel Pork est **Bill** (v4), sauf l'animé, annoncé par **Patrick**. Noms d'émission inventés pour la démo : « Gras Capital » (l'émission des startups d'Éric) et « Porc d'Attache » (le magazine local du reportage Fatbass). Les messages d'État s'ouvrent sur l'emblème de Porkonia : « Ce message vous est diffusé par le Ministère des Affaires Trop Compliquées » (nom de ministère tiré de Porkopédia, attribution du message inventée).

## Accent

Les voix v4 lisent parfois le français avec un accent québécois. Depuis octobre 2026, chaque texte envoyé commence par la balise `[standard Parisian French accent, …]` ; c'est une consigne de jeu, pas un réglage : le rendu n'est pas garanti, réécouter chaque prise.

## Annonce de prévention « Mangez gras. Bougez plus tard. »

D'après le script de l'utilisateur. Voix off douce et paternaliste (**Thomas**), le collègue (**Fin**), le fonctionnaire (**Michael**), mention légale débitée par **Bill**. Musique de campagne rassurante (guitare et petit piano synthétisés, `synthe.campagne`), continue, abaissée sous les deux courtes répliques ; fourchette, verres, ambiance extérieure de village ; petit accord final ; coupe nette. Générique : « Ce message vous est diffusé par le Ministère du Porc » (ministère de Porkopédia, attribution du message inventée). Images dans `public/tv/mangez-gras/`, mixage `scripts/channel-pork/mix-pub-mangez-gras.py`.

## « Les Dossiers d'Alvarez — Le Coup de Hamelot »

Magazine d'enquête d'après le script de l'utilisateur, qui raconte sa propre version du Coup de Hamelot (pas celle de Porkopédia). François Alvarez (**Joseph**) parle doucement, très sérieusement, et mange du gâteau ; Stanley Ferret (**Liam**) trouve tout raisonnable ; le maire sortant (**Jeremy**) est outré, et le corbeau restitue sa voix (bande étroite, vibrato de gorge) ; la greffière (**Emily**) ne montre rien ; régie (**Sam**) et agent (**Fin**) hors champ. Son : ronflement des CRT au plateau, bruit analogique sur les archives CCTV muettes, musique d'enquête très grave (`synthe.enquete`), appeau, corbeau, clé, toilettes brefs et secs, coups contre la porte, couverts et chopes, applaudissements étouffés, chasse d'eau, magnétophone, verre, bière, coupe nette. Générique avec le logo fourni par l'utilisateur (`scripts/channel-pork/logo-dossiers-alvarez.png`). Images dans `public/tv/alvarez/`, mixage `scripts/channel-pork/mix-dossiers-alvarez.py`.

## « Porc d'Attache — Une journée sans mentir »

D'après le script de l'utilisateur. Frédéric Legaigneur garde sa voix de « Ferme ta gueule et réponds » (**Callum**, désormais en v4) : il n'avoue jamais, il ajoute une précision. Le reporter du magazine « Porc d'Attache » (**Charlie**, celui du reportage Fatbass) pose les questions et dit la voix off, d'une diction neutre qui s'épuise. Générique de « Porc d'Attache » (jingle de magazine local), puis uniquement l'atelier : néon, ventilateur d'imprimante, papier, frigo de cuisine au premier plan, un vrai bip de chronomètre, moteur et bourrage d'imprimante. Aucun bip de censure. Coupe franche au milieu de « sans les mains ». Images dans `public/tv/fred-sans-mentir/`, mixage `scripts/channel-pork/mix-fred-sans-mentir.py`.

## « Cauchemar en Taverne — Au Fond du Fût »

Parodie de téléréalité d'après le script de l'utilisateur. Gordon Ramsgroin (**Clyde**) sec, impatient puis explosif, micro-cravate qui sature pendant les cris ; le patron (**Antoni**) parfaitement sérieux ; un client hors champ (**Sam**) ; voix off (**Matilda**). Son : couteau sur la planche, ventilation, porte, fourchette et verre, frigo (joint, moteur), eau, brosse, seau, tireuse et mousse qui déborde cinq secondes, gouttes, verre cassé hors champ, nappe de tension grave coupée pendant les silences, coupe franche puis logo sur noir. Générique avec le logo fourni (`scripts/channel-pork/logo-cauchemar-taverne.png`) et un jingle synthétisé (`synthe.jingle_taverne`). Images dans `public/tv/taverne/`, mixage `scripts/channel-pork/mix-cauchemar-taverne.py`.

Le Coup de Hamelot (« Les Dossiers d'Alvarez ») comporte aussi, à la demande de l'utilisateur, des bruits de chiasse derrière la porte des toilettes : de vrais enregistrements (`chiasse-*`, `pet-*`, `gargouillis` dans `sons/bruitages/`, licences dans `LICENCES.md`), montés en salves par `chiasse()` et à peine étouffés par la porte. Dans la version révisée, le maire sortant n'est jamais libéré : son interview se fait micro collé à la porte des toilettes (traitement `porte_itw`), et il s'interrompt au milieu d'une phrase pour laisser passer une salve.

## « Allô, Stéphane ? — Pris en charge »

Reportage de proximité d'après le script de l'utilisateur. Stéphane Tchimbakala Matoutou (**Landry**, voix partagée par son auteur dans la bibliothèque ElevenLabs, retenue par l'utilisateur ; aucune balise d'accent, aucun clonage) sincère et posé ; journaliste (**Will**) ; voix off sérieuse (**Brian**) ; transporteur au téléphone (**Paul**, passé en bande téléphonique) ; responsable du service (**Dave**). Son : frein de train, cochons, haut-parleur saturé, roues, porte, chaise, ventilateur du CRT, sonneries d'un téléphone filaire beige, combiné, stylo. Générique avec le logo fourni (`scripts/channel-pork/logo-allo-stephane.png`) et un jingle synthétisé (`synthe.jingle_allo` : trois notes, sonnerie, décroché). Images dans `public/tv/allo-stephane/`, mixage `scripts/channel-pork/mix-allo-stephane.py`. Les bandeaux à l'image sont rédigés pour l'émission.
