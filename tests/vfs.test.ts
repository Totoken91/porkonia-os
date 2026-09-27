import { describe, expect, it } from "vitest";
import type { FsNode } from "@/content/types";
import { resolve } from "@/os/fs";
import { BUREAU, chemins, fusionnerPack, creer, deplacer, disqueInitial, dossiersEcrivables, ecrire, nomLibre, nomValide, renommer, restaurer, sanitizeDisque, supprimer, vider, type Disque, type Resultat } from "@/os/vfs";

const fs: FsNode = {
  type: "dossier",
  name: "Poste",
  children: [
    { type: "dossier", name: "Docs", children: [{ type: "texte", name: "a.txt", content: "A" }, { type: "texte", name: "CGU.txt", content: "…", protege: "Vous les avez acceptées." }] },
    { type: "dossier", name: "Coffre", locked: "Fermé.", children: [] },
  ],
};
const J = "27/09/2026";
const ok = (r: Resultat): Disque => {
  if (!r.ok) throw new Error(r.erreur);
  return r.disque;
};

describe("disque du poste", () => {
  it("ajoute un Bureau au disque neuf sans toucher au pack", () => {
    const d = disqueInitial(fs);
    expect(d.racine.children[0]!.name).toBe(BUREAU);
    expect((fs as { children: FsNode[] }).children).toHaveLength(2);
  });

  it("numérote les noms en conflit", () => {
    const e: FsNode[] = [{ type: "texte", name: "note.txt", content: "" }, { type: "dossier", name: "Nouveau dossier", children: [] }];
    expect(nomLibre(e, "note.txt")).toBe("note (2).txt");
    expect(nomLibre(e, "Nouveau dossier")).toBe("Nouveau dossier (2)");
    expect(nomLibre(e, "autre")).toBe("autre");
    expect(nomValide("ok")).toBe(true);
    for (const n of ["", "  ", "a/b", "a:b", ".."]) expect(nomValide(n)).toBe(false);
  });

  it("crée, renomme, écrit", () => {
    let d = disqueInitial(fs);
    const r = creer(d, BUREAU, { type: "dossier", name: "Nouveau dossier", children: [] });
    d = ok(r);
    expect(r.ok && r.chemins).toEqual(["Bureau/Nouveau dossier"]);
    d = ok(creer(d, BUREAU, { type: "dossier", name: "Nouveau dossier", children: [] }));
    expect(resolve(d.racine, "Bureau/Nouveau dossier (2)")).not.toBeNull();
    d = ok(renommer(d, "Bureau/Nouveau dossier", "Jambons"));
    expect(resolve(d.racine, "Bureau/Jambons")?.type).toBe("dossier");
    expect(renommer(d, "Bureau/Jambons", "Nouveau dossier (2)")).toMatchObject({ ok: false, erreur: "fichiers.err.existe" });
    expect(renommer(d, "Bureau/Jambons", "a/b")).toMatchObject({ ok: false, erreur: "fichiers.err.nom" });
    d = ok(ecrire(d, "Docs/a.txt", "B", J));
    expect(resolve(d.racine, "Docs/a.txt")).toMatchObject({ content: "B", date: J });
  });

  it("déplace et copie, sans mettre un dossier dans lui-même", () => {
    let d = ok(creer(disqueInitial(fs), BUREAU, { type: "dossier", name: "Sac", children: [] }));
    d = ok(deplacer(d, ["Docs/a.txt"], BUREAU));
    expect(resolve(d.racine, "Docs/a.txt")).toBeNull();
    expect(resolve(d.racine, "Bureau/a.txt")).not.toBeNull();
    const c = deplacer(d, ["Bureau/a.txt"], BUREAU, true);
    expect(c.ok && c.chemins).toEqual(["Bureau/Copie de a.txt"]);
    d = ok(c);
    d = ok(deplacer(d, ["Bureau/a.txt", "Bureau/Copie de a.txt"], "Bureau/Sac"));
    expect((resolve(d.racine, "Bureau/Sac") as { children: FsNode[] }).children.map((x) => x.name)).toEqual(["a.txt", "Copie de a.txt"]);
    expect(deplacer(d, ["Bureau/Sac"], "Bureau/Sac")).toMatchObject({ ok: false, erreur: "fichiers.err.dansLuiMeme" });
    expect(deplacer(d, ["Bureau/Sac/a.txt"], "Coffre")).toMatchObject({ ok: false, erreur: "fichiers.err.verrouille" });
  });

  it("protège ce qui doit l'être", () => {
    const d = disqueInitial(fs);
    expect(supprimer(d, ["Docs/CGU.txt"], J)).toMatchObject({ ok: false, erreur: "Vous les avez acceptées." });
    expect(renommer(d, BUREAU, "Plus de bureau")).toMatchObject({ ok: false, erreur: "fichiers.err.systeme" });
    const copie = ok(deplacer(d, ["Docs/CGU.txt"], BUREAU, true));
    expect(resolve(copie.racine, "Bureau/CGU.txt")?.protege).toBeUndefined();
  });

  it("jette, restaure et vide la Poubelle d'État", () => {
    let d = ok(supprimer(disqueInitial(fs), ["Docs/a.txt"], J));
    expect(resolve(d.racine, "Docs/a.txt")).toBeNull();
    expect(d.poubelle).toMatchObject([{ origine: "Docs", date: J }]);
    d = ok(restaurer(d, 0));
    expect(resolve(d.racine, "Docs/a.txt")).not.toBeNull();
    expect(d.poubelle).toEqual([]);
    d = ok(supprimer(d, ["Docs"], J));
    expect(vider(d).poubelle).toEqual([]);
  });

  it("liste les dossiers où l'on peut écrire", () => {
    expect(dossiersEcrivables(disqueInitial(fs))).toEqual(["", "Bureau", "Docs"]);
  });

  it("relit un disque conservé et écarte le reste", () => {
    const d = ok(creer(disqueInitial(fs), BUREAU, { type: "texte", name: "x.txt", content: "x" }));
    expect(sanitizeDisque(JSON.parse(JSON.stringify(d)), fs)).toEqual(d);
    expect(sanitizeDisque("n'importe quoi", fs)).toEqual(disqueInitial(fs));
    const sale = { racine: { type: "dossier", name: "Poste", children: [{ type: "image", name: "p.jpg", src: "javascript:alert(1)" }, { type: "texte", name: "ok.txt", content: "o" }] }, poubelle: [{ node: null }] };
    const s = sanitizeDisque(sale, fs);
    // Disque d'avant la fusion : il reçoit les dossiers du pack qui lui manquaient.
    expect(s.racine.children.map((c) => c.name)).toEqual([BUREAU, "ok.txt", "Docs", "Coffre"]);
    expect(s.poubelle).toEqual([]);
  });
});

