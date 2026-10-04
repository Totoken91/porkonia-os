# Première passe du donjon panoramique

Le rendu conserve la matière grunge du prototype : textures de pierre, sol et plafond originales, grain déterministe, filtrage bilinéaire des surfaces, tramage et palette terreuse sur 15 bits. Les ennemis gardent leurs sprites natifs 40 × 40, échantillonnés sans lissage.

La caméra passe d'environ 70° à 85° et de 224 × 168 à 320 × 180. Murs, sol, plafond et sprites utilisent la même focale pour conserver des proportions cohérentes. Le brouillard reste brun sombre, avec une atténuation plus progressive qui permet de lire les ouvertures à plusieurs cases.

Le décor ajoute des cadres de passage orientés dans le monde, pilastres ébréchés, niches, grilles, humidité et appliques. La pierre dispose de variantes pour limiter la répétition. Les cadres sont transparents au centre et ne modifient pas les collisions. Un tampon de profondeur par pixel règle les superpositions avec le sol et les ennemis.

Les torches sont placées aux passages, complétées par quelques appliques dispersées. La diffusion suit les cases ouvertes, avec interpolation de l'intensité : aucune lumière ne traverse directement un mur vers une pièce voisine. La composition utilise les coordonnées, sans consommer le hasard de partie ni modifier les cartes sauvegardées.

Sur PC, le jeu ouvre une fenêtre plus grande et regroupe les commandes sous la vue. Le mobile garde son interface tactile, avec une scène au format 16:9. Le parcours de vérification inclut une salle à piliers et un couloir sur la même carte, ainsi que le franchissement d'un cadre avec les commandes rapides.

`scripts/ordre-cochon/apercu-donjon.mjs` compare le moteur du commit 2e19a19 et le nouveau moteur à carte, caméra et temps identiques. Les vues sont dessinées à leur résolution native, puis affichées à l'échelle 2 sans lissage. La mesure locale sur trente images situe le nouveau rendu autour de 7–11 ms par image dans Chromium sur le poste de développement ; elle ne prédit pas les performances d'un téléphone physique.

La première proposition trop nette a été abandonnée : ses joints noirs, ses surfaces plates et sa palette olive effaçaient le grunge. Les fonctions originales de dessin de la pierre, du sol et du plafond ont été reprises, et les nouveaux encadrements ont reçu une palette et un grain assortis.

La seconde itération ajoute des creux, fissures et éclats dessinés à la résolution native des textures, des pieds de murs humides et de la suie derrière les torches. Leur teinte chaude est plus discrète. Les volumes de salle sont détectés puis reçoivent un thème commun : saloir, réserve, humidité ou pierre nue. Les couloirs conservent leur décor local. Ces choix restent purement visuels et déterministes.

Cette étape enrichit les cartes existantes. Elle ne réalise pas encore une campagne de douze étages conçus à la main ni une géométrie 3D à étages superposés.
