import { beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { applyPorkopediaImport, planPorkopediaImport, undoImport, type Extraction } from "@/domain/porkopedia-import";
import { emptyDatabase } from "@/domain/migrate";
import { verifyAgainstExtraction } from "@/domain/verify";
import * as ops from "@/domain/ops";
import type { Article, Database } from "@/domain/types";

let ex: Extraction;
let exRaw: string;

function extract(out: string) {
  execFileSync(process.execPath, ["scripts/porkopedia-extract.mjs", "--from", "tests/fixtures/mini-site", "--out", out], { stdio: "pipe" });
  return readFileSync(path.join(out, "extraction.json"), "utf8");
}

beforeAll(() => {
  const dir = mkdtempSync(path.join(tmpdir(), "pk-ext-"));
  exRaw = extract(dir);
  ex = JSON.parse(exRaw);
  rmSync(dir, { recursive: true, force: true });
}, 90_000);

const clone = (): Extraction => JSON.parse(exRaw);
const byPk = (db: Database, id: string) => db.articles.find((a) => a.external?.id === id)!;

describe("extracteur (navigateur isolé)", () => {
  it("respecte l'ordre des scripts et récupère le contenu final après transformations", () => {
    expect(ex.scriptOrder).toEqual(["articles.js", "fix.js", "epic.js", "index.html#script-en-ligne-1"]);
    const alpha = ex.articles.find((a) => a.id === "alpha")!;
    expect(alpha.html).toContain("Alpha corrigé par fix.js");
    expect(alpha.modifiedBy).toEqual(["fix.js"]);
    expect(alpha.original?.html).toContain("Alpha v1");
    const douzi = ex.articles.find((a) => a.id === "douzi")!;
    expect((douzi.html.match(/douzi-scene/g) ?? []).length).toBe(12);
    expect(douzi.modifiedBy.join(" ")).toContain("epic.js");
    expect(douzi.original?.html).toContain("Ancienne notice");
    expect(ex.articles.every((a) => a.render?.matchesTitle)).toBe(true);
  });

  it("n'effectue aucune requête hors de l'instantané et bloque toute écriture (site public intact)", () => {
    expect(ex.isolation.origin).toContain(".invalid");
    expect(ex.isolation.network.nonGet).toBe(1); // POST tenté par la page de test…
    expect((ex.isolation.network as unknown as { blockedUrls: string[] }).blockedUrls).toContain("POST https://evil.example/collect"); // …et bloqué
    expect(ex.warnings.join(" ")).toMatch(/non-GET/);
  });

  it("est reproductible : même instantané → même identifiant et mêmes empreintes", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pk-ext2-"));
    const again = JSON.parse(extract(dir)) as Extraction;
    rmSync(dir, { recursive: true, force: true });
    expect(again.extractionId).toBe(ex.extractionId);
    expect(again.articles.map((a) => a.contentHash)).toEqual(ex.articles.map((a) => a.contentHash));
  }, 90_000);

  it("classe les références médias et repère les liens internes cassés", () => {
    const unused = ex.media.find((m) => m.originalRef === "assets/ancienne-image.jpg")!;
    expect(unused.displayed).toBe(false);
    expect(unused.refKind).toBe("chemin-relatif");
    expect(ex.media.find((m) => m.originalRef === "assets/home-banniere.jpg")?.home).toBe(true);
    expect(ex.brokenLinks).toEqual([{ from: "beta", to: "gamma" }]);
  });
});

