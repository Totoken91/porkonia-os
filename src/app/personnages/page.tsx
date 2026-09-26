import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { CanonBadge, DemoBadge, Empty, Window, fmtDate } from "@/components/ui";
import { IconPerson } from "@/components/icons";
import { mediaThumbUrl } from "@/domain/markdown";

export const metadata: Metadata = { title: "Registre national des individus" };

export default async function CharactersPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string }> }) {
  const { q = "", statut = "" } = await searchParams;
  const db = await getDb();
  const needle = q.trim().toLowerCase();
  const rows = db.characters
    .filter((c) => !c.deletedAt)
    .filter((c) => !statut || c.status === statut)
    .filter(
      (c) =>
        !needle ||
        [c.canonicalName, ...c.nicknames, c.role, c.id, ...c.affiliations].some((s) => s.toLowerCase().includes(needle)),
    )
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, "fr"));

  return (
    <Window
      title="Registre national des individus"
      code="PK-101"
      icon={<IconPerson size={18} />}
      toolbar={
        <>
          <Link href="/personnages/nouveau" className="pk-btn primary">
            + Nouvelle fiche
          </Link>
          <Link href="/personnages/validation" className="pk-btn">
            Validation des fiches importées ({db.characters.filter((c) => !c.deletedAt && c.status === "proposition").length})
          </Link>
          <form className="ml-auto flex flex-wrap items-center gap-2">
            <input name="q" defaultValue={q} placeholder="Nom, surnom, fonction, ID…" className="pk-input w-56" />
            <select name="statut" defaultValue={statut} className="pk-select w-36">
              <option value="">Tous statuts</option>
              <option value="canon">Canon</option>
              <option value="proposition">Proposition</option>
              <option value="archive">Archive</option>
            </select>
            <button className="pk-btn">Rechercher</button>
          </form>
        </>
      }
      status={[`${rows.length} individu(s) affiché(s)`, `${db.characters.filter((c) => !c.deletedAt).length} au registre`]}
    >
      {rows.length === 0 ? (
        <Empty>Aucun individu ne correspond. Le registre est formel : cette personne n&apos;existe pas (encore).</Empty>
      ) : (
        <div className="pk-grid-wrap">
          <table className="pk-grid">
            <thead>
              <tr>
                <th style={{ width: 44 }}>Portrait</th>
                <th>Nom canonique</th>
                <th className="hidden sm:table-cell">Fonction</th>
                <th>Statut</th>
                <th className="hidden md:table-cell">ID permanent</th>
                <th className="hidden md:table-cell">Rév.</th>
                <th className="hidden lg:table-cell">Modifié</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const portrait = c.portraitMediaId ? db.media.find((m) => m.id === c.portraitMediaId) : undefined;
                const thumb = portrait ? mediaThumbUrl(portrait) : null;
                return (
                  <tr key={c.id}>
                    <td>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" width={32} height={40} className="thumb h-10 w-8" />
                      ) : (
                        <IconPerson size={28} />
                      )}
                    </td>
                    <td>
                      <Link href={`/personnages/${c.id}`} className="font-bold">
                        {c.canonicalName}
                      </Link>{" "}
                      <DemoBadge show={c.isDemo} />
                      {c.nicknames.length > 0 && <div className="text-[11px] text-[#555]">dit {c.nicknames.join(", ")}</div>}
                    </td>
                    <td className="hidden sm:table-cell">{c.role || "—"}</td>
                    <td>
                      <CanonBadge status={c.status} />
                    </td>
                    <td className="hidden font-mono text-[11px] md:table-cell">{c.id}</td>
                    <td className="hidden md:table-cell">{c.revision}</td>
                    <td className="hidden whitespace-nowrap lg:table-cell">{fmtDate(c.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Window>
  );
}
