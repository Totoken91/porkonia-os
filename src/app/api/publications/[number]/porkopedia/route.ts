import { readDb } from "@/data/store";
import { buildPorkopediaPackage, zipPackage } from "@/export/porkopedia-package";
import { latestRealExtraction } from "@/import/extractions";
import type { Database } from "@/domain/types";

/** Téléchargement du paquet d'intégration Porkopédia (ZIP). Lecture seule : l'export est enregistré par l'action dédiée. */
export async function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  const { number } = await ctx.params;
  const db = (await readDb()) as Database;
  const pub = db.publications.find((p) => p.number === Number(number));
  if (!pub) return new Response("Publication introuvable", { status: 404 });
  const pkg = buildPorkopediaPackage(db, pub, await latestRealExtraction());
  const format = new URL(req.url).searchParams.get("format");
  if (format === "json") return Response.json({ ...pkg, script: undefined, scriptPreview: pkg.script.slice(0, 2000) });
  return new Response(new Uint8Array(zipPackage(pkg)), {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="porkopedia-publication-${String(pub.number).padStart(3, "0")}.zip"`, "cache-control": "no-store" },
  });
}
