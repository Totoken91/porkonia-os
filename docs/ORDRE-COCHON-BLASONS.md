# Blasons des douze chevaliers

32 × 32 pixels natifs, RGBA binaire, bordure commune en bronze usé. Affichage du choix à 64 × 64 en nearest-neighbor ; livre de compétences à 32 × 32. Les trois champs sont vert sombre, lie-de-vin et bleu ardoise.

Sources éditables : `scripts/ordre-cochon/blasons.py` construit le cadre ; `blasons_charges.py` contient les douze matrices, avec exactement un caractère par pixel. Régénération : `python scripts/ordre-cochon/blasons.py [dossier-de-planche]`.

| Chevalier | Charge |
| --- | --- |
| Berthe | Hure d'or de profil, crinière et défense |
| Gaspard | Couvercle portant une hure de face |
| Odette | Trois fûts cerclés |
| Anselme | Bouquet de trois clous d'argent |
| Roseline | Rose sur aiguille d'argent |
| Colin | Deux lames croisées, gardes d'or |
| Agathe | Dague au serpent vermillon |
| Marin | Corbeau d'argent, serres d'or |
| Héloïse | Trois cristaux de sel facettés |
| Basile | Coupe à la lie, vapeur et pied d'or |
| Ysée | Boyau-serpent traversé d'un os |
| Théobald | Aile d'argent et souffle d'or |

Après inspection, les premières versions ont été rejetées : contours noirs trop lourds, objets d'inventaire sans silhouette héraldique, formes ambiguës et détails perdus à taille réelle. Les motifs ont été reconstruits en grandes masses, puis les fûts, le couvercle, le serpent et l'aile ont été repris individuellement. Le cadre a été conservé.

Ressources consultées : [Cure, The Pixel Art Tutorial](https://pixeljoint.com/forum/forum_posts.asp?TID=11299), notamment les sections sur les clusters, le bruit et les palettes limitées ; [Saint11, Pixel Art Tutorials](https://saint11.art/blog/pixel-art-tutorials/). Les dessins sont originaux et ne reprennent pas leurs assets.
