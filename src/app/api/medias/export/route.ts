import { readDb } from "@/data/store";
import { mediaReferences, toCsv } from "@/export/export";

/** Export du catalogue des références médias (aucun fichier n'est inclus ni déplacé). */
export async function GET(req: Request) {
  const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "csv";
  const rows = mediaReferences(await readDb());
  const stamp = new Date().toISOString().slice(0, 10);
  const body = format === "json" ? JSON.stringify({ format: "porkonia-os/media-references@1", exportedAt: new Date().toISOString(), media: rows }, null, 2) : "﻿" + toCsv(rows);
  return new Response(body, {
    headers: {
      "content-type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="porkonia-medias-${stamp}.${format}"`,
      "cache-control": "no-store",
    },
  });
}
