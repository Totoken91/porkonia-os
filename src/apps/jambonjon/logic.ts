/**
 * Jambonjon : exploration de caves d'affinage, case par case, au tour par tour. Logique pure et déterministe :
 * l'état est un objet JSON (sauvegardable) qui garde son propre tirage aléatoire ; chaque action rend un nouvel état.
 * Les textes ne sont pas ici : le journal ne contient que des clés du pack (`jbj.msg.*`) et leurs variables.
 */
import type { Emplacement, JeuJambonjon, MonstreDef, ObjetDef } from "@/content/types";

export const VERSION = 1;

/* --------------------------------- Hasard --------------------------------- */

/** mulberry32, état conservé dans la partie. */
function tirer(g: { alea: number }): number {
  g.alea = (g.alea + 0x6d2b79f5) >>> 0;
  let t = g.alea;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entre = (g: { alea: number }, a: number, b: number) => a + Math.floor(tirer(g) * (b - a + 1));
const parmi = <T,>(g: { alea: number }, xs: readonly T[]): T => xs[Math.floor(tirer(g) * xs.length)]!;

/* --------------------------------- Carte ---------------------------------- */

export const MUR = 1;
export const SOL = 0;
export const ESCALIER = 2;

/** Directions : 0 nord (y−1), 1 est, 2 sud, 3 ouest. */
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

export interface Carte {
  w: number;
  h: number;
  cases: number[];
  /** Cases déjà vues (carte automatique). */
  vu: boolean[];
  /** Variante de décor des murs (0 pierre, 1 jambons pendus, 2 tonneaux), par case. */
  decor: number[];
}

export const idx = (c: { w: number }, x: number, y: number) => y * c.w + x;
export const dans = (c: Carte, x: number, y: number) => x >= 0 && y >= 0 && x < c.w && y < c.h;
export const caseEn = (c: Carte, x: number, y: number) => (dans(c, x, y) ? c.cases[idx(c, x, y)]! : MUR);
export const passable = (c: Carte, x: number, y: number) => caseEn(c, x, y) !== MUR;

/**
 * Labyrinthe sur grille impaire (backtracker récursif), puis quelques murs ouverts pour créer des boucles
 * et des salles carrées : un vrai dédale, mais pas un couloir unique.
 */
export function genererCarte(g: { alea: number }, cellules: number): Carte {
  const w = cellules * 2 + 1;
  const h = w;
  const cases = new Array<number>(w * h).fill(MUR);
  const pile: [number, number][] = [[1, 1]];
  cases[idx({ w }, 1, 1)] = SOL;
  while (pile.length) {
    const [x, y] = pile[pile.length - 1]!;
    const voisins = [0, 1, 2, 3].filter((d) => {
      const nx = x + DX[d]! * 2;
      const ny = y + DY[d]! * 2;
      return nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && cases[idx({ w }, nx, ny)] === MUR;
    });
    if (!voisins.length) {
      pile.pop();
      continue;
    }
    const d = parmi(g, voisins);
    cases[idx({ w }, x + DX[d]!, y + DY[d]!)] = SOL;
    cases[idx({ w }, x + DX[d]! * 2, y + DY[d]! * 2)] = SOL;
    pile.push([x + DX[d]! * 2, y + DY[d]! * 2]);
  }
  // Boucles : on perce des murs séparant deux couloirs.
  const percees = Math.floor(cellules * cellules * 0.08);
  for (let k = 0; k < percees * 6 && k < 4000; k++) {
    const x = entre(g, 1, w - 2);
    const y = entre(g, 1, h - 2);
    if (cases[idx({ w }, x, y)] !== MUR) continue;
    const horiz = cases[idx({ w }, x - 1, y)] === SOL && cases[idx({ w }, x + 1, y)] === SOL && cases[idx({ w }, x, y - 1)] === MUR && cases[idx({ w }, x, y + 1)] === MUR;
    const vert = cases[idx({ w }, x, y - 1)] === SOL && cases[idx({ w }, x, y + 1)] === SOL && cases[idx({ w }, x - 1, y)] === MUR && cases[idx({ w }, x + 1, y)] === MUR;
    if (horiz || vert) cases[idx({ w }, x, y)] = SOL;
  }
  // Salles : caves d'affinage de 3×3 ou 5×3.
  const salles = 1 + Math.floor(cellules / 5);
  for (let k = 0; k < salles; k++) {
    const sw = parmi(g, [3, 3, 5]);
    const sh = 3;
    const x0 = entre(g, 1, w - 1 - sw);
    const y0 = entre(g, 1, h - 1 - sh);
    for (let y = y0; y < y0 + sh; y++) for (let x = x0; x < x0 + sw; x++) cases[idx({ w }, x, y)] = SOL;
  }
  const decor = cases.map(() => {
    const r = tirer(g);
    return r < 0.1 ? 1 : r < 0.18 ? 2 : 0;
  });
  return { w, h, cases, vu: cases.map(() => false), decor };
}

/** Distances de marche depuis une case (−1 : inaccessible). */
export function distances(c: Carte, x0: number, y0: number): number[] {
  const d = new Array<number>(c.w * c.h).fill(-1);
  const file: number[] = [idx(c, x0, y0)];
  d[file[0]!] = 0;
  for (let i = 0; i < file.length; i++) {
    const p = file[i]!;
    const x = p % c.w;
    const y = Math.floor(p / c.w);
    for (let k = 0; k < 4; k++) {
      const nx = x + DX[k]!;
      const ny = y + DY[k]!;
      if (!passable(c, nx, ny)) continue;
      const q = idx(c, nx, ny);
      if (d[q] !== -1) continue;
      d[q] = d[p]! + 1;
      file.push(q);
    }
  }
  return d;
}

/* -------------------------------- Objets ---------------------------------- */

export interface Objet {
  uid: number;
  base: string;
  /** Niveau de l'objet (étage où il a été trouvé). */
  niveau: number;
  rarete: string;
  att: number;
  def: number;
  pv: number;
  mousse: number;
}

export type Butin = { type: "jambon" } | { type: "biere" } | { type: "objet"; objet: Objet };

export interface AuSol {
  x: number;
  y: number;
  butin: Butin;
  /** Tonneau fermé : on l'ouvre en avançant dessus. */
  tonneau?: boolean;
}

/* ------------------------------- Monstres --------------------------------- */

export interface Monstre {
  uid: number;
  type: string;
  niveau: number;
  elite: boolean;
  boss: boolean;
  x: number;
  y: number;
  pv: number;
  pvMax: number;
  att: number;
  def: number;
  xp: number;
  eveille: boolean;
  /** Tours d'étourdissement (rot d'État). */
  sonne: number;
}

/* -------------------------------- Partie ---------------------------------- */

export interface Joueur {
  x: number;
  y: number;
  dir: number;
  niveau: number;
  xp: number;
  pv: number;
  mousse: number;
  /** Satiété, 0–100 : à zéro, la faim ronge les PV. */
  faim: number;
  /** Tours d'ivresse restants : plus fort, moins adroit. */
  ivresse: number;
  jambons: number;
  bieres: number;
  sac: Objet[];
  equipe: Partial<Record<Emplacement, Objet>>;
}

export interface Message {
  cle: string;
  vars?: Record<string, string | number>;
}

export interface Partie {
  version: number;
  alea: number;
  etage: number;
  carte: Carte;
  joueur: Joueur;
  monstres: Monstre[];
  sol: AuSol[];
  journal: Message[];
  tour: number;
  prochainUid: number;
  fin: null | "mort" | "victoire";
  /** Statistiques de fin de partie. */
  tues: number;
  /** Ce qui vient de se passer, pour les effets (son, secousse, éclair). */
  evenements: string[];
}

export const SAC_MAX = 12;
export const ROT_COUT = 30;
export const EMPLACEMENTS: Emplacement[] = ["arme", "armure", "tete", "breloque"];

/** XP pour passer au niveau suivant. */
export const xpPourNiveau = (n: number) => Math.round(20 * Math.pow(n, 1.5));

/** Caractéristiques totales (base de niveau + équipement + ivresse). */
export function stats(j: Joueur) {
  const eq = Object.values(j.equipe).filter(Boolean) as Objet[];
  const s = (k: "att" | "def" | "pv" | "mousse") => eq.reduce((a, o) => a + o[k], 0);
  return {
    att: 4 + (j.niveau - 1) * 2 + s("att") + (j.ivresse > 0 ? 2 : 0),
    def: 1 + (j.niveau - 1) + s("def"),
    pvMax: 30 + (j.niveau - 1) * 8 + s("pv"),
    mousseMax: 40 + (j.niveau - 1) * 5 + s("mousse"),
  };
}

const log = (p: Partie, cle: string, vars?: Message["vars"]) => {
  p.journal = [...p.journal, { cle, vars }].slice(-40);
};

function nouvelObjet(p: Partie, jeu: JeuJambonjon, def: ObjetDef, niveau: number): Objet {
  const total = jeu.raretes.reduce((a, r) => a + r.poids, 0);
  let r = tirer(p) * total;
  const rar = jeu.raretes.find((x) => (r -= x.poids) < 0) ?? jeu.raretes[0]!;
  const echelle = (1 + 0.25 * (niveau - 1)) * rar.mult;
  const v = (n?: number) => (n ? Math.max(1, Math.round(n * echelle)) : 0);
  return { uid: p.prochainUid++, base: def.id, niveau, rarete: rar.id, att: v(def.att), def: v(def.def), pv: v(def.pv), mousse: v(def.mousse) };
}

function objetAuHasard(p: Partie, jeu: JeuJambonjon): Objet {
  const dispo = jeu.objets.filter((o) => o.etage <= p.etage);
  return nouvelObjet(p, jeu, parmi(p, dispo.length ? dispo : jeu.objets), p.etage);
}

function nouveauMonstre(p: Partie, jeu: JeuJambonjon, def: MonstreDef, x: number, y: number, boss = false): Monstre {
  const elite = !boss && tirer(p) < 0.12;
  const niveau = Math.max(1, p.etage + entre(p, -1, 1) + (elite ? 2 : 0) + (boss ? 2 : 0));
  const k = niveau - 1;
  const pvMax = Math.round(def.pv * (1 + 0.35 * k) * (elite ? 1.5 : 1));
  return {
    uid: p.prochainUid++,
    type: def.id,
    niveau,
    elite,
    boss,
    x,
    y,
    pv: pvMax,
    pvMax,
    att: Math.round(def.att + 1.3 * k),
    def: Math.round(def.def + 0.6 * k),
    xp: Math.round(def.xp * niveau * (elite ? 2 : 1)),
    eveille: boss,
    sonne: 0,
  };
}

export const defMonstre = (jeu: JeuJambonjon, type: string): MonstreDef => (type === jeu.boss.id ? jeu.boss : (jeu.monstres.find((m) => m.id === type) ?? jeu.monstres[0]!));

/** Remplit un étage : carte, entrée, escalier (au plus loin), monstres, provisions et tonneaux. */
function peuplerEtage(p: Partie, jeu: JeuJambonjon) {
  const cellules = Math.min(13, 7 + p.etage);
  const carte = genererCarte(p, cellules);
  p.carte = carte;
  const libres = carte.cases.map((c, i) => (c === SOL ? i : -1)).filter((i) => i >= 0);
  const depart = parmi(p, libres);
  const x0 = depart % carte.w;
  const y0 = Math.floor(depart / carte.w);
  const dist = distances(carte, x0, y0);
  let loin = depart;
  for (const i of libres) if (dist[i]! > dist[loin]!) loin = i;
  carte.cases[loin] = ESCALIER;
  // Orientation de départ : vers une case libre.
  const dir = [0, 1, 2, 3].find((d) => passable(carte, x0 + DX[d]!, y0 + DY[d]!)) ?? 0;
  p.joueur = { ...p.joueur, x: x0, y: y0, dir };
  p.monstres = [];
  p.sol = [];
  const occupe = new Set<number>([depart, loin]);
  const caseLibre = (distMin: number) => {
    for (let essai = 0; essai < 200; essai++) {
      const i = parmi(p, libres);
      if (!occupe.has(i) && dist[i]! >= distMin) {
        occupe.add(i);
        return i;
      }
    }
    return -1;
  };
  const dernier = p.etage >= jeu.etages;
  if (dernier) {
    // Le boss garde l'escalier : on le pose sur la case voisine.
    const ex = loin % carte.w;
    const ey = Math.floor(loin / carte.w);
    const d = [0, 1, 2, 3].find((k) => passable(carte, ex + DX[k]!, ey + DY[k]!)) ?? 0;
    p.monstres.push(nouveauMonstre(p, jeu, jeu.boss, ex + DX[d]!, ey + DY[d]!, true));
    occupe.add(idx(carte, ex + DX[d]!, ey + DY[d]!));
  }
  const candidats = jeu.monstres.filter((m) => p.etage >= m.etages[0] && p.etage <= m.etages[1]);
  const nb = 4 + Math.round(p.etage * 1.6);
  for (let k = 0; k < nb; k++) {
    const i = caseLibre(5);
    if (i < 0) break;
    p.monstres.push(nouveauMonstre(p, jeu, parmi(p, candidats.length ? candidats : jeu.monstres), i % carte.w, Math.floor(i / carte.w)));
  }
  const poser = (butin: Butin, tonneau = false) => {
    const i = caseLibre(1);
    if (i >= 0) p.sol.push({ x: i % carte.w, y: Math.floor(i / carte.w), butin, ...(tonneau ? { tonneau } : {}) });
  };
  for (let k = 0; k < 2 + entre(p, 0, 2); k++) poser({ type: "jambon" });
  for (let k = 0; k < 2 + entre(p, 0, 2); k++) poser({ type: "biere" });
  for (let k = 0; k < 1 + entre(p, 0, 2); k++) poser({ type: "objet", objet: objetAuHasard(p, jeu) }, true);
  voir(p);
}

/** Nouvelle partie. */
export function nouvellePartie(jeu: JeuJambonjon, graine: number): Partie {
  const p: Partie = {
    version: VERSION,
    alea: graine >>> 0,
    etage: 1,
    carte: { w: 1, h: 1, cases: [MUR], vu: [false], decor: [0] },
    joueur: { x: 0, y: 0, dir: 0, niveau: 1, xp: 0, pv: 30, mousse: 40, faim: 100, ivresse: 0, jambons: 1, bieres: 1, sac: [], equipe: {} },
    monstres: [],
    sol: [],
    journal: [],
    tour: 0,
    prochainUid: 1,
    fin: null,
    tues: 0,
    evenements: [],
  };
  // Équipement de départ : l'arme la plus modeste.
  const premiere = jeu.objets.find((o) => o.emplacement === "arme");
  if (premiere) p.joueur.equipe.arme = { uid: p.prochainUid++, base: premiere.id, niveau: 1, rarete: jeu.raretes[0]!.id, att: premiere.att ?? 1, def: 0, pv: 0, mousse: 0 };
  peuplerEtage(p, jeu);
  log(p, "jbj.msg.entree", { etage: 1 });
  return p;
}

/** Marque comme vues les cases autour du joueur et devant lui (jusqu'au premier mur). */
function voir(p: Partie) {
  const c = p.carte;
  const j = p.joueur;
  const vu = c.vu.slice();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dans(c, j.x + dx, j.y + dy)) vu[idx(c, j.x + dx, j.y + dy)] = true;
  for (let k = 1; k <= 4; k++) {
    const x = j.x + DX[j.dir]! * k;
    const y = j.y + DY[j.dir]! * k;
    if (!dans(c, x, y)) break;
    vu[idx(c, x, y)] = true;
    // les murs latéraux du couloir
    for (const s of [1, 3]) {
      const lx = x + DX[(j.dir + s) % 4]!;
      const ly = y + DY[(j.dir + s) % 4]!;
      if (dans(c, lx, ly)) vu[idx(c, lx, ly)] = true;
    }
    if (!passable(c, x, y)) break;
  }
  p.carte = { ...c, vu };
}

