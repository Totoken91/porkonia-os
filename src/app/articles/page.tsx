import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { ArticleStatusBadge, DemoBadge, Empty, Window, fmtDate } from "@/components/ui";
import { IconScroll } from "@/components/icons";

export const metadata: Metadata = { title: "Ministère du Lore" };

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string; section?: string }> }) {
  const { q = "", statut = "", section = "" } = await searchParams;
  const db = await getDb();
  const live = db.articles.filter((a) => !a.deletedAt);
  const sections = [...new Set(live.map((a) => a.section).filter(Boolean))].sort((x, y) => x.localeCompare(y, "fr"));
  const needle = q.trim().toLowerCase();
  const rows = live
    .filter((a) => !statut || a.status === statut)
    .filter((a) => !section || a.section === section)
    .filter(
      (a) =>
        !needle ||
        [a.title, a.subtitle, a.slug, a.id, ...a.aliases, ...a.tags].some((s) => s.toLowerCase().includes(needle)) ||
        a.body.toLowerCase().includes(needle),
    )
    .sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
  return (
    <Window
      title="Ministère du Lore — Articles encyclopédiques"
      code="PK-201"
      icon={<IconScroll size={18} />}
      toolbar={
        <>
          <Link href="/articles/nouveau" className="pk-btn primary">
            + Nouvel article
          </Link>
          <form className="ml-auto flex flex-wrap items-center gap-2">
            <input name="q" defaultValue={q} placeholder="Titre, texte, slug, alias, étiquette…" className="pk-input w-60" />
            <select name="section" defaultValue={section} className="pk-select w-44">
              <option value="">Toutes sections</option>
              {sections.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select name="statut" defaultValue={statut} className="pk-select w-32">
              <option value="">Tous statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="valide">Validé</option>
              <option value="publie">Publié</option>
            </select>
            <button className="pk-btn">Rechercher</button>
          </form>
        </>
      }
      status={[`${rows.length} article(s) affiché(s)`, `${live.length} au total`]}
    >
      {rows.length === 0 ? (
        <Empty>Aucun article ne correspond à la recherche.</Empty>
      ) : (
        <div className="pk-grid-wrap">
          <table className="pk-grid">
            <thead>
              <tr>
                <th>Titre</th>
                <th className="hidden md:table-cell">Section</th>
                <th>Statut</th>
                <th className="hidden lg:table-cell">Slug / alias</th>
                <th className="hidden sm:table-cell">Rév.</th>
                <th className="hidden md:table-cell">Modifié</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/articles/${a.id}`} className="font-bold">
                      {a.title}
                    </Link>{" "}
                    <DemoBadge show={a.isDemo} />
                    {a.subtitle && <div className="text-[11px] opacity-80">{a.subtitle}</div>}
                  </td>
                  <td className="hidden md:table-cell">{a.section || "—"}</td>
                  <td>
                    <ArticleStatusBadge status={a.status} />
                  </td>
                  <td className="hidden font-mono text-[11px] lg:table-cell">
                    {a.slug}
                    {a.aliases.length > 0 && <div className="opacity-70">alias : {a.aliases.join(", ")}</div>}
                  </td>
                  <td className="hidden sm:table-cell">{a.revision}</td>
                  <td className="hidden whitespace-nowrap md:table-cell">{fmtDate(a.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Window>
  );
}