describe("import Porkopédia", () => {
  it("importe sans perte puis ré-importe sans duplication (idempotence)", () => {
    const db = emptyDatabase();
    const b1 = applyPorkopediaImport(db, ex, planPorkopediaImport(db, ex), {});
    expect(b1.summary.articlesCrees).toBe(3);
    const nMedia = db.media.length;
    const nRev = db.revisions.length;
    const plan2 = planPorkopediaImport(db, ex);
    expect(plan2.counts.articlesNouveaux).toBe(0);
    expect(plan2.counts.articlesInchanges).toBe(3);
    const b2 = applyPorkopediaImport(db, ex, plan2, {});
    expect(b2.changes).toHaveLength(0);
    expect(db.articles).toHaveLength(3);
    expect(db.media).toHaveLength(nMedia);
    expect(db.revisions).toHaveLength(nRev);
  });

  it("conserve la version d'origine dans l'historique et le HTML d'origine sans conversion", () => {
    const db = emptyDatabase();
    applyPorkopediaImport(db, ex, planPorkopediaImport(db, ex), {});
    const alpha = byPk(db, "alpha");
    expect(alpha.format).toBe("html");
    expect(alpha.body).toBe(ex.articles.find((a) => a.id === "alpha")!.html);
    const revs = ops.revisionsOf(db, "article", alpha.id);
    expect((revs.at(-1)!.snapshot as Article).body).toContain("Alpha v1");
    expect(alpha.external?.modifiedBy).toEqual(["fix.js"]);
  });

  it("conserve les références médias sans les déplacer (URL absolue + chemin d'origine)", () => {
    const db = emptyDatabase();
    applyPorkopediaImport(db, ex, planPorkopediaImport(db, ex), {});
    const m = db.media.find((x) => x.external?.originalRef === "assets/beta-2.png")!;
    expect(m.location).toBe("externe");
    expect(m.ref).toBe(new URL("assets/beta-2.png", ex.source.site).toString());
    expect(m.canonStatus).toBe("officiel");
    expect(m.nature).toBe("indeterminee");
    expect(byPk(db, "beta").mediaIds).toContain(m.id);
    const archived = db.media.find((x) => x.external?.originalRef === "assets/ancienne-image.jpg")!;
    expect(archived.canonStatus).toBe("archive");
    expect(byPk(db, "beta").body).toContain('src="assets/beta-2.png"'); // corps inchangé
  });

  it("protège Douzi : une version sans épopée n'est jamais importée automatiquement", () => {
    const db = emptyDatabase();
    applyPorkopediaImport(db, ex, planPorkopediaImport(db, ex), {});
    const d = byPk(db, "douzi");
    expect(d.protection?.reason).toMatch(/douze scènes/);
    const bodyBefore = d.body;
    // Le site « régresse » vers l'ancienne version
    const regressed = clone();
    const dz = regressed.articles.find((a) => a.id === "douzi")!;
    dz.html = "<p>Ancienne notice de Douzi.</p>";
    dz.contentHash = "regression";
    const plan = planPorkopediaImport(db, regressed);
    const item = plan.articles.find((i) => i.porkopediaId === "douzi")!;
    expect(item.action).toBe("conflit");
    expect(item.defaultDecision).toBe("garder-local");
    applyPorkopediaImport(db, regressed, plan, {});
    expect(byPk(db, "douzi").body).toBe(bodyBefore);
    // Même une mise à jour « valide » d'un article protégé exige une décision humaine
    const legit = clone();
    const dz2 = legit.articles.find((a) => a.id === "douzi")!;
    dz2.html += '<figure class="douzi-scene">13e scène</figure>';
    dz2.contentHash = "v2";
    const plan2 = planPorkopediaImport(db, legit);
    expect(plan2.articles.find((i) => i.porkopediaId === "douzi")!.action).toBe("conflit");
    applyPorkopediaImport(db, legit, plan2, { "article:douzi": "importer" });
    expect(byPk(db, "douzi").body).toContain("13e scène");
    expect(ops.revisionsOf(db, "article", byPk(db, "douzi").id).some((r) => (r.snapshot as Article).body === bodyBefore)).toBe(true);
  });

  it("signale les conflits (modifié localement ET sur le site) et applique la décision explicite", () => {
    const db = emptyDatabase();
    applyPorkopediaImport(db, ex, planPorkopediaImport(db, ex), {});
    const beta = byPk(db, "beta");
    ops.updateArticle(db, beta.id, { lead: "Chapeau modifié localement" });
    const changed = clone();
    const b = changed.articles.find((a) => a.id === "beta")!;
    b.lead = "Chapeau modifié sur le site";
    b.contentHash = "site-v2";
    const plan = planPorkopediaImport(db, changed);
    const item = plan.articles.find((i) => i.porkopediaId === "beta")!;
    expect(item.action).toBe("conflit");
    applyPorkopediaImport(db, changed, plan, {}); // défaut : garder la version locale
    expect(byPk(db, "beta").lead).toBe("Chapeau modifié localement");
    expect(() => applyPorkopediaImport(db, changed, planPorkopediaImport(db, changed), { "article:beta": "restaurer" })).toThrow(/invalide/);
    applyPorkopediaImport(db, changed, planPorkopediaImport(db, changed), { "article:beta": "importer" });
    expect(byPk(db, "beta").lead).toBe("Chapeau modifié sur le site");
    expect(ops.revisionsOf(db, "article", beta.id).some((r) => (r.snapshot as Article).lead === "Chapeau modifié localement")).toBe(true);
  });

  it("détecte un article local homonyme sans l'écraser", () => {
    const db = emptyDatabase();
    ops.createArticle(db, { title: "Alpha local", subtitle: "", section: "", tags: [], lead: "", body: "local", characterIds: [], slug: "alpha" });
    const plan = planPorkopediaImport(db, ex);
    const item = plan.articles.find((i) => i.porkopediaId === "alpha")!;
    expect(item.action).toBe("conflit");
    expect(item.defaultDecision).toBe("ignorer");
    applyPorkopediaImport(db, ex, plan, {});
    expect(db.articles.filter((a) => a.slug.startsWith("alpha"))).toHaveLength(1);
    expect(db.articles.find((a) => a.slug === "alpha")!.body).toBe("local");
  });

  it("annule un import sans suppression physique, et ne touche pas ce qui a été modifié depuis", () => {
    const db = emptyDatabase();
    const batch = applyPorkopediaImport(db, ex, planPorkopediaImport(db, ex), {});
    const beta = byPk(db, "beta");
    ops.updateArticle(db, beta.id, { lead: "Travail local après import" });
    const total = db.articles.length + db.media.length;
    const undone = undoImport(db, batch.id);
    expect(undone.status).toBe("annulee");
    expect(db.articles.length + db.media.length).toBe(total); // rien n'est effacé
    expect(byPk(db, "alpha").deletedAt).toBeTruthy(); // → corbeille
    expect(byPk(db, "beta").deletedAt).toBeFalsy(); // modifié depuis : conservé
    expect(undone.undoReport!.join(" ")).toMatch(/modifié depuis l'import/);
    expect(() => undoImport(db, batch.id)).toThrow(/déjà été annulé/);
    // Ré-import après annulation : les éléments en corbeille ne reviennent que sur décision explicite
    const plan = planPorkopediaImport(db, ex);
    expect(plan.articles.find((i) => i.porkopediaId === "alpha")!.action).toBe("corbeille");
    applyPorkopediaImport(db, ex, plan, { "article:alpha": "restaurer" });
    expect(byPk(db, "alpha").deletedAt).toBeFalsy();
    expect(db.articles.filter((a) => a.external?.id === "alpha")).toHaveLength(1);
  });
});

describe("états de publication et vérification automatique", () => {
  it("sépare publication locale, export, déploiement déclaré et vérifications", () => {
    const db = emptyDatabase();
    applyPorkopediaImport(db, ex, planPorkopediaImport(db, ex), {});
    const pub = ops.publish(db, "Lot 1");
    expect(pub.verification.status).toBe("non-verifiee");
    expect(pub.exportedAt).toBeNull();
    expect(pub.deployment).toBeNull();
    // Pas de vérification sans déploiement déclaré
    expect(() => ops.setVerification(db, pub.number, "verifiee", "vu")).toThrow(/déploiement/);
    ops.markExported(db, pub.number);
    ops.declareDeployment(db, pub.number, "Collé dans ChatGPT Sites le 26/09");
    // Vérification automatique contre l'extraction du site : contenu identique

    const p1 = db.publications.find((p) => p.number === pub.number)!;
    const details = verifyAgainstExtraction(p1, ex);
    expect(details.every((d) => d.found && d.similarity === 1)).toBe(true);
    ops.setAutomaticVerification(db, pub.number, { extractionId: ex.extractionId, details });
    const v = db.publications.find((p) => p.number === pub.number)!.verification;
    expect(v).toMatchObject({ status: "verifiee", method: "automatique" });
    // Un article absent du site fait échouer la vérification automatique
    const partial = clone();
    partial.articles = partial.articles.filter((a) => a.id !== "beta");
    const d2 = verifyAgainstExtraction(p1, partial);
    ops.setAutomaticVerification(db, pub.number, { extractionId: partial.extractionId, details: d2 });
    expect(db.publications.find((p) => p.number === pub.number)!.verification.status).toBe("echec");
    // Le contenu publié reste figé
    expect(Object.isFrozen(db.publications.find((p) => p.number === pub.number)!.articles)).toBe(true);
  });
});