const monstreEn = (p: Partie, x: number, y: number) => p.monstres.find((m) => m.x === x && m.y === y);

/* -------------------------------- Actions --------------------------------- */

export type Action =
  | { type: "avancer" }
  | { type: "reculer" }
  | { type: "gauche" }
  | { type: "droite" }
  | { type: "tournerG" }
  | { type: "tournerD" }
  | { type: "agir" }
  | { type: "attendre" }
  | { type: "manger" }
  | { type: "boire" }
  | { type: "rot" }
  | { type: "equiper"; uid: number }
  | { type: "retirer"; emplacement: Emplacement }
  | { type: "ramasser" }
  | { type: "jeter"; uid: number };

const clone = (p: Partie): Partie => ({
  ...p,
  joueur: { ...p.joueur, sac: [...p.joueur.sac], equipe: { ...p.joueur.equipe } },
  monstres: p.monstres.map((m) => ({ ...m })),
  sol: [...p.sol],
  evenements: [],
});

function degats(p: Partie, att: number, def: number): number {
  const brut = att + entre(p, 0, Math.max(1, Math.floor(att / 2)));
  const coupCritique = tirer(p) < 0.08;
  return Math.max(1, Math.round((brut - def * 0.6) * (coupCritique ? 1.8 : 1)));
}

