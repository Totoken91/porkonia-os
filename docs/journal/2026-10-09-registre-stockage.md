# Registre du stockage et tri de la documentation

**Problème.** Depuis les comptes locaux, chaque donnée conservée devait penser à trois choses à la main : suffixer sa clé
par le profil (une douzaine d'endroits, en chaînes tapées), figurer dans la liste de reprise des anciennes sauvegardes
(`comptes.ts`), et se vider au changement de profil. Un oubli suffisait à partager des données entre profils ou à perdre
une sauvegarde à la reprise, sans qu'aucun test ne le voie.

**Choix.**
- `src/os/stockage.ts` déclare toutes les données (base, portée poste/profil, pack, hôte, situation avant les comptes).
  Les clés produites sont identiques aux anciennes : aucune migration, aucune sauvegarde à déplacer.
- La reprise (`clesHeritage`, `clesHistoriques`) se déduit du registre au lieu d'une liste recopiée.
  `porkos.sessions.<pack>.citoyen` compte désormais aussi pour proposer la reprise (il manquait).
- `tests/stockage.test.ts` fige les formes historiques et refuse toute chaîne `porkos.…` écrite hors du registre.
- Le changement de profil reste à la charge des magasins de module (`surProfil`) ; c'est documenté plutôt qu'automatisé,
  les deux magasins concernés ayant des besoins différents.
- `docs/` : index `docs/README.md`, guides à la racine, notes de livraison dans `docs/journal/`. `STOCKAGE.md`
  (poids des déploiements Vercel) devient `POIDS-PUBLIE.md` pour ne plus se confondre avec le stockage du navigateur.
- `AGENTS.md`, lu par Codex comme par Claude, reçoit les deux règles (registre, documentation) après le bloc géré par Next.

**Validation.** Typecheck, 317 tests unitaires (dont le nouveau garde, vérifié en y glissant une clé piège), build, et
les cinq parcours navigateur : comptes (création, reprise d'une sauvegarde antérieure, isolation des profils), parcours
complet, PigNet, L'Ordre Cochon, Course de Grosses.
