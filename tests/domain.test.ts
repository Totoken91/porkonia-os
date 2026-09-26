import { describe, expect, it } from "vitest";
import * as ops from "@/domain/ops";
import { integrityReport } from "@/domain/integrity";
import { buildContext } from "@/domain/context";
import { expandInternalSyntax, buildLinkIndex } from "@/domain/markdown";
import type { Database } from "@/domain/types";
import { emptyDatabase } from "@/domain/migrate";
import { DomainError } from "@/domain/util";
import { demoDatabase } from "@/data/fixtures";

const empty = (): Database => emptyDatabase();

const char = (db: Database, name = "Luis Test") =>
  ops.createCharacter(db, { canonicalName: name, nicknames: [], role: "", description: "", appearance: "Apparence A", biography: "", affiliations: [], events: [], narrativeRefs: [], status: "canon" });
const art = (db: Database, title = "Article Test") =>
  ops.createArticle(db, { title, subtitle: "", section: "S", tags: [], lead: "", body: "Corps v1", characterIds: [] });
const med = (db: Database, ref = "https://exemple.test/a.jpg", canonStatus: "officiel" | "proposition" = "officiel") =>
  ops.createMedia(db, { name: ref, description: "", kind: "image", location: "externe", ref, canonStatus });

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as DomainError).code;
  }
  return null;
};

describe("identifiants et révisions", () => {
  it("attribue un ID permanent indépendant du titre et archive chaque révision", () => {
    const db = empty();
    const a = art(db);
    expect(a.id).toMatch(/^art_[a-z0-9]{10}$/);
    ops.updateArticle(db, a.id, { title: "Nouveau titre" }, 1);
    expect(a.id).toMatch(/^art_/);
    expect(ops.revisionsOf(db, "article", a.id).map((r) => r.revision)).toEqual([2, 1]);
  });

  it("détecte les conflits de version et n'écrit rien", () => {
    const db = empty();
    const a = art(db);
    ops.updateArticle(db, a.id, { body: "v2" }, 1);
    expect(code(() => ops.updateArticle(db, a.id, { body: "v-conflit" }, 1))).toBe("CONFLIT");
    expect(a.body).toBe("v2");
  });

  it("conserve l'ancien slug en alias quand le slug change", () => {
    const db = empty();
    const a = art(db, "Sofiane Douzi");
    ops.updateArticle(db, a.id, { slug: "douzi" });
    expect(a.slug).toBe("douzi");
    expect(a.aliases).toContain("sofiane-douzi");
    expect(ops.resolveArticle(db, "sofiane-douzi")?.id).toBe(a.id);
    expect(ops.resolveArticle(db, a.id)?.id).toBe(a.id);
  });

  it("restaure une révision en créant une nouvelle révision (historique intact)", () => {
    const db = empty();
    const a = art(db);
    ops.updateArticle(db, a.id, { body: "v2" });
    ops.restoreRevision(db, "article", a.id, 1, 2);
    expect(a.body).toBe("Corps v1");
    expect(a.revision).toBe(3);
    expect(ops.revisionsOf(db, "article", a.id)).toHaveLength(3);
  });

  it("la corbeille est une suppression logique réversible", () => {
    const db = empty();
    const a = art(db);
    ops.softDelete(db, "article", a.id);
    expect(db.articles).toHaveLength(1);
    expect(a.deletedAt).toBeTruthy();
    ops.restoreFromTrash(db, "article", a.id);
    expect(a.deletedAt).toBeNull();
  });
});

describe("protection des portraits officiels", () => {
  it("refuse un média non associé, non homologué ou déjà portrait d'un autre", () => {
    const db = empty();
    const luis = char(db, "Luis");
    const douzi = char(db, "Douzi");
    const m = med(db);
    expect(code(() => ops.setPortrait(db, luis.id, m.id))).toBe("PROTEGE"); // non associé
    const prop = med(db, "https://exemple.test/b.jpg", "proposition");
    ops.linkMedia(db, prop.id, { characterId: luis.id });
    expect(code(() => ops.setPortrait(db, luis.id, prop.id))).toBe("PROTEGE"); // non homologué
    ops.linkMedia(db, m.id, { characterId: luis.id });
    ops.linkMedia(db, m.id, { characterId: douzi.id });
    ops.setPortrait(db, luis.id, m.id);
    expect(code(() => ops.setPortrait(db, douzi.id, m.id))).toBe("PROTEGE"); // déjà portrait de Luis
  });

  it("n'écrase jamais un portrait existant sans confirmation explicite", () => {
    const db = empty();
    const c = char(db);
    const m1 = med(db, "https://exemple.test/1.jpg");
    const m2 = med(db, "https://exemple.test/2.jpg");
    ops.linkMedia(db, m1.id, { characterId: c.id });
    ops.linkMedia(db, m2.id, { characterId: c.id });
    ops.setPortrait(db, c.id, m1.id);
    expect(code(() => ops.setPortrait(db, c.id, m2.id))).toBe("PROTEGE");
    expect(c.portraitMediaId).toBe(m1.id);
    ops.setPortrait(db, c.id, m2.id, { confirmReplace: true });
    expect(c.portraitMediaId).toBe(m2.id);
  });

  it("empêche de déclasser, dissocier ou jeter un portrait officiel", () => {
    const db = empty();
    const c = char(db);
    const m = med(db);
    ops.linkMedia(db, m.id, { characterId: c.id });
    ops.setPortrait(db, c.id, m.id);
    expect(code(() => ops.updateMedia(db, m.id, { canonStatus: "proposition" }))).toBe("PROTEGE");
    expect(code(() => ops.unlinkMedia(db, m.id, { characterId: c.id }))).toBe("PROTEGE");
    expect(code(() => ops.softDelete(db, "media", m.id))).toBe("PROTEGE");
  });
});