function gagnerXp(p: Partie, xp: number) {
  const j = p.joueur;
  j.xp += xp;
  while (j.xp >= xpPourNiveau(j.niveau)) {
    j.xp -= xpPourNiveau(j.niveau);
    j.niveau += 1;
    const s = stats(j);
    j.pv = s.pvMax;
    j.mousse = s.mousseMax;
    log(p, "jbj.msg.niveau", { niveau: j.niveau });
    p.evenements.push("niveau");
  }
}

function tuer(p: Partie, jeu: JeuJambonjon, m: Monstre) {
  p.monstres = p.monstres.filter((x) => x.uid !== m.uid);
  p.tues += 1;
  log(p, "jbj.msg.tue", { nom: defMonstre(jeu, m.type).nom, xp: m.xp });
  p.evenements.push("tue");
  gagnerXp(p, m.xp);
  if (m.boss) {
    p.fin = "victoire";
    log(p, "jbj.msg.victoire");
    p.evenements.push("victoire");
    return;
  }
  // Butin : provisions ou objet, plus généreux sur une élite.
  const r = tirer(p);
  const chance = m.elite ? 1 : 0.55;
  if (r < chance) {
    const butin: Butin = tirer(p) < (m.elite ? 0.7 : 0.35) ? { type: "objet", objet: objetAuHasard(p, jeu) } : tirer(p) < 0.5 ? { type: "jambon" } : { type: "biere" };
    p.sol.push({ x: m.x, y: m.y, butin });
  }
}

