/**
 * Migrations de schéma — pures, additives, jamais destructives.
 * Le stockage écrit une copie intégrale de la base AVANT d'appliquer une migration.
 */
import type { Database, PublicationVerification } from "./types";
import { SCHEMA_VERSION } from "./types";

type Loose = Record<string, unknown>;

/** v1 → v2 : collections `imports` et `sources`, états de publication séparés (export / déploiement / vérification). */
function v1ToV2(db: Loose): Loose {
  const pubs = ((db.publications as Loose[]) ?? []).map((p) => {
    const old = p.verification as PublicationVerification | Loose | undefined;
    if (old && typeof old === "object") return p; // déjà migrée
    const status = (old as PublicationVerification) ?? "non-verifiee";
    const at = (p.verifiedAt as string | null | undefined) ?? null;
    const note = (p.verificationNote as string | undefined) ?? "";
    const { verificationNote: _n, verifiedAt: _v, ...rest } = p;
    void _n;
    void _v;
    return {
      ...rest,
      exportedAt: null,
      // En v1, « vérifiée » était une déclaration humaine qui impliquait un déploiement constaté.
      deployment: status !== "non-verifiee" && at ? { declaredAt: at, note: "Déduit de la vérification v1 (déclaration manuelle)." } : null,
      verification: status === "non-verifiee" ? { status } : { status, method: "manuelle", at, note },
    };
  });
  return { ...db, schemaVersion: 2, publications: pubs, imports: db.imports ?? [], sources: db.sources ?? [] };
}

const STEPS: Record<number, (db: Loose) => Loose> = { 1: v1ToV2 };

export function needsMigration(db: { schemaVersion?: number }): boolean {
  return (db.schemaVersion ?? 1) < SCHEMA_VERSION;
}

export function migrate(raw: unknown): { db: Database; applied: string[] } {
  let db = raw as Loose;
  const applied: string[] = [];
  let v = (db.schemaVersion as number | undefined) ?? 1;
  if (v > SCHEMA_VERSION) throw new Error(`Base au schéma v${v}, plus récente que l'application (v${SCHEMA_VERSION}). Mettez l'application à jour.`);
  while (v < SCHEMA_VERSION) {
    const step = STEPS[v];
    if (!step) throw new Error(`Aucune migration connue depuis le schéma v${v}.`);
    db = step(db);
    applied.push(`v${v} → v${v + 1}`);
    v += 1;
  }
  return { db: db as unknown as Database, applied };
}

export function emptyDatabase(): Database {
  return { schemaVersion: SCHEMA_VERSION, characters: [], articles: [], media: [], bible: [], revisions: [], publications: [], log: [], backups: [], imports: [], sources: [] };
}
