import { describe, expect, it } from "vitest";
import { porkosPack as porkos } from "@/content/packs/porkos";
import { distances, ESCALIER, genererCarte, idx, jouer, MUR, nouvellePartie, passable, relirePartie, stats, xpPourNiveau, type Partie } from "@/apps/jambonjon/logic";
import { choixParDefaut, desinstaller, espaceRequis, estInstalle, installer, normaliserDossier } from "@/apps/installeur/logic";
import { formatDuree, formatTaille, recu } from "@/apps/telechargement/logic";
import { disqueInitial } from "@/os/vfs";
import { resolve } from "@/os/fs";

const jeu = porkos.jambonjon;

describe("Jambonjon : carte", () => {
  it("génère un labyrinthe fermé, entièrement relié", () => {
    const c = genererCarte({ alea: 42 }, 9);
    expect(c.w).toBe(19);
    for (let x = 0; x < c.w; x++) {
      expect(c.cases[idx(c, x, 0)]).toBe(MUR);
      expect(c.cases[idx(c, x, c.h - 1)]).toBe(MUR);
    }
    const d = distances(c, 1, 1);
    c.cases.forEach((v, i) => {
      if (v !== MUR) expect(d[i]).toBeGreaterThanOrEqual(0);
    });
  });

  it("est déterministe pour une même graine", () => {
    expect(genererCarte({ alea: 7 }, 8).cases).toEqual(genererCarte({ alea: 7 }, 8).cases);
    expect(genererCarte({ alea: 7 }, 8).cases).not.toEqual(genererCarte({ alea: 8 }, 8).cases);
  });
});

describe("Jambonjon : partie", () => {
  it("pose le citoyen sur une case libre, un escalier accessible et des monstres", () => {
    const p = nouvellePartie(jeu, 123);
    const c = p.carte;
    expect(passable(c, p.joueur.x, p.joueur.y)).toBe(true);
    const esc = c.cases.indexOf(ESCALIER);
    expect(esc).toBeGreaterThan(-1);
    expect(distances(c, p.joueur.x, p.joueur.y)[esc]).toBeGreaterThan(0);
    expect(p.monstres.length).toBeGreaterThan(3);
    expect(p.joueur.equipe.arme).toBeTruthy();
    expect(p.carte.vu[idx(c, p.joueur.x, p.joueur.y)]).toBe(true);
  });

  it("tourner ne coûte pas de tour, avancer contre un mur non plus", () => {
    const p = nouvellePartie(jeu, 5);
    const t = jouer(p, jeu, { type: "tournerD" });
    expect(t.joueur.dir).toBe((p.joueur.dir + 1) % 4);
    expect(t.tour).toBe(p.tour);
    // Face à un mur : on cherche une orientation bloquée.
    let q = p;
    for (let k = 0; k < 4; k++) {
      const j = q.joueur;
      const dx = [0, 1, 0, -1][j.dir]!;
      const dy = [-1, 0, 1, 0][j.dir]!;
      if (!passable(q.carte, j.x + dx, j.y + dy)) break;
      q = jouer(q, jeu, { type: "tournerD" });
    }
    const r = jouer(q, jeu, { type: "avancer" });
    expect(r.joueur.x).toBe(q.joueur.x);
    expect(r.tour).toBe(q.tour);
  });

  it("manger et boire consomment les provisions et soignent", () => {
    let p = nouvellePartie(jeu, 9);
    p = { ...p, joueur: { ...p.joueur, pv: 5, faim: 10, mousse: 0 } };
    const m = jouer(p, jeu, { type: "manger" });
    expect(m.joueur.jambons).toBe(p.joueur.jambons - 1);
    expect(m.joueur.pv).toBeGreaterThan(5);
    expect(m.joueur.faim).toBeGreaterThan(10);
    const b = jouer(m, jeu, { type: "boire" });
    expect(b.joueur.bieres).toBe(p.joueur.bieres - 1);
    expect(b.joueur.mousse).toBeGreaterThan(0);
    expect(b.joueur.ivresse).toBeGreaterThan(0);
    const vide = jouer({ ...b, joueur: { ...b.joueur, jambons: 0 } }, jeu, { type: "manger" });
    expect(vide.journal.at(-1)!.cle).toBe("jbj.msg.pasDeJambon");
  });

  it("frapper un monstre jusqu'à la mort rapporte de l'XP", () => {
    const p = nouvellePartie(jeu, 31);
    const j = p.joueur;
    const dx = [0, 1, 0, -1][j.dir]!;
    const dy = [-1, 0, 1, 0][j.dir]!;
    const m = { ...p.monstres[0]!, x: j.x + dx, y: j.y + dy, pv: 1, eveille: true };
    let q: Partie = { ...p, monstres: [m] };
    q = jouer(q, jeu, { type: "agir" });
    expect(q.monstres).toHaveLength(0);
    expect(q.tues).toBe(1);
    expect(q.joueur.xp + (q.joueur.niveau > 1 ? xpPourNiveau(1) : 0)).toBeGreaterThan(0);
  });

  it("monte de niveau et améliore ses caractéristiques", () => {
    const p = nouvellePartie(jeu, 3);
    const avant = stats(p.joueur);
    const j = p.joueur;
    const dx = [0, 1, 0, -1][j.dir]!;
    const dy = [-1, 0, 1, 0][j.dir]!;
    const m = { ...p.monstres[0]!, x: j.x + dx, y: j.y + dy, pv: 1, xp: 500 };
    const q = jouer({ ...p, monstres: [m] }, jeu, { type: "agir" });
    expect(q.joueur.niveau).toBeGreaterThan(1);
    expect(stats(q.joueur).att).toBeGreaterThan(avant.att);
    expect(q.joueur.pv).toBe(stats(q.joueur).pvMax);
  });

  it("équiper échange l'objet porté avec celui du sac", () => {
    const p = nouvellePartie(jeu, 11);
    const o = { uid: 999, base: "hachoir", niveau: 5, rarete: "etat", att: 20, def: 0, pv: 0, mousse: 0 };
    const q = jouer({ ...p, joueur: { ...p.joueur, sac: [o] } }, jeu, { type: "equiper", uid: 999 });
    expect(q.joueur.equipe.arme!.uid).toBe(999);
    expect(q.joueur.sac.map((x) => x.base)).toContain(p.joueur.equipe.arme!.base);
    expect(stats(q.joueur).att).toBeGreaterThan(stats(p.joueur).att);
  });

  it("descend l'escalier et change d'étage ; le boss garde le dernier", () => {
    const p = nouvellePartie(jeu, 77);
    const esc = p.carte.cases.indexOf(ESCALIER);
    const sur = { ...p, monstres: [], joueur: { ...p.joueur, x: esc % p.carte.w, y: Math.floor(esc / p.carte.w) } };
    const q = jouer(sur, jeu, { type: "agir" });
    expect(q.etage).toBe(2);
    let r: Partie = q;
    for (let e = 2; e < jeu.etages; e++) {
      const i = r.carte.cases.indexOf(ESCALIER);
      r = jouer({ ...r, monstres: [], joueur: { ...r.joueur, x: i % r.carte.w, y: Math.floor(i / r.carte.w) } }, jeu, { type: "agir" });
    }
    expect(r.etage).toBe(jeu.etages);
    expect(r.monstres.some((m) => m.boss)).toBe(true);
  });

  it("la faim finit par tuer", () => {
    const p = nouvellePartie(jeu, 2);
    let q: Partie = { ...p, monstres: [], joueur: { ...p.joueur, faim: 0, pv: 2, jambons: 0 } };
    for (let k = 0; k < 20 && !q.fin; k++) q = jouer(q, jeu, { type: "attendre" });
    expect(q.fin).toBe("mort");
  });

  it("relit une sauvegarde et refuse le reste", () => {
    const p = nouvellePartie(jeu, 1);
    expect(relirePartie(JSON.parse(JSON.stringify(p)))).not.toBeNull();
    expect(relirePartie({ version: 0 })).toBeNull();
    expect(relirePartie("n'importe quoi")).toBeNull();
  });
});