function frapper(p: Partie, jeu: JeuJambonjon, m: Monstre, mult = 1) {
  const s = stats(p.joueur);
  const d = Math.round(degats(p, s.att, m.def) * mult);
  m.pv -= d;
  m.eveille = true;
  log(p, "jbj.msg.frappe", { nom: defMonstre(jeu, m.type).nom, degats: d });
  p.evenements.push("frappe");
  if (m.pv <= 0) tuer(p, jeu, m);
}

function ramasser(p: Partie, jeu: JeuJambonjon) {
  const j = p.joueur;
  const ici = p.sol.filter((s) => s.x === j.x && s.y === j.y);
  for (const s of ici) {
    if (s.butin.type === "jambon") {
      j.jambons += 1;
      log(p, "jbj.msg.jambon");
    } else if (s.butin.type === "biere") {
      j.bieres += 1;
      log(p, "jbj.msg.biere");
    } else {
      if (j.sac.length >= SAC_MAX) {
        log(p, "jbj.msg.sacPlein");
        continue;
      }
      j.sac.push(s.butin.objet);
      log(p, s.tonneau ? "jbj.msg.tonneau" : "jbj.msg.objet", { nom: nomObjet(jeu, s.butin.objet) });
    }
    p.sol = p.sol.filter((x) => x !== s);
    p.evenements.push("ramasse");
  }
}