describe("fusion des nouveautés du pack", () => {
  const v2: FsNode = {
    type: "dossier",
    name: "Poste",
    children: [
      { type: "dossier", name: "Docs", children: [{ type: "texte", name: "a.txt", content: "A" }, { type: "texte", name: "neuf.txt", content: "N", cache: true }] },
      { type: "dossier", name: "Coffre", locked: "Fermé.", children: [] },
      { type: "dossier", name: "Nouveau", children: [{ type: "texte", name: "dedans.txt", content: "D" }] },
    ],
  };
  it("livre les nouveaux fichiers et dossiers, une seule fois", () => {
    let d = disqueInitial(fs);
    d = ok(supprimer(d, ["Docs/a.txt"], J));
    const f = fusionnerPack(d, v2);
    expect(resolve(f.racine, "Docs/neuf.txt")).toMatchObject({ cache: true });
    expect(resolve(f.racine, "Nouveau/dedans.txt")).not.toBeNull();
    // Le fichier jeté par le citoyen ne revient pas.
    expect(resolve(f.racine, "Docs/a.txt")).toBeNull();
    expect(fusionnerPack(f, v2)).toEqual(f);
    expect(chemins(v2)).toContain("Nouveau/dedans.txt");
  });
  it("garde la liste des chemins livrés au fil des opérations", () => {
    const d = ok(supprimer(disqueInitial(fs), ["Docs/a.txt"], J));
    expect(d.connus).toContain("Docs/a.txt");
    expect(sanitizeDisque(JSON.parse(JSON.stringify(d)), fs)).toEqual(d);
  });
});
