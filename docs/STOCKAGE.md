# Poids publié et historique Vercel

Mesures du 7 octobre 2026, sur l'export statique local. Les bundles de fonctions du build Vercel ne sont pas compris dans ces valeurs.

| Mesure | Avant | Après |
| --- | ---: | ---: |
| Médias publics | 92,30 Mio | 87,18 Mio |
| Export complet | 94,93 Mio | 89,81 Mio |

Les huit grands PNG du portail, de la banque et de Porkomazon sont désormais des WebP **sans perte**. Les dimensions et chaque pixel RGBA, y compris la transparence, ont été comparés avec les originaux. Gain : 3,91 Mio. L'emblème original de montage (1,20 Mio), inutilisé par le navigateur, est conservé dans `scripts/channel-pork/assets/` au lieu de `public/`. Les voix, musiques, sprites et photos Porkopédia restent inchangés.

Pour recompresser un PNG régénéré, lancer `python scripts/optimiser-medias.py` avec Pillow installé. Le script vérifie tous les pixels avant remplacement et ne touche qu'à sa liste explicite de grands médias. Les sources initiales restent récupérables dans Git.

## Le graphique de stockage Vercel

Le poids d'un export n'est pas le total du projet dans Usage. [Deployment Storage](https://vercel.com/docs/deployment-storage) compte les sorties des déploiements conservés ; Functions Storage compte aussi les bundles de fonctions dans leurs régions. Chaque version retenue peut ajouter du stockage. Réduire les médias agit sur les nouveaux déploiements, sans supprimer le stockage des versions antérieures.

Pour le principal gain, examiner les anciens déploiements du projet `porkos`, conserver la production actuelle et les versions nécessaires au retour arrière, puis supprimer les versions devenues inutiles. Régler ensuite la rétention dans **Settings → Security → Deployment Retention Policy**, uniquement sur ce projet. [Guide officiel](https://vercel.com/docs/deployment-storage/optimize). Le tableau Usage peut refléter le changement avec un délai, et les exceptions de rétention protègent notamment des versions récentes et des alias actifs.

L'API connectée a permis d'identifier le projet mais a refusé (403) la lecture détaillée de ses déploiements et de sa configuration dans l'équipe `totoken`. Aucun déploiement existant ni aucune politique de rétention n'a été supprimé ou modifié lors de cet allègement.
