import { readDb } from "@/data/store";
import { publicationPackage } from "@/export/export";
import { corsHeaders } from "../../cors";

/** Article publié par id, slug ou alias (compatible #article=...). Jamais de brouillon. */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const k = decodeURIComponent(key);
  const pkg = publicationPackage(await readDb());
  const a = pkg?.articles.find((x) => x.id === k || x.slug === k || x.aliases.includes(k));
  if (!pkg || !a) return new Response(JSON.stringify({ error: "Article non publié ou introuvable" }), { status: 404, headers: corsHeaders() });
  return new Response(JSON.stringify({ apiVersion: 1, publication: pkg.publication.number, article: a }), { headers: corsHeaders() });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
