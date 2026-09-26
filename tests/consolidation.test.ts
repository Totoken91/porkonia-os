import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { emptyDatabase } from "@/domain/migrate";
import * as ops from "@/domain/ops";
import { applyMediaClassification, auditMedia } from "@/domain/media-audit";
import { buildPorkopediaPackage } from "@/export/porkopedia-package";
import { renderForPorkopedia } from "@/export/render-html";
import { applyPorkopediaImport, planPorkopediaImport, type Extraction } from "@/domain/porkopedia-import";
import type { Database, Media } from "@/domain/types";

const char = (db: Database, name: string, pk: string) => {
  const c = ops.createCharacter(db, { canonicalName: name, nicknames: [], role: "", description: "", appearance: "", biography: "", affiliations: [], events: [], narrativeRefs: [], status: "proposition" });
  c.external = { porkopediaId: pk };
  return c;
};
const media = (db: Database, file: string, extra: Partial<Media> = {}) =>
  ops.createMedia(db, { name: file, description: "", kind: "illustration", location: "externe", ref: `https://site.test/assets/${file}`, canonStatus: "officiel", nature: "indeterminee", external: { source: "porkopedia", originalRef: `assets/${file}`, foundIn: [], displayed: true }, ...extra } as never);

function douziFixture() {
  const db = emptyDatabase();
  const douzi = char(db, "Sofiane Douzi", "douzi");
  const luis = char(db, "Luis Fontanillas", "luis-fontanillas");
  const martin = char(db, "Martin Chou", "martin-chou");
  const a = ops.createArticle(db, {
    title: "Sofiane Douzi",
    subtitle: "",
    section: "Figures historiques",
    tags: [],
    lead: "",
    characterIds: [douzi.id],
    slug: "douzi",
    body: '<figure><img src="assets/douzi-luis.jpg" alt="Douzi écoute Luis négocier"><figcaption>Billes</figcaption></figure><figure><img src="assets/martin-seul.jpg" alt="Martin couvre un terminal de dorures"></figure><figure><img src="assets/couverture.jpg"></figure>',
  });
  a.format = "html";
  a.external = { source: "porkopedia", id: "douzi", contentHash: "h", importedAt: "", extractionId: "x", origin: "articles.js", modifiedBy: [], importedRevision: 1, baseUrl: "https://site.test/" };
  const imgs = ["douzi-luis.jpg", "martin-seul.jpg", "couverture.jpg"].map((f) => media(db, f, { articleIds: [a.id], characterIds: [douzi.id] }));
  douzi.galleryMediaIds = imgs.map((m) => m.id);
  const bible = ops.createMedia(db, { name: "Visage canonique — Sofiane Douzi", description: "", kind: "photo", location: "locale", ref: "bible-visuelle/x/image2.png", canonStatus: "officiel", nature: "reference-source", sha256: "abc", external: { source: "bible-docx", originalRef: "word/media/image2.png", foundIn: [], originalFilename: "43598a5b.png" } });
  ops.linkMedia(db, bible.id, { characterId: douzi.id });
  ops.setPortrait(db, douzi.id, bible.id);
  return { db, douzi, luis, martin, a, imgs, bible };
}

