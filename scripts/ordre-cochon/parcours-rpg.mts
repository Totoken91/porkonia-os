/** Pilote de vérification sur les vraies cartes. Omniscient, donc pas une mesure de difficulté humaine. */
import { porkosPack } from "../../src/content/packs/porkos";
import { distances, emplacementDe, jouer, nouvellePartie, passable, stats, type Action, type Partie } from "../../src/apps/jambonjon/logic";
import { coefficients, rangMaximum } from "../../src/apps/jambonjon/equilibrage";
import { disponible, ligne } from "../../src/apps/jambonjon/rpg";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const jeu = porkosPack.jambonjon;
const dx = [0, 1, 0, -1], dy = [-1, 0, 1, 0];
const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function parcours(id: string, graine: number) {
  let p = nouvellePartie(jeu, graine, id), actions = 0;
  const trace: object[] = [];
  const agir = (a: Action) => { p = jouer(p, jeu, a); actions++; if (a.type !== "tournerD" && a.type !== "apprendre") { trace.push({ a, tour: p.tour, niveau: p.joueur.niveau, pv: p.joueur.pv, jambons: p.joueur.jambons, r: p.joueur.rpg!.rangs, ennemis: p.monstres.filter((m) => m.eveille).map((m) => ({ type: m.type, pv: m.pv, distance: manhattan(m, p.joueur) })) }); if (trace.length > 20) trace.shift(); } };
  while (!p.fin && actions < 3000) {
    const j = p.joueur, r = j.rpg!;
    if (r.points) {
      const ordre = [0, 1, 2, 3, 4, 5].filter((i) => r.rangs[i]! < rangMaximum(j.niveau, i)).sort((a, b) => Number(r.rangs[a]! > 0) - Number(r.rangs[b]! > 0) || r.rangs[a]! - r.rangs[b]!);
      if (ordre.length) { agir({ type: "apprendre", competence: ordre[0]! }); continue; }
    }
    for (const o of [...j.sac]) {
      const place = emplacementDe(jeu, o), ancien = p.joueur.equipe[place];
      const poids = (n: typeof o) => n.att * 3 + n.def * 2 + n.pv * 0.15 + n.mousse * 0.15;
      if (!ancien || poids(o) > poids(ancien)) agir({ type: "equiper", uid: o.uid });
    }
    const maintenant = p.joueur, s = stats(maintenant);
    const annonce = p.monstres.some((m) => m.rpg?.annonce?.x === maintenant.x && m.rpg.annonce.y === maintenant.y);
    if (annonce && !(r.classe === "tank" && disponible(p, 0))) {
      const possible = [0, 1, 2, 3].filter((dir) => passable(p.carte, maintenant.x + dx[dir]!, maintenant.y + dy[dir]!) && !p.monstres.some((m) => m.x === maintenant.x + dx[dir]! && m.y === maintenant.y + dy[dir]!));
      if (possible.length) { const dir = possible[0]!; agir({ type: (dir === maintenant.dir ? "avancer" : dir === (maintenant.dir + 2) % 4 ? "reculer" : dir === (maintenant.dir + 1) % 4 ? "droite" : "gauche") }); continue; }
    }
    if ((maintenant.pv < s.pvMax * 0.5 || maintenant.faim < 15) && maintenant.jambons > 0) { agir({ type: "manger" }); continue; }
    if (r.classe === "jambonmancien" && maintenant.mousse < 15 && maintenant.bieres > 0) { agir({ type: "boire" }); continue; }
    const voisins = p.monstres.filter((m) => manhattan(m, maintenant) === 1).sort((a, b) => a.pv - b.pv);
    let cible = voisins[0];
    if (!cible && r.classe === "jambonmancien") {
      cible = p.monstres.find((m) => manhattan(m, maintenant) <= 2 && (m.x === maintenant.x || m.y === maintenant.y) && passable(p.carte, (m.x + maintenant.x) / 2, (m.y + maintenant.y) / 2));
    }
    if (cible) {
      const dir = cible.x > maintenant.x ? 1 : cible.x < maintenant.x ? 3 : cible.y > maintenant.y ? 2 : 0;
      while (p.joueur.dir !== dir) agir({ type: "tournerD" });
      const devant = ligne(p, r.classe === "jambonmancien" ? 2 : 1)[0];
      if (!devant) { agir({ type: "attendre" }); continue; }
      const c = coefficients(r.classe, r.rangs);
      if (r.classe === "tank") {
        const slot = annonce && disponible(p, 0) ? 0 : voisins.length > 1 && disponible(p, 2) ? 2 : disponible(p, 0) ? 0 : disponible(p, 1) ? 1 : disponible(p, 2) ? 2 : -1;
        agir(slot >= 0 ? { type: "competence", slot } : { type: "agir" });
      } else if (r.classe === "dps") {
        const slot = devant.pv <= devant.pvMax * c.seuilExecution && disponible(p, 2) ? 2 : disponible(p, 0) ? 0 : disponible(p, 1) ? 1 : -1;
        agir(slot >= 0 ? { type: "competence", slot } : { type: "agir" });
      } else {
        const slot = devant.pv <= s.att * 0.7 ? -1 : devant.rpg?.malediction && disponible(p, 2) ? 2 : !devant.rpg?.malediction && disponible(p, 0) ? 0 : voisins.length && disponible(p, 1) ? 1 : -1;
        agir(slot >= 0 ? { type: "competence", slot } : { type: "agir" });
      }
      continue;
    }
    // Laisser venir un adversaire déjà alerté évite de lui offrir une frappe en entrant au contact.
    if (p.monstres.some((m) => m.eveille && manhattan(m, maintenant) === 2 && (m.x === maintenant.x || m.y === maintenant.y) && passable(p.carte, (m.x + maintenant.x) / 2, (m.y + maintenant.y) / 2))) { agir({ type: "attendre" }); continue; }
    const dist = distances(p.carte, maintenant.x, maintenant.y);
    const besoin = p.sol.filter((s) => s.butin.type === "jambon" ? maintenant.jambons === 0 : s.butin.type === "biere" && r.classe === "jambonmancien" && maintenant.bieres === 0);
    const actifs = p.monstres.filter((m) => m.eveille);
    const candidats = besoin.length ? besoin : actifs.length ? actifs : p.monstres.length ? p.monstres : p.sol.filter((s) => s.butin.type !== "objet" || p.joueur.sac.length < 12);
    const but = [...candidats].sort((a, b) => dist[a.y * p.carte.w + a.x]! - dist[b.y * p.carte.w + b.x]!)[0];
    const escalier = p.carte.cases.indexOf(2);
    const x = but?.x ?? escalier % p.carte.w, y = but?.y ?? Math.floor(escalier / p.carte.w);
    if (x === maintenant.x && y === maintenant.y) {
      if (!but) agir({ type: "agir" });
      else if (p.joueur.sac.length < 12 || but === besoin[0]) agir({ type: "ramasser" });
      else { const objet = p.joueur.sac[0]!; agir({ type: "jeter", uid: objet.uid }); }
      continue;
    }
    const vers = distances(p.carte, x, y);
    const dirs = [0, 1, 2, 3].filter((dir) => passable(p.carte, maintenant.x + dx[dir]!, maintenant.y + dy[dir]!)).sort((a, b) => vers[(maintenant.y + dy[a]!) * p.carte.w + maintenant.x + dx[a]!]! - vers[(maintenant.y + dy[b]!) * p.carte.w + maintenant.x + dx[b]!]!);
    while (p.joueur.dir !== dirs[0]) agir({ type: "tournerD" });
    agir({ type: "avancer" });
  }
  return { chevalier: id, graine, fin: p.fin, etage: p.etage, niveau: p.joueur.niveau, tours: p.tour, actions, tues: p.tues, pv: p.joueur.pv, jambons: p.joueur.jambons, bieres: p.joueur.bieres, ...(p.fin !== "victoire" ? { trace } : {}) };
}
const resultats = jeu.rpg!.chevaliers.flatMap((c) => [11, 42, 123].map((graine) => parcours(c.id, graine)));
const dossier = resolve(process.argv[2] ?? "work/ordre-cochon-equilibrage"); mkdirSync(dossier, { recursive: true });
writeFileSync(resolve(dossier, "parcours-reels.json"), JSON.stringify({ modele: "Pilote omniscient. Cinq étages actuels. Ne prouve pas la difficulté humaine ni celle des douze étages futurs.", resultats }, null, 2));
console.log(JSON.stringify({ victoires: resultats.filter((r) => r.fin === "victoire").length, total: resultats.length, echecs: resultats.filter((r) => r.fin !== "victoire").map(({ chevalier, graine, etage, niveau, fin }) => ({ chevalier, graine, etage, niveau, fin })) }, null, 2));


