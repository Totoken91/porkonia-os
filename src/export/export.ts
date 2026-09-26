import type { Database, Media } from "@/domain/types";
import { latestPublication } from "@/domain/ops";

export const EXPORT_FORMAT = "porkonia-os/export@1";

/** Export complet : toutes les données, révisions et publications, sans dépendance à l'application. */
export function buildFullExport(db: Readonly<Database>) {
  return {
    format: EXPORT_FORMAT,
    exportedAt: new Date().toISOString(),
    readme:
      "Export complet de Porkonia OS. Tableaux JSON indépendants : characters, articles (corps Markdown), media (références : URL externes ou chemins relatifs, fichiers NON inclus), bible, revisions (instantanés complets), publications (contenus figés), log.",
    ...db,
  };
}

/** Export des références médias (catalogue), en JSON ou CSV. */
export function mediaReferences(db: Readonly<Database>, includeTrash = false) {
  return db.media
    .filter((m) => includeTrash || !m.deletedAt)
    .map((m: Media) => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      location: m.location,
      ref: m.ref,
      canonStatus: m.canonStatus,
      variantOf: m.variantOf ?? "",
      sha256: m.sha256 ?? "",
      width: m.width ?? "",
      height: m.height ?? "",
      characters: m.characterIds.map((id) => db.characters.find((c) => c.id === id)?.canonicalName ?? id).join(" | "),
      articles: m.articleIds.map((id) => db.articles.find((a) => a.id === id)?.title ?? id).join(" | "),
      lastCheck: m.lastCheck ? `${m.lastCheck.status}${m.lastCheck.httpStatus ? ` ${m.lastCheck.httpStatus}` : ""} @ ${m.lastCheck.checkedAt}` : "",
      provenance: m.provenance.source,
      deleted: m.deletedAt ? "oui" : "",
    }));
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

/** Paquet d'une publication : contenu figé + manifeste, destiné à l'intégration manuelle dans Porkopédia. */
export function publicationPackage(db: Readonly<Database>, number?: number) {
  const pub = number ? db.publications.find((p) => p.number === number) : latestPublication(db as Database);
  if (!pub) return null;
  return {
    format: "porkonia-os/publication@1",
    publication: {
      number: pub.number,
      id: pub.id,
      createdAt: pub.createdAt,
      note: pub.note,
      contentHash: pub.contentHash,
      restoredFrom: pub.restoredFrom ?? null,
      verification: pub.verification,
    },
    manifest: pub.manifest,
    articles: pub.articles,
  };
}