describe("audit des associations médias", () => {
  it("distingue scène collective, illustration de l'article et portrait source, sans rien appliquer", () => {
    const { db, douzi, luis, martin, imgs, bible } = douziFixture();
    const [scene, martinOnly, cover] = imgs.map((m) => auditMedia(db, m));
    expect(scene!.suggestedUsage).toBe("scene-collective");
    expect(scene!.suggested.find((d) => d.characterId === luis.id)).toMatchObject({ kind: "apparait", confirmed: false });
    expect(scene!.suggested.find((d) => d.characterId === douzi.id)?.kind).toBe("apparait");
    // Martin est nommé, Douzi n'est qu'illustré : « lien-article », pas « apparaît »
    expect(martinOnly!.suggested.find((d) => d.characterId === martin.id)?.kind).toBe("apparait");
    expect(martinOnly!.suggested.find((d) => d.characterId === douzi.id)).toMatchObject({ kind: "lien-article" });
    expect(cover!.suggestedUsage).toBe("illustration-narrative");
    expect(auditMedia(db, bible)).toMatchObject({ suggestedUsage: "portrait-source" });
    // L'audit n'a rien modifié
    expect(imgs.every((m) => !m.usage && !m.depictions)).toBe(true);
  });

  it("un média peut représenter plusieurs personnages sans devenir leur portrait", () => {
    const { db, douzi, luis, imgs } = douziFixture();
    const scene = imgs[0]!;
    const sel = auditMedia(db, scene);
    applyMediaClassification(db, { mediaId: scene.id, usage: sel.suggestedUsage, depictions: sel.suggested.map((d) => ({ ...d, confirmed: true })) });
    expect(scene.usage).toBe("scene-collective");
    expect(scene.characterIds.sort()).toEqual([douzi.id, luis.id].sort());
    expect(db.characters.find((c) => c.id === luis.id)!.galleryMediaIds).toContain(scene.id);
    expect(db.characters.find((c) => c.id === luis.id)!.portraitMediaId ?? null).toBeNull();
    expect(() => ops.setPortrait(db, luis.id, scene.id, { confirmReplace: true })).toThrow(/portrait source/);
  });

  it("refuse de retirer ou de déclasser un portrait officiel via la classification", () => {
    const { db, bible, douzi } = douziFixture();
    expect(() => applyMediaClassification(db, { mediaId: bible.id, usage: "illustration-narrative", depictions: [{ characterId: douzi.id, kind: "portrait-source", basis: "", confirmed: true }] })).toThrow(/portrait officiel/);
    expect(() => applyMediaClassification(db, { mediaId: bible.id, usage: "portrait-source", depictions: [] })).toThrow(/portrait/);
    expect(db.characters.find((c) => c.id === douzi.id)!.portraitMediaId).toBe(bible.id);
  });

  it("une simple illustration de l'article ne peut pas devenir portrait", () => {
    const { db, douzi, imgs } = douziFixture();
    const cover = imgs[2]!;
    applyMediaClassification(db, { mediaId: cover.id, usage: null, depictions: [{ characterId: douzi.id, kind: "lien-article", basis: "article", confirmed: true }] });
    expect(() => ops.setPortrait(db, douzi.id, cover.id, { confirmReplace: true })).toThrow(/lié|RÉFÉRENCE/);
  });
});

describe("validation des fiches et original brut", () => {
  it("« canon » exige tous les points de contrôle et un portrait source", () => {
    const { db, douzi, luis } = douziFixture();
    expect(() => ops.validateCharacter(db, douzi.id, { decision: "canon", note: "", checklist: { identite: true } })).toThrow(/incomplète/);
    const all = Object.fromEntries(Object.keys(ops.VALIDATION_CHECKS).map((k) => [k, true]));
    expect(() => ops.validateCharacter(db, luis.id, { decision: "canon", note: "", checklist: all })).toThrow(/portrait/);
    ops.validateCharacter(db, douzi.id, { decision: "canon", note: "", checklist: all });
    expect(db.characters.find((c) => c.id === douzi.id)!.status).toBe("canon");
    expect(() => ops.validateCharacter(db, luis.id, { decision: "proposition", note: "", checklist: {} })).toThrow(/motif/);
  });

  it("distingue la copie extraite de l'original brut et ne change jamais le portrait tout seul", () => {
    const { db, douzi, bible } = douziFixture();
    ops.registerRawOriginal(db, bible.id, { uploadedFilename: "43598a5b.png", sha256: "abc", width: 10, height: 10, ref: null, format: "png" });
    expect(bible.rawOriginal?.status).toBe("identique");
    const { db: db2, douzi: d2, bible: b2 } = douziFixture();
    ops.registerRawOriginal(db2, b2.id, { uploadedFilename: "43598a5b.png", sha256: "different", width: 3000, height: 4000, ref: "originaux-bruts/different.png", format: "png" });
    expect(b2.rawOriginal?.status).toBe("differente");
    const raw = db2.media.find((m) => m.id === b2.rawOriginal!.mediaId)!;
    expect(raw.nature).toBe("reference-source");
    expect(db2.characters.find((c) => c.id === d2.id)!.portraitMediaId).toBe(b2.id); // inchangé
    expect(db2.media.find((m) => m.id === b2.id)!.sha256).toBe("abc"); // copie extraite intacte
    ops.setPortrait(db2, d2.id, raw.id, { confirmReplace: true }); // choix explicite autorisé (source → source)
    void douzi;
  });
});

