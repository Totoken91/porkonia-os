import { afterAll, describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { analyzeDocx } from "@/bible/docx-parse";
import { applyBibleImport, emptyBibleDecisions, planBibleImport } from "@/domain/bible-import";
import { undoImport } from "@/domain/porkopedia-import";
import { emptyDatabase, migrate } from "@/domain/migrate";
import * as ops from "@/domain/ops";

/* ------------------------------ DOCX de test ------------------------------ */
// PNG 1×1 et 2×3 (octets réels) pour vérifier la copie à l'identique et les dimensions.
const png = (w: number, h: number, seed: number) => {
  const b = Buffer.alloc(33 + seed);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "latin1");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
};
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
const p = (text: string, style = "") => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t>${text}</w:t></w:r></w:p>`;
const img = (rid: string, name: string) => `<w:p><w:r><w:drawing><wp:inline><wp:docPr id="1" name="${name}"/><a:graphic><a:graphicData><a:blip r:embed="${rid}"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
const cell = (inner: string) => `<w:tc>${inner}</w:tc>`;
function makeDocx() {
  const body = [
    p("Bible de test", "Title"),
    p("Règles visuelles", "Heading1"),
    p("Toujours un flash direct."),
    p("Registre des visages canoniques", "Heading1"),
    `<w:tbl><w:tr>${cell(p("Sofiane Douzi") + p("Référence fondatrice. Conserver exactement la barbe.") + p("SOURCE CANONIQUE NON MODIFIÉE  •  douzi-source.png") + img("rId10", "Picture 1"))}${cell(p("Personne Inconnue") + p("Conserver le regard.") + img("rId11", "Picture 2"))}</w:tr></w:tbl>`,
    p("Section sans catégorie", "Heading1"),
    p("Texte libre."),
  ].join("");
  const files = {
    "[Content_Types].xml": strToU8('<?xml version="1.0"?><Types/>'),
    "word/document.xml": strToU8(`<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`),
    "word/styles.xml": strToU8(`<?xml version="1.0"?><w:styles ${W}><w:style w:styleId="Title"><w:name w:val="Title"/></w:style><w:style w:styleId="Heading1"><w:name w:val="heading 1"/></w:style></w:styles>`),
    "word/_rels/document.xml.rels": strToU8(
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId10" Target="media/image1.png"/><Relationship Id="rId11" Target="media/image2.png"/></Relationships>',
    ),
    "word/media/image1.png": new Uint8Array(png(2, 3, 1)),
    "word/media/image2.png": new Uint8Array(png(1, 1, 2)),
    "word/media/image9.png": new Uint8Array(png(5, 5, 3)), // non placée
  };
  return zipSync(files);
}

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

describe("Bible visuelle DOCX", () => {
  const buf = makeDocx();
  const an = analyzeDocx(buf, "bible-test.docx");

  it("structure le document en sections, sans inventer de contenu", () => {
    expect(an.title).toBe("Bible de test");
    expect(an.sections.map((s) => s.path)).toEqual(["Règles visuelles", "Registre des visages canoniques", "Section sans catégorie"]);
    expect(an.sections.find((s) => s.path === "Section sans catégorie")!.suggestedCategory).toBeNull();
    const plan = planBibleImport(emptyDatabase(), an);
    expect(plan.missingCategories).toContain("chronologie");
  });

  it("extrait TOUTES les images, sans recompression, et détecte les portraits canoniques", () => {
    expect(an.images.map((i) => i.name)).toEqual(["image1.png", "image2.png", "image9.png"]);
    expect(an.images[0]!.sha256).toBe(sha(new Uint8Array(png(2, 3, 1))));
    expect([an.images[0]!.width, an.images[0]!.height]).toEqual([2, 3]);
    expect(an.images.find((i) => i.name === "image9.png")!.role).toBe("non-placee");
    const douzi = an.portraits.find((x) => x.name === "Sofiane Douzi")!;
    expect(douzi.image).toBe("word/media/image1.png");
    expect(douzi.originalFilename).toBe("douzi-source.png");
    expect(douzi.appearance).toMatch(/Conserver exactement la barbe/);
  });

  it("associe les portraits aux bons personnages et protège la référence canonique", () => {
    const db = emptyDatabase();
    const douzi = ops.createCharacter(db, { canonicalName: "Sofiane Douzi", nicknames: ["Douzi"], role: "", description: "", appearance: "", biography: "", affiliations: [], events: [], narrativeRefs: [], status: "canon" });
    const plan = planBibleImport(db, an);
    expect(plan.portraits.find((x) => x.name === "Sofiane Douzi")!.defaultDecision).toBe(`associer:${douzi.id}`);
    expect(plan.portraits.find((x) => x.name === "Personne Inconnue")!.defaultDecision).toBe("creer");
    const dec = emptyBibleDecisions();
    dec.categories["section:Section sans catégorie"] = "organisations";
    dec.sections["section:Section sans catégorie"] = "importer";
    const batch = applyBibleImport(db, an, plan, dec, { docPath: "originals/x.docx", mediaDir: "bible-visuelle/test" });
    const c = db.characters.find((x) => x.id === douzi.id)!;
    const portrait = db.media.find((m) => m.id === c.portraitMediaId)!;
    expect(portrait.nature).toBe("reference-source");
    expect(portrait.sha256).toBe(an.images[0]!.sha256);
    expect(portrait.ref).toBe("bible-visuelle/test/image1.png");
    expect(portrait.external?.originalFilename).toBe("douzi-source.png");
    expect(c.appearance).toMatch(/barbe/);
    expect(db.bible.some((b) => b.title === "Visage canonique — Sofiane Douzi" && b.characterIds.includes(c.id))).toBe(true);
    expect(db.sources).toHaveLength(1);
    // Une image générée ne peut JAMAIS remplacer la référence source, même avec confirmation
    const probe = structuredClone(db);
    const gen = ops.createMedia(probe, { name: "génération", description: "", kind: "illustration", location: "externe", ref: "https://ex.test/gen.png", canonStatus: "officiel", nature: "generation" });
    ops.linkMedia(probe, gen.id, { characterId: c.id });
    expect(() => ops.setPortrait(probe, c.id, gen.id, { confirmReplace: true })).toThrow(/RÉFÉRENCE SOURCE/);
    // Ré-import : rien de dupliqué
    const plan2 = planBibleImport(db, an);
    expect(plan2.images.every((i) => i.action === "existant")).toBe(true);
    expect(plan2.sections.filter((s) => s.action === "creer")).toHaveLength(0);
    // Annulation : tout part en corbeille, rien n'est effacé
    const n = db.bible.length + db.media.length + db.characters.length;
    undoImport(db, batch.id);
    expect(db.bible.length + db.media.length + db.characters.length).toBe(n);
    expect(db.characters.find((x) => x.id === douzi.id)!.portraitMediaId).toBeNull();
  });

  it("fonctionne sur la Bible visuelle réelle si elle est présente localement", () => {
    const dir = path.join("data", "originals");
    const f = existsSync(dir) ? readdirSync(dir).find((x) => x.endsWith(".docx")) : undefined;
    if (!f) return; // document non versionné : test ignoré hors poste de travail
    const real = analyzeDocx(new Uint8Array(readFileSync(path.join(dir, f))), f);
    expect(real.portraits.length).toBe(17);
    expect(real.images.length).toBeGreaterThanOrEqual(23);
    expect(real.portraits.every((x) => x.appearance.length > 0)).toBe(true);
  });
});

