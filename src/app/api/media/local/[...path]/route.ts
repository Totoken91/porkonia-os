import { promises as fs } from "node:fs";
import { MIME, statLocal } from "@/media/local";

/** Lecture seule des médias locaux, confinée à PORKONIA_MEDIA_ROOT. */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const rel = path.map(decodeURIComponent).join("/");
  const st = await statLocal(rel);
  if (!st) return new Response("Média local introuvable", { status: 404 });
  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  const data = await fs.readFile(st.abs);
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": "private, max-age=60",
      "x-content-type-options": "nosniff",
      // Un SVG local ne doit pas pouvoir exécuter de script dans l'origine de l'application.
      "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