describe("médias externes", () => {
  it("détecte les doublons par référence et par empreinte", () => {
    const db = empty();
    med(db, "https://exemple.test/a.jpg");
    expect(code(() => med(db, "https://exemple.test/a.jpg"))).toBe("INVALIDE");
    ops.createMedia(db, { name: "x", description: "", kind: "image", location: "locale", ref: "x.png", canonStatus: "proposition", sha256: "abc" });
    expect(code(() => ops.createMedia(db, { name: "y", description: "", kind: "image", location: "locale", ref: "y.png", canonStatus: "proposition", sha256: "abc" }))).toBe("INVALIDE");
  });

  it("refuse les chemins locaux hors racine et les URL non http", () => {
    const db = empty();
    expect(code(() => ops.createMedia(db, { name: "x", description: "", kind: "image", location: "locale", ref: "../secret", canonStatus: "proposition" }))).toBe("INVALIDE");
    expect(code(() => ops.createMedia(db, { name: "x", description: "", kind: "image", location: "externe", ref: "javascript:alert(1)", canonStatus: "proposition" }))).toBe("INVALIDE");
  });

  it("ne modifie un chemin qu'avec confirmation, et une variante ne remplace pas l'original", () => {
    const db = empty();
    const m = med(db);
    expect(code(() => ops.updateMediaRef(db, m.id, "https://exemple.test/z.jpg", { confirm: false }))).toBe("PROTEGE");
    const v = ops.createMedia(db, { name: "v2", description: "", kind: "image", location: "externe", ref: "https://exemple.test/v2.jpg", canonStatus: "proposition", variantOf: m.id });
    expect(v.variantOf).toBe(m.id);
    expect(m.ref).toBe("https://exemple.test/a.jpg");
  });
});

describe("publication", () => {
  it("ne publie jamais de brouillon et produit un instantané immuable", () => {
    const db = empty();
    const a = art(db, "Validé");
    art(db, "Brouillon");
    ops.setArticleStatus(db, a.id, "valide");
    const p = ops.publish(db, "n1");
    expect(p.articles.map((x) => x.title)).toEqual(["Validé"]);
    expect(a.status).toBe("publie");
    expect(() => {
      (p.articles[0] as { title: string }).title = "piraté";
    }).toThrow();
  });

  it("un article publié remis en brouillon garde sa version publiée ; manifeste correct", () => {
    const db = empty();
    const a = art(db, "A");
    ops.setArticleStatus(db, a.id, "valide");
    ops.publish(db, "n1");
    ops.updateArticle(db, a.id, { body: "brouillon en cours" });
    expect(a.status).toBe("brouillon");
    const preview = ops.previewPublication(db);
    expect(preview.articles[0]!.body).toBe("Corps v1");
    expect(preview.manifest.unchanged).toEqual([a.id]);
  });

  it("restaurer une publication crée une nouvelle publication sans toucher aux brouillons", () => {
    const db = empty();
    const a = art(db, "A");
    ops.setArticleStatus(db, a.id, "valide");
    ops.publish(db, "n1");
    ops.updateArticle(db, a.id, { body: "v2" });
    ops.setArticleStatus(db, a.id, "valide");
    ops.publish(db, "n2");
    ops.updateArticle(db, a.id, { body: "v3 en cours" });
    const r = ops.restorePublication(db, 1, "");
    expect(r.number).toBe(3);
    expect(r.restoredFrom).toBe(1);
    expect(r.articles[0]!.body).toBe("Corps v1");
    expect(a.body).toBe("v3 en cours");
    expect(db.publications).toHaveLength(3);
    expect(r.verification.status).toBe("non-verifiee");
    expect(r.deployment).toBeNull();
  });
});

describe("contexte IA, liens et intégrité", () => {
  it("n'inclut que les éléments sélectionnés, avec provenance", () => {
    const db = empty();
    const luis = char(db, "Luis");
    char(db, "Autre personnage");
    art(db, "Article non sélectionné");
    const pkg = buildContext(db, { task: "illustration", instruction: "Portrait", characterIds: [luis.id], extraBible: [], target: "generique", detail: "court", includeRelations: false });
    expect(pkg.markdown).toContain("Luis");
    expect(pkg.markdown).toContain("Apparence A");
    expect(pkg.markdown).not.toContain("Autre personnage");
    expect(pkg.markdown).not.toContain("Article non sélectionné");
    expect(pkg.sources).toHaveLength(1);
    expect(pkg.tokens).toBeGreaterThan(0);
    expect(pkg.warnings.join(" ")).toMatch(/portrait/i);
  });

  it("résout les liens internes par alias et signale les liens cassés", () => {
    const db = empty();
    const a = art(db, "Cible");
    ops.updateArticle(db, a.id, { aliases: ["ancien-id-porkopedia"] });
    const b = art(db, "Source");
    ops.updateArticle(db, b.id, { body: "[[ancien-id-porkopedia|voir]] et [[inexistant]]" });
    const html = expandInternalSyntax(b.body, buildLinkIndex(db));
    expect(html).toContain(`[voir](/articles/${a.id})`);
    expect(html).toContain("lien cassé");
    expect(integrityReport(db).some((i) => i.message.includes("inexistant"))).toBe(true);
  });

  it("les données de démonstration sont marquées et cohérentes", () => {
    const db = demoDatabase();
    expect([...db.characters, ...db.articles, ...db.media, ...db.bible].every((x) => x.isDemo)).toBe(true);
    expect(integrityReport(db).filter((i) => i.level === "erreur")).toEqual([]);
  });
});
