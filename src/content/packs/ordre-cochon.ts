/** Créations originales validées pour le jeu ; aucune attribution à Porkopédia. */
export const ordreCochon = {
  chevaliers: [
    { id: "berthe", nom: "Berthe du Billot", classe: "tank", histoire: "Ancienne équarrisseuse. Une porte fermée est une erreur de menuiserie.", innee: "Coincé, c’est cuit", effet: "Frappe renforcée contre les murs et les ennemis indéplaçables." },
    { id: "gaspard", nom: "Gaspard du Couvercle", classe: "tank", histoire: "Porte un couvercle de marmite. Refuse d’en donner la contenance.", innee: "Ça résonne", effet: "Une riposte touche aussi un autre ennemi adjacent." },
    { id: "odette", nom: "Odette des Trois Fûts", classe: "tank", histoire: "Aucun de ses convois n’a perdu de bière. Quelques escortes ont disparu.", innee: "Cul sec", effet: "Boire protège pendant la phase ennemie du même tour." },
    { id: "anselme", nom: "Anselme le Clouté", classe: "tank", histoire: "Répare son armure avec les clous des cercueils adverses.", innee: "Mauvaise prise", effet: "Renvoie une part du premier coup de mêlée de chaque ennemi." },
    { id: "roseline", nom: "Roseline Taillefine", classe: "dps", histoire: "Couturière des tabards. Laisse une ouverture exactement où elle frappe.", innee: "Point de côté", effet: "Un pas latéral près d’un ennemi prépare une frappe qui perce l’armure." },
    { id: "colin", nom: "Colin Deux-Couteaux", classe: "dps", histoire: "A commencé avec un couteau. Refuse d’expliquer le second.", innee: "Le deuxième est pour toi", effet: "Si la première entaille tue, la seconde frappe un voisin accessible." },
    { id: "agathe", nom: "Agathe Courte-Lame", classe: "dps", histoire: "Ancienne garde de banquet, spécialiste des disputes sous les tables.", innee: "Au contact", effet: "Esquiver une attaque annoncée prépare une frappe qui fait saigner." },
    { id: "marin", nom: "Marin Sans-Reste", classe: "dps", histoire: "Nettoyait les cuisines. Les caves avaient davantage de travail.", innee: "Fin de service", effet: "Une élimination donne un petit bouclier pour la phase ennemie suivante." },
    { id: "heloise", nom: "Héloïse du Saloir", classe: "jambonmancien", histoire: "Date une cave en goûtant le mur. Personne ne lui a demandé de continuer.", innee: "Sel jusqu’à l’os", effet: "Frapper une cible déjà blessée peut la maudire une fois." },
    { id: "basile", nom: "Basile Fond-de-Cuve", classe: "jambonmancien", histoire: "Ancien brasseur. Le dépôt est, selon lui, la meilleure partie.", innee: "Dernière gorgée", effet: "Boire réduit le coût du prochain sort." },
    { id: "ysee", nom: "Ysée du Boyau", classe: "jambonmancien", histoire: "Recoud les enveloppes de saucisse et les trajectoires des projectiles.", innee: "Fil d’os", effet: "Le projectile gratuit traverse sa première cible pour toucher la suivante." },
    { id: "theobald", nom: "Théobald l’Éventé", classe: "jambonmancien", histoire: "Banni de trois celliers pour « courant d’air non sollicité ».", innee: "Reflux", effet: "Repousse une fois un ennemi qui vient d’arriver au contact." },
  ],
  competences: {
    tank: [
      { nom: "Garde-baffe", effet: "Frappe et protège pendant la prochaine phase ennemie." },
      { nom: "Rancune", effet: "Les dégâts absorbés chargent la prochaine frappe." },
      { nom: "Coup de butoir", effet: "Frappe et repousse. Contre un mur, inflige un supplément." },
      { nom: "Grand revers", effet: "Frappe devant et sur les côtés, en perçant l’armure." },
      { nom: "Tenir la porte", effet: "Frapper une cible repoussée soigne une fois par ennemi." },
      { nom: "Inébranlable", effet: "Une riposte chargée conserve une partie de la protection." },
    ],
    dps: [
      { nom: "Double entaille", effet: "Deux frappes rapides sur la cible devant toi." },
      { nom: "Plaie ouverte", effet: "Double entaille applique un saignement court." },
      { nom: "Pas de côté", effet: "Frappe puis décale-toi. Sans place, feinte sur place." },
      { nom: "Mise à mort", effet: "Coup renforcé sur une cible affaiblie. Une mort réduit les délais." },
      { nom: "Dans l’ouverture", effet: "Pas de côté prépare une frappe renforcée sur sa cible." },
      { nom: "Encore un", effet: "Une exécution prépare un saignement sur la prochaine cible." },
    ],
    jambonmancien: [
      { nom: "Sel noir", effet: "Frappe à deux cases et pose une malédiction." },
      { nom: "Fermentation", effet: "Le projectile gratuit rend de la mousse sur une cible maudite." },
      { nom: "Rot d’État", effet: "Onde devant toi, jusqu’à trois cases. Frappe et repousse." },
      { nom: "Éclatement", effet: "Explosion autour de la cible. Consomme sa malédiction pour plus de dégâts." },
      { nom: "Contamination", effet: "Une élimination par explosion transmet la malédiction à un voisin." },
      { nom: "Réserve de lie", effet: "Consommer une malédiction rembourse une partie d’Éclatement." },
    ],
  },
} as const;
