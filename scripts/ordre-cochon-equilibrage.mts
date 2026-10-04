import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { simulerCombat, type Situation } from "./ordre-cochon/simulation";
import { budgetsXpEtages, buildReference, degatsRpg, ennemiReference, niveauDepuisXp, statsRpg, xpNiveauRpg, type ClasseRpg, type Rangs } from "../src/apps/jambonjon/equilibrage";

const classes: ClasseRpg[] = ["tank", "dps", "jambonmancien"];
const situations: Situation[] = ["duel", "blinde", "elite", "groupe", "couloir", "boss"];
const paliers = [[1, 1], [5, 3], [10, 6], [15, 9], [20, 12]] as const;
const rows = [];
let simulations = 0;
for (const [niveau, etage] of paliers) for (const classe of classes) for (const situation of situations) {
  if (situation === "boss" && niveau === 1) continue;
  const combats = Array.from({ length: 64 }, (_, i) => simulerCombat({ classe, niveau, etage, situation, graine: i + 1 }));
  simulations += combats.length;
  const moyenne = (valeur: (r: typeof combats[number]) => number) => Number((combats.reduce((a, r) => a + valeur(r), 0) / combats.length).toFixed(2));
  const actions: Record<string, number> = {};
  combats.forEach((r) => Object.entries(r.actions).forEach(([k, n]) => { actions[k] = (actions[k] ?? 0) + n; }));
  rows.push({ niveau, etage, classe, situation, victoires: combats.filter((r) => r.victoire).length, essais: combats.length, tours: moyenne((r) => r.tours), pertePvPourcent: moyenne((r) => r.pvPerdus / r.pvMax * 100), mousseDepensee: moyenne((r) => r.mousseDepensee), mousseFin: moyenne((r) => r.mousseFin), actions });
}
const base = paliers.flatMap(([niveau, etage]) => classes.map((classe) => {
  const stats = statsRpg(classe, niveau, etage);
  const ennemi = ennemiReference(niveau, "courant");
  const coefficient = classe === "jambonmancien" ? 0.9 : 1;
  const coups = Math.ceil(ennemi.pvMax / degatsRpg(stats.puissance, ennemi.defense, coefficient));
  return { niveau, classe, ...stats, coupsSimplesCourant: coups, rangs: buildReference(niveau) };
}));
const sensibilite = classes.flatMap((classe) => ["normal", "sans-mousse", "sans-actives", "delais-longs"].map((variante) => {
  const r = simulerCombat({ classe, niveau: 20, etage: 12, situation: "boss", graine: 17, mousseInitiale: variante === "sans-mousse" ? 0 : undefined, simpleSeulement: variante === "sans-actives", delaisSupplementaires: variante === "delais-longs" ? 2 : 0 });
  return { classe, variante, ...r };
}));
const xpTotal = Array.from({ length: 19 }, (_, i) => xpNiveauRpg(i + 1)).reduce((a, n) => a + n, 0);
const ressources = paliers.map(([niveau, etage]) => {
  const s = statsRpg("jambonmancien", niveau, etage);
  let mousse = s.mousseMax, bieres = 0, victoires = 0;
  for (let i = 0; i < 10; i++) {
    // Isolation de l'économie de mousse : PV remis à plein, mousse conservée, bière entre les duels.
    if (mousse < 15) { mousse = Math.min(s.mousseMax, mousse + 40); bieres++; }
    const r = simulerCombat({ classe: "jambonmancien", niveau, etage, situation: "duel", graine: i + 1, mousseInitiale: mousse });
    mousse = r.mousseFin; if (r.victoire) victoires++;
  }
  return { niveau, duels: 10, victoires, bieres, mousseFin: mousse, limite: "PV remis à plein ; bière hors combat. Ne valide pas la survie sur un étage." };
});
const buildsAlternatifs: Record<ClasseRpg, Rangs[]> = {
  tank: [[5, 5, 3, 5, 1, 1], [5, 3, 3, 1, 5, 3]],
  dps: [[5, 5, 1, 5, 3, 1], [3, 3, 5, 3, 3, 3]],
  jambonmancien: [[5, 3, 1, 5, 3, 3], [3, 5, 1, 5, 1, 5]],
};
const builds = classes.flatMap((classe) => buildsAlternatifs[classe].map((rangs, i) => {
  const combats = Array.from({ length: 64 }, (_, graine) => simulerCombat({ classe, niveau: 20, etage: 12, situation: "boss", graine: graine + 1, rangs }));
  return { classe, variante: i, rangs, victoires: combats.filter((r) => r.victoire).length, essais: combats.length, tours: Number((combats.reduce((a, r) => a + r.tours, 0) / combats.length).toFixed(2)) };
}));
const rapport = { modele: "Abstrait : positions relatives, pas le moteur du jeu. Sans innées, consommables, soins externes ni objets rares. Tous les combats commencent à pleine vie et pleine mousse sauf sensibilité. Ne valide ni une campagne complète ni le plaisir de jeu.", simulations, base, rows, sensibilite, ressources, builds, xp: { totalNiveau20: xpTotal, budgetsEtages: budgetsXpEtages(), exploration90Pourcent: niveauDepuisXp(xpTotal * 0.9), exploration80Pourcent: niveauDepuisXp(xpTotal * 0.8) } };
const dossier = resolve(process.argv[2] ?? "work/ordre-cochon-equilibrage");
mkdirSync(dossier, { recursive: true });
writeFileSync(resolve(dossier, "resultats.json"), JSON.stringify(rapport, null, 2) + "\n");
const lignes = rows.map((r) => `| ${r.niveau} | ${r.classe} | ${r.situation} | ${r.victoires}/${r.essais} | ${r.tours} | ${r.pertePvPourcent}% | ${r.mousseDepensee} |`);
writeFileSync(resolve(dossier, "combats.md"), ["# Calibration des combats", "", rapport.modele, "", `${simulations} simulations, 64 graines par configuration. Dégâts variant de ±10 %, sans critiques.`, "", "| Niveau | Classe | Situation | Victoires | Tours moyens | PV perdus | Mousse dépensée brute |", "| --- | --- | --- | --- | --- | --- | --- |", ...lignes, "", "La dépense brute ne soustrait pas Fermentation et Réserve de lie. Voir resultats.json pour les réserves finales, les builds et la fréquence des actions.", ""].join("\n"));
console.log(JSON.stringify({ simulations, echecs: rows.filter((r) => r.victoires < r.essais).map(({ niveau, classe, situation, victoires }) => ({ niveau, classe, situation, victoires })), builds, ressources, xp: rapport.xp }, null, 2));