/** Nom complet d'un objet : base, rareté. */
export function nomObjet(jeu: JeuJambonjon, o: Objet): string {
  const def = jeu.objets.find((x) => x.id === o.base);
  const r = jeu.raretes.find((x) => x.id === o.rarete);
  return `${def?.nom ?? o.base}${r?.suffixe ? ` ${r.suffixe}` : ""}`;
}

export const emplacementDe = (jeu: JeuJambonjon, o: Objet): Emplacement => jeu.objets.find((x) => x.id === o.base)?.emplacement ?? "breloque";

function deplacer(p: Partie, jeu: JeuJambonjon, dir: number): boolean {
  const j = p.joueur;
  // L’ivresse modifie le combat, jamais la direction demandée par le joueur.
  const nx = j.x + DX[dir]!;
  const ny = j.y + DY[dir]!;
  const m = monstreEn(p, nx, ny);
  if (m) {
    frapper(p, jeu, m);
    return true;
  }
  if (!passable(p.carte, nx, ny)) {
    log(p, "jbj.msg.mur");
    p.evenements.push("mur");
    return false;
  }
  j.x = nx;
  j.y = ny;
  p.evenements.push("pas");
  ramasser(p, jeu);
  if (caseEn(p.carte, nx, ny) === ESCALIER) log(p, "jbj.msg.escalier");
  return true;
}