/* ------------------------ Sauvegarde / migration ------------------------ */

const dir = mkdtempSync(path.join(tmpdir(), "pk-backup-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("sauvegarde, restauration et migration", () => {
  it("migre une base v1 en v2 après copie intégrale, sans perte", async () => {
    process.env.PORKONIA_DATA_DIR = dir;
    const v1 = {
      schemaVersion: 1,
      characters: [],
      articles: [],
      media: [],
      bible: [],
      revisions: [],
      log: [],
      backups: [],
      publications: [{ id: "pub_x", number: 1, createdAt: "2026-01-01", note: "", articles: [], manifest: { added: [], modified: [], removed: [], unchanged: [] }, contentHash: "h", verification: "verifiee", verificationNote: "vu", verifiedAt: "2026-01-02" }],
    };
    writeFileSync(path.join(dir, "porkonia-db.json"), JSON.stringify(v1));
    const store = await import("@/data/store-core");
    store.__resetCache();
    const db = await store.readDb();
    expect(db.schemaVersion).toBe(2);
    expect(db.imports).toEqual([]);
    expect(db.publications[0]!.verification).toMatchObject({ status: "verifiee", method: "manuelle", note: "vu" });
    expect(db.publications[0]!.deployment).toBeTruthy();
    const pre = readdirSync(path.join(dir, "backups")).find((f) => f.startsWith("pre-migration-v1"));
    expect(pre).toBeTruthy();
    expect(JSON.parse(readFileSync(path.join(dir, "backups", pre!), "utf8")).schemaVersion).toBe(1);
    expect(() => migrate({ schemaVersion: 99 })).toThrow(/plus récente/);
  });

  it("vérifie qu'une sauvegarde est restaurable, puis la restaure fidèlement", async () => {
    process.env.PORKONIA_DATA_DIR = dir;
    const store = await import("@/data/store-core");
    const { createCharacter } = await import("@/domain/ops");
    await store.transaction((d) => createCharacter(d, { canonicalName: "Avant", nicknames: [], role: "", description: "", appearance: "", biography: "", affiliations: [], events: [], narrativeRefs: [], status: "canon" }));
    const b = await store.createBackup("test");
    const check = await store.verifyBackup(b.file);
    expect(check.ok).toBe(true);
    await store.transaction((d) => createCharacter(d, { canonicalName: "Après", nicknames: [], role: "", description: "", appearance: "", biography: "", affiliations: [], events: [], narrativeRefs: [], status: "canon" }));
    const r = await store.restoreBackup(b.file);
    const db = await store.readDb();
    expect(db.characters.map((c) => c.canonicalName)).toEqual(["Avant"]);
    expect(existsSync(r.previousStateSavedAt)).toBe(true); // l'état « Après » reste sauvegardé
    expect(JSON.parse(readFileSync(r.previousStateSavedAt, "utf8")).characters.map((c: { canonicalName: string }) => c.canonicalName)).toContain("Après");
    // Une sauvegarde corrompue est refusée
    const bad = path.join(dir, "corrompue.json");
    writeFileSync(bad, "{ pas du json");
    expect((await store.verifyBackup(bad)).ok).toBe(false);
    await expect(store.restoreBackup(bad)).rejects.toThrow(/non restaurable/);
  });
});