describe("paquet Porkopédia et simulation", () => {
  it("convertit le Markdown avec liens internes vers data-article, sans HTML brut", () => {
    const r = renderForPorkopedia("## Titre\n\nVoir [[douzi|le Grand Maître]] <script>x</script>\n\n| a | b |\n|---|---|\n| 1 | 2 |", {
      resolveArticle: (k) => (k === "douzi" ? { siteId: "douzi", title: "Sofiane Douzi" } : null),
      resolveMedia: () => null,
    });
    expect(r.html).toContain('<a href="#" data-article="douzi">le Grand Maître</a>');
    expect(r.html).toContain("<table>");
    expect(r.html).not.toContain("<script>");
  });

  it("génère un paquet d'ajout seul, le simule sur une copie du site et constate uniquement l'ajout attendu", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pk-pkg-"));
    try {
      execFileSync(process.execPath, ["scripts/porkopedia-extract.mjs", "--from", "tests/fixtures/mini-site", "--out", path.join(dir, "base")], { stdio: "pipe" });
      const ex = JSON.parse(readFileSync(path.join(dir, "base", "extraction.json"), "utf8")) as Extraction;
      const db = emptyDatabase();
      applyPorkopediaImport(db, ex, planPorkopediaImport(db, ex), {});
      const cover = db.media.find((m) => m.external?.originalRef === "assets/alpha.jpg")!;
      const art = ops.createArticle(db, { title: "Essai de publication", subtitle: "Test", section: "Essais", tags: ["essai"], lead: "Notice d'essai.", body: "## Objet\n\nRenvoi vers [[douzi|Douzi]].", characterIds: [], slug: "essai-de-publication" });
      ops.linkMedia(db, cover.id, { articleId: art.id });
      ops.setCover(db, art.id, cover.id);
      ops.setArticleStatus(db, art.id, "valide");
      const pub = ops.publish(db, "essai");
      const pkg = buildPorkopediaPackage(db, pub, ex);
      expect(pkg.blocking).toEqual([]);
      expect(pkg.delta.nouveaux.map((a) => a.id)).toEqual(["essai-de-publication"]);
      expect(pkg.delta.inchanges).toBe(3);
      expect(pkg.insertAfter).toBe("epic.js");
      expect(pkg.script).toContain("n'est pas remplacé");
      expect(pkg.instructions).toContain("<script src=\"porkonia-os-publication-001.js\"></script>");
      // Simulation : application à une copie de l'instantané
      const site = path.join(dir, "sim", "site");
      cpSync("tests/fixtures/mini-site", site, { recursive: true });
      writeFileSync(path.join(site, pkg.fileName), pkg.script);
      const idx = readFileSync(path.join(site, "index.html"), "utf8");
      writeFileSync(path.join(site, "index.html"), idx.replace('<script src="epic.js"></script>', `<script src="epic.js"></script>\n<script src="${pkg.fileName}"></script>`));
      execFileSync(process.execPath, ["scripts/porkopedia-extract.mjs", "--from", path.join(dir, "sim"), "--out", path.join(dir, "simx")], { stdio: "pipe" });
      const sim = JSON.parse(readFileSync(path.join(dir, "simx", "extraction.json"), "utf8")) as Extraction;
      const before = new Map(ex.articles.map((a) => [a.id, a.contentHash]));
      expect(sim.articles.filter((a) => !before.has(a.id)).map((a) => a.id)).toEqual(["essai-de-publication"]);
      expect(sim.articles.filter((a) => before.has(a.id) && before.get(a.id) !== a.contentHash)).toEqual([]);
      const added = sim.articles.find((a) => a.id === "essai-de-publication")!;
      expect(added.html).toContain('data-article="douzi"');
      expect(added.render?.matchesTitle).toBe(true);
      // Modifier un article existant bloque l'export (non automatisé)
      ops.updateArticle(db, db.articles.find((a) => a.external?.id === "beta")!.id, { lead: "modifié" });
      ops.setArticleStatus(db, db.articles.find((a) => a.external?.id === "beta")!.id, "valide");
      const pub2 = ops.publish(db, "essai 2");
      expect(buildPorkopediaPackage(db, pub2, ex).blocking.join(" ")).toMatch(/modifié localement/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  it("une intégration signalée n'est pas un déploiement ; la vérification exige un export", () => {
    const db = emptyDatabase();
    const a = ops.createArticle(db, { title: "X", subtitle: "", section: "", tags: [], lead: "", body: "x", characterIds: [] });
    ops.setArticleStatus(db, a.id, "valide");
    const p = ops.publish(db, "");
    expect(() => ops.declareDeployment(db, p.number, "fait")).toThrow(/Exportez/);
    ops.markExported(db, p.number, { fileName: "f.js", sha256: "s", expectedAdded: ["x"] });
    ops.declareDeployment(db, p.number, "collé dans ChatGPT Sites");
    const after = db.publications.find((x) => x.number === p.number)!;
    expect(after.deployment).toBeTruthy();
    expect(after.verification.status).toBe("non-verifiee");
    expect(after.exportedPackage?.fileName).toBe("f.js");
  });
});