/** Tour des monstres : ceux qui sentent le citoyen approchent, ceux qui le touchent frappent. */
function tourMonstres(p: Partie, jeu: JeuJambonjon) {
  const j = p.joueur;
  const dist = distances(p.carte, j.x, j.y);
  const s = stats(j);
  for (const m of p.monstres) {
    if (j.pv <= 0) break;
    if (m.sonne > 0) {
      m.sonne -= 1;
      continue;
    }
    const d = dist[idx(p.carte, m.x, m.y)]!;
    if (!m.eveille && d >= 0 && d <= 5) m.eveille = true;
    if (!m.eveille) continue;
    const def = defMonstre(jeu, m.type);
    if (Math.abs(m.x - j.x) + Math.abs(m.y - j.y) === 1) {
      if (tirer(p) < 0.12) {
        log(p, "jbj.msg.esquive", { nom: def.nom });
        continue;
      }
      const dg = degats(p, m.att, s.def);
      j.pv -= dg;
      log(p, "jbj.msg.touche", { nom: def.nom, degats: dg });
      p.evenements.push("touche");
      if (j.pv <= 0) {
        j.pv = 0;
        p.fin = "mort";
        log(p, "jbj.msg.mort", { nom: def.nom });
        p.evenements.push("mort");
      }
      continue;
    }
    if (def.lent && p.tour % 2 === 1) continue;
    if (d < 0 || d > 12) continue;
    // Un pas vers le citoyen, en descendant la carte des distances.
    let mieux: [number, number] | null = null;
    for (let k = 0; k < 4; k++) {
      const nx = m.x + DX[k]!;
      const ny = m.y + DY[k]!;
      if (!passable(p.carte, nx, ny) || monstreEn(p, nx, ny) || (nx === j.x && ny === j.y)) continue;
      const dn = dist[idx(p.carte, nx, ny)]!;
      if (dn >= 0 && dn < d && (!mieux || dn < dist[idx(p.carte, mieux[0], mieux[1])]!)) mieux = [nx, ny];
    }
    if (mieux) {
      m.x = mieux[0];
      m.y = mieux[1];
    }
  }
}

