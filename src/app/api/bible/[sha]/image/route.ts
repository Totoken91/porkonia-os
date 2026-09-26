import { extractDocxFile } from "@/bible/docx-parse";
import { loadOriginal } from "@/bible/docx-store";

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", emf: "image/emf", wmf: "image/wmf" };

/** Aperçu (lecture seule) d'une image contenue dans le DOCX original, sans l'extraire sur disque. */
export async function GET(req: Request, ctx: { params: Promise<{ sha: string }> }) {
  const { sha } = await ctx.params;
  const file = new URL(req.url).searchParams.get("file") ?? "";
  if (!/^(word\/media|docProps)\/[\w.-]+$/.test(file)) return new Response("Chemin invalide", { status: 400 });
  try {
    const data = extractDocxFile(new Uint8Array(await loadOriginal(sha)), file);
    return new Response(new Uint8Array(data), {
      headers: { "content-type": MIME[file.split(".").pop()!.toLowerCase()] ?? "application/octet-stream", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
