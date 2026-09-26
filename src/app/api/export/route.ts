import { readDb } from "@/data/store";
import { buildFullExport } from "@/export/export";

/** Export complet, autonome et lisible sans Porkonia OS. */
export async function GET() {
  const db = await readDb();
  const body = JSON.stringify(buildFullExport(db), null, 2);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="porkonia-export-${stamp}.json"`,
      "cache-control": "no-store",
    },
  });
}
