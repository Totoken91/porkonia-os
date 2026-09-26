import { readDb } from "@/data/store";
import { publicationPackage } from "@/export/export";

/** Paquet d'une publication (JSON ou Markdown), pour intégration manuelle dans Porkopédia. */
export async function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  const { number } = await ctx.params;
  const pkg = publicationPackage(await readDb(), Number(number));
  if (!pkg) return new Response("Publication introuvable", { status: 404 });
  const md = new URL(req.url).searchParams.get("format") === "md";
  const name = `porkonia-publication-${pkg.publication.number}`;
  if (md) {
    const body = [
      `# Publication n°${pkg.publication.number} — ${pkg.publication.createdAt}`,
      pkg.publication.note && `> ${pkg.publication.note}`,
      `Empreinte : ${pkg.publication.contentHash}`,
      `Manifeste : +${pkg.manifest.added.length} ~${pkg.manifest.modified.length} −${pkg.manifest.removed.length}`,
      ...pkg.articles.map(
        (a) =>
          `\n---\n\n<!-- id: ${a.id} · slug: ${a.slug} · alias: ${a.aliases.join(", ")} · rév. ${a.revision} -->\n# ${a.title}\n\n_${a.subtitle}_\n\n${a.lead}\n\n${a.body}\n\nMédias : ${a.media.map((m) => `${m.name} <${m.ref}>`).join(" · ") || "—"}`,
      ),
    ]
      .filter(Boolean)
      .join("\n\n");
    return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${name}.md"` } });
  }
  return new Response(JSON.stringify(pkg, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${name}.json"` },
  });
}
