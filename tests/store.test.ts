import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "porkonia-test-"));
beforeAll(() => {
  process.env.PORKONIA_DATA_DIR = dir;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("stockage JSON local", () => {
  it("persiste, annule en cas d'erreur, et sauvegarde avec vérification", async () => {
    const store = await import("@/data/store");
    const ops = await import("@/domain/ops");
    const db0 = await store.readDb();
    expect(db0.characters.length).toBeGreaterThan(0); // démo initiale
    const c = await store.transaction((db) => ops.createCharacter(db, { canonicalName: "Persisté", nicknames: [], role: "", description: "", appearance: "", biography: "", affiliations: [], events: [], narrativeRefs: [], status: "proposition" }));
    const onDisk = JSON.parse(readFileSync(path.join(dir, "porkonia-db.json"), "utf8"));
    expect(onDisk.characters.some((x: { id: string }) => x.id === c.id)).toBe(true);

    const before = readFileSync(path.join(dir, "porkonia-db.json"), "utf8");
    await expect(
      store.transaction((db) => {
        ops.createCharacter(db, { canonicalName: "Fantôme", nicknames: [], role: "", description: "", appearance: "", biography: "", affiliations: [], events: [], narrativeRefs: [], status: "proposition" });
        throw new Error("échec simulé");
      }),
    ).rejects.toThrow("échec simulé");
    expect(readFileSync(path.join(dir, "porkonia-db.json"), "utf8")).toBe(before);
    expect((await store.readDb()).characters.some((x) => x.canonicalName === "Fantôme")).toBe(false);

    const b = await store.createBackup("test");
    expect(existsSync(b.file)).toBe(true);
    expect((await store.readDb()).backups).toHaveLength(1);
  });
});