describe("Assistant d'installation", () => {
  const inst = porkos.installeurs[0]!;
  const d0 = disqueInitial(porkos.filesystem);

  it("installe dans le dossier choisi, avec raccourci sur le Bureau", () => {
    const r = installer(d0, inst, choixParDefaut(inst));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(resolve(r.disque.racine, "Programmes/Jambonjon/Jambonjon")?.type).toBe("lien");
    expect(resolve(r.disque.racine, "Programmes/Jambonjon/LISEZMOI.TXT")?.type).toBe("texte");
    expect(resolve(r.disque.racine, "Bureau/Jambonjon")?.type).toBe("lien");
    expect(estInstalle(r.disque, "jambonjon")).toBe(true);
    expect(estInstalle(d0, "jambonjon")).toBe(false);
  });

  it("respecte les composants et le dossier tapé à la main", () => {
    const r = installer(d0, inst, { ...choixParDefaut(inst), dossier: " Jeux \\ Caves ", composants: [], raccourciBureau: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(resolve(r.disque.racine, "Jeux/Caves/Jambonjon")).toBeTruthy();
    expect(resolve(r.disque.racine, "Jeux/Caves/MANUEL.TXT")).toBeNull();
    expect(resolve(r.disque.racine, "Jeux/Caves/LISEZMOI.TXT")).toBeTruthy();
    expect(resolve(r.disque.racine, "Bureau/Jambonjon")).toBeNull();
    expect(normaliserDossier("a\\\\b//c ")).toBe("a/b/c");
    expect(espaceRequis(inst, [])).toBe(inst.composants.find((c) => c.obligatoire)!.taille);
  });

  it("refuse d'installer dans un dossier verrouillé", () => {
    const r = installer(d0, inst, { ...choixParDefaut(inst), dossier: "Téléchargements/Jambonjon" });
    expect(r.ok).toBe(false);
  });

  it("désinstalle tout : dossier et raccourcis", () => {
    const r = installer(d0, inst, choixParDefaut(inst));
    if (!r.ok) throw new Error("installation");
    const u = desinstaller(r.disque, inst);
    expect(u.ok).toBe(true);
    if (!u.ok) return;
    expect(estInstalle(u.disque, "jambonjon")).toBe(false);
    expect(resolve(u.disque.racine, "Programmes/Jambonjon")).toBeNull();
    expect(resolve(u.disque.racine, "Programmes")).toBeTruthy();
  });
});

describe("Téléchargement", () => {
  it("avance, plafonne à la taille et s'affiche à l'ancienne", () => {
    expect(recu(1337, 96, 0)).toBe(0);
    expect(recu(1337, 96, 3000)).toBeGreaterThan(0);
    expect(recu(1337, 96, 600000)).toBe(1337);
    expect(recu(1337, 96, 5000)).toBeGreaterThanOrEqual(recu(1337, 96, 4000));
    expect(formatTaille(512)).toBe("512 Ko");
    expect(formatTaille(1337)).toBe("1,31 Mo");
    expect(formatDuree(42)).toBe("42 s");
    expect(formatDuree(75)).toBe("1 min 15 s");
  });
});
