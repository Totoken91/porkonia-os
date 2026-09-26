import path from "node:path";
import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { createBackup, readDb, transaction, writeAtomic } from "@/data/store";
import { mediaRoot } from "@/media/local";
import { imageSize } from "@/bible/docx-parse";
import { registerRawOriginal } from "@/domain/ops";
import { sha256 } from "@/domain/util";

/**
 * Dépôt de la photographie brute originale d'une copie extraite, pour comparaison octet pour octet.
 * Le fichier (s'il diffère) est stocké sous medias-locales/originaux-bruts/<sha256>.<ext>, en lecture seule, jamais écrasé.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const back = new URL(req.headers.get("referer") ?? "/personnages/validation", req.url);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Fichier image attendu." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const hash = sha256(buf);
  const db = await readDb();
  const m = db.media.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: "Média introuvable." }, { status: 404 });
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  let ref: string | null = null;
  if (hash !== m.sha256) {
    ref = `originaux-bruts/${hash}.${ext}`;
    const abs = path.join(mediaRoot(), ref);
    try {
      await fs.access(abs);
    } catch {
      await writeAtomic(abs, buf);
      await fs.chmod(abs, 0o444).catch(() => undefined);
    }
    if (sha256(await fs.readFile(abs)) !== hash) return NextResponse.json({ error: "Copie corrompue." }, { status: 500 });
  }
  const size = imageSize(new Uint8Array(buf));
  await createBackup(`avant enregistrement de l'original brut de ${m.name}`);
  await transaction((d) => registerRawOriginal(d, id, { uploadedFilename: file.name, sha256: hash, width: size?.width ?? null, height: size?.height ?? null, ref, format: ext }));
  back.hash = "";
  return NextResponse.redirect(back, 303);
}
