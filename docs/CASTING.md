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

Voix secondaires : chauffeur de salle **George** (crie au public), homme du public **Sam** (lance des vannes), jury **Daniel** (sec, ennuyé). Narrateur de la pub Brasswagen : **Bill**.

Découpage prévu : épisode 1 = introduction et questions 1 à 3 (en ligne) ; épisode 2 = questions 4 à 8 ; épisode 3 = questions 9 à 12 et finale.

## Pub Brasswagen Palou

Pub auto façon années 90 : la petite voiture violette aux pare-chocs cuivrés, compteur « 1 000 000 000 porkomètres ». Tonio y témoigne avec ses lapsus. Slogans : « Elle ne s'arrête pas. Elle se repose en roulant. », « Brasswagen. Et toujours plus de route. ». Mention légale débitée vite : partenaire officiel du jeu, « Kilométrage non contractuel. Route non fournie. »

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

```
cd scripts/channel-pork
python3 mix-ftg-ep1.py           # sortie/ftg-ep1.mp3 + ftg-ep1.json
python3 programme.py sortie/ftg-ep1.json > /tmp/prog.txt   # slides et sous-titres pour le pack
python3 mix-pub-brasswagen.py    # sortie/pub-brasswagen.mp3 + .json
```

Copier le mp3 dans `public/audio/channel-pork/` et coller slides et sous-titres dans le programme du pack (`src/content/packs/porkos.ts`, champ `bande` pour une bande son complète). Pour un nouvel épisode, copier `mix-ftg-ep1.py` : le déroulé (`DEROULE`) liste répliques, bruitages, plans et scores dans l'ordre. Dépendances : numpy, scipy, ffmpeg (ou `pip install imageio-ffmpeg`).