/** Effets du temps qui passe : faim, ivresse, mousse qui remonte doucement. */
function tempsPasse(p: Partie) {
  const j = p.joueur;
  p.tour += 1;
  if (p.tour % 5 === 0) j.faim = Math.max(0, j.faim - 1);
  if (j.faim === 0 && p.tour % 3 === 0) {
    j.pv -= 1;
    if (p.tour % 15 === 0) log(p, "jbj.msg.faim");
    if (j.pv <= 0) {
      j.pv = 0;
      p.fin = "mort";
      log(p, "jbj.msg.mortFaim");
      p.evenements.push("mort");
    }
  }
  if (j.ivresse > 0) {
    j.ivresse -= 1;
    if (j.ivresse === 0) log(p, "jbj.msg.degrise");
  }
  if (p.tour % 8 === 0) j.mousse = Math.min(stats(j).mousseMax, j.mousse + 1);
}

function descendre(p: Partie, jeu: JeuJambonjon) {
  p.etage += 1;
  peuplerEtage(p, jeu);
  log(p, "jbj.msg.descente", { etage: p.etage });
  p.evenements.push("descente");
}

/**
 * Applique une action du citoyen ; si elle prend du temps, le monde joue son tour. Les actions d'inventaire
 * (équiper, retirer, jeter) sont gratuites, comme dans les bons jeux de cave.
 */
export function jouer(avant: Partie, jeu: JeuJambonjon, a: Action): Partie {
  if (avant.fin) return avant;
  const p = clone(avant);
  const j = p.joueur;
  let prendDuTemps = true;
  switch (a.type) {
    case "avancer":
      prendDuTemps = deplacer(p, jeu, j.dir);
      break;
    case "reculer":
      prendDuTemps = deplacer(p, jeu, (j.dir + 2) % 4);
      break;
    case "gauche":
      prendDuTemps = deplacer(p, jeu, (j.dir + 3) % 4);
      break;
    case "droite":
      prendDuTemps = deplacer(p, jeu, (j.dir + 1) % 4);
      break;
    case "tournerG":
      j.dir = (j.dir + 3) % 4;
      prendDuTemps = false;
      break;
    case "tournerD":
      j.dir = (j.dir + 1) % 4;
      prendDuTemps = false;
      break;
    case "agir": {
      const m = monstreEn(p, j.x + DX[j.dir]!, j.y + DY[j.dir]!);
      if (m) frapper(p, jeu, m);
      else if (caseEn(p.carte, j.x, j.y) === ESCALIER) {
        if (p.monstres.some((x) => x.boss)) {
          log(p, "jbj.msg.bossGarde");
          prendDuTemps = false;
        } else {
          descendre(p, jeu);
          return p;
        }
      } else log(p, "jbj.msg.rien");
      break;
    }
    case "attendre":
      log(p, "jbj.msg.attendre");
      break;
    case "manger":
      if (j.jambons <= 0) {
        log(p, "jbj.msg.pasDeJambon");
        prendDuTemps = false;
        break;
      }
      j.jambons -= 1;
      j.faim = Math.min(100, j.faim + 40);
      j.pv = Math.min(stats(j).pvMax, j.pv + Math.round(stats(j).pvMax * 0.35));
      log(p, "jbj.msg.mange");
      p.evenements.push("mange");
      break;
    case "boire":
      if (j.bieres <= 0) {
        log(p, "jbj.msg.pasDeBiere");
        prendDuTemps = false;
        break;
      }
      j.bieres -= 1;
      j.mousse = Math.min(stats(j).mousseMax, j.mousse + 40);
      j.ivresse += 25;
      log(p, "jbj.msg.boit");
      p.evenements.push("boit");
      break;
    case "rot": {
      if (j.mousse < ROT_COUT) {
        log(p, "jbj.msg.pasDeMousse");
        prendDuTemps = false;
        break;
      }
      j.mousse -= ROT_COUT;
      p.evenements.push("rot");
      // Le rot d'État frappe tout ce qui se trouve dans les trois cases devant, et sonne les survivants.
      const touches: Monstre[] = [];
      for (let k = 1; k <= 3; k++) {
        const x = j.x + DX[j.dir]! * k;
        const y = j.y + DY[j.dir]! * k;
        if (!passable(p.carte, x, y)) break;
        const m = monstreEn(p, x, y);
        if (m) touches.push(m);
      }
      log(p, touches.length ? "jbj.msg.rot" : "jbj.msg.rotVide");
      for (const m of touches) {
        frapper(p, jeu, m, 1.6);
        if (p.monstres.includes(m)) m.sonne = 2;
      }
      break;
    }
    case "equiper": {
      const o = j.sac.find((x) => x.uid === a.uid);
      if (!o) return avant;
      const e = emplacementDe(jeu, o);
      const ancien = j.equipe[e];
      j.sac = j.sac.filter((x) => x !== o);
      if (ancien) j.sac.push(ancien);
      j.equipe[e] = o;
      const s = stats(j);
      j.pv = Math.min(j.pv, s.pvMax);
      j.mousse = Math.min(j.mousse, s.mousseMax);
      log(p, "jbj.msg.equipe", { nom: nomObjet(jeu, o) });
      p.evenements.push("equipe");
      prendDuTemps = false;
      break;
    }
    case "retirer": {
      const o = j.equipe[a.emplacement];
      if (!o) return avant;
      if (j.sac.length >= SAC_MAX) {
        log(p, "jbj.msg.sacPlein");
        return p;
      }
      delete j.equipe[a.emplacement];
      j.sac.push(o);
      const s = stats(j);
      j.pv = Math.min(j.pv, s.pvMax);
      j.mousse = Math.min(j.mousse, s.mousseMax);
      log(p, "jbj.msg.retire", { nom: nomObjet(jeu, o) });
      prendDuTemps = false;
      break;
    }
    case "ramasser": {
      if (!p.sol.some((s) => s.x === j.x && s.y === j.y)) return avant;
      ramasser(p, jeu);
      prendDuTemps = false;
      break;
    }
    case "jeter": {
      const o = j.sac.find((x) => x.uid === a.uid);
      if (!o) return avant;
      j.sac = j.sac.filter((x) => x !== o);
      p.sol.push({ x: j.x, y: j.y, butin: { type: "objet", objet: o } });
      log(p, "jbj.msg.jete", { nom: nomObjet(jeu, o) });
      prendDuTemps = false;
      break;
    }
  }
  if (prendDuTemps && !p.fin) {
    tourMonstres(p, jeu);
    if (!p.fin) tempsPasse(p);
  }
  voir(p);
  return p;
}

/** Comparaison d'un objet du sac avec ce qui est porté au même emplacement (somme des écarts). */
export function comparer(jeu: JeuJambonjon, j: Joueur, o: Objet) {
  const porte = j.equipe[emplacementDe(jeu, o)];
  const d = (k: "att" | "def" | "pv" | "mousse") => o[k] - (porte?.[k] ?? 0);
  return { att: d("att"), def: d("def"), pv: d("pv"), mousse: d("mousse") };
}

/** Relit une partie sauvegardée ; rend null si elle est illisible ou d'une autre version. */
export function relirePartie(v: unknown): Partie | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Partie;
  if (p.version !== VERSION || typeof p.alea !== "number" || typeof p.etage !== "number") return null;
  const c = p.carte;
  if (!c || !Array.isArray(c.cases) || c.cases.length !== c.w * c.h || !Array.isArray(c.vu) || !Array.isArray(c.decor)) return null;
  if (!p.joueur || !Array.isArray(p.joueur.sac) || typeof p.joueur.equipe !== "object" || !Array.isArray(p.monstres) || !Array.isArray(p.sol) || !Array.isArray(p.journal)) return null;
  return { ...p, evenements: [] };
}
