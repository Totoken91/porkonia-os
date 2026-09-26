import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { DemoBadge, Empty, MediaCanonBadge, Window } from "@/components/ui";
import { IconCamera } from "@/components/icons";
import { ActionButton } from "@/components/client";
import { mediaThumbUrl, mediaUrl } from "@/domain/markdown";
import { checkLinksAction } from "@/app/actions";
import { NewMediaForm } from "./media-forms";

export const metadata: Metadata = { title: "Archives audiovisuelles" };

type SP = { nouveau?: string; q?: string; type?: string; lieu?: string; statut?: string; lien?: string; vue?: string; associer?: string; article?: string };

export default async function MediaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const db = await getDb();
  const live = db.media.filter((m) => !m.deletedAt);
  const needle = (sp.q ?? "").trim().toLowerCase();
  const charName = (id: string) => db.characters.find((c) => c.id === id)?.canonicalName ?? id;
  const rows = live
    .filter((m) => !sp.type || m.kind === sp.type)
    .filter((m) => !sp.lieu || m.location === sp.lieu)
    .filter((m) => !sp.statut || m.canonStatus === sp.statut)
    .filter((m) => !sp.lien || (sp.lien === "erreur" ? m.lastCheck?.status === "erreur" : sp.lien === "jamais" ? !m.lastCheck : m.lastCheck?.status === "ok"))
    .filter((m) => !needle || [m.name, m.description, m.ref, m.id, m.provenance.source, ...m.characterIds.map(charName)].some((s) => s.toLowerCase().includes(needle)));
  const grid = sp.vue === "grille";
  const qs = (patch: Partial<SP>) => "?" + new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <Window
      title="Archives audiovisuelles — Bureau des illustrations homologuées"
      code="PK-301"
      icon={<IconCamera size={18} />}
      menu={
        <>
          <a href="/api/medias/export?format=csv">Exporter les références (CSV)</a>
          <a href="/api/medias/export?format=json">Exporter les références (JSON)</a>
          <Link href={qs({ vue: grid ? "" : "grille" })}>{grid ? "Vue tableau" : "Vue vignettes"}</Link>
        </>
      }
      toolbar={
        <form className="flex w-full flex-wrap items-center gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Nom, URL, personnage, provenance…" className="pk-input w-56" />
          <select name="type" defaultValue={sp.type ?? ""} className="pk-select w-32">
            <option value="">Tous types</option>
            {["image", "illustration", "photo", "video", "audio", "logo", "document", "autre"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select name="lieu" defaultValue={sp.lieu ?? ""} className="pk-select w-28">
            <option value="">Externe + local</option>
            <option value="externe">Externe</option>
            <option value="locale">Local</option>
          </select>
          <select name="statut" defaultValue={sp.statut ?? ""} className="pk-select w-32">
            <option value="">Tous statuts</option>
            <option value="officiel">Officiel</option>
            <option value="proposition">Proposition</option>
            <option value="variante">Variante</option>
            <option value="archive">Archive</option>
          </select>
          <select name="lien" defaultValue={sp.lien ?? ""} className="pk-select w-36">
            <option value="">Tous liens</option>
            <option value="ok">Liens OK</option>
            <option value="erreur">Liens morts</option>
            <option value="jamais">Jamais vérifiés</option>
          </select>
          {sp.vue && <input type="hidden" name="vue" value={sp.vue} />}
          <button className="pk-btn">Filtrer</button>
          <span className="ml-auto">
            <ActionButton className="pk-btn amber" action={checkLinksAction.bind(null, rows.map((m) => m.id))} disabled={rows.length === 0}>
              Vérifier les {rows.length} lien(s) affichés
            </ActionButton>
          </span>
        </form>
      }
      status={[`${rows.length} média(s) affiché(s)`, `${live.filter((m) => m.location === "externe").length} externes`, `${live.filter((m) => m.location === "locale").length} locaux`]}
    >
      <details className="pk-fieldset mb-2" open={!!(sp.associer || sp.article || sp.nouveau)}>
        <summary className="cursor-pointer font-bold text-[#7a1016]">Référencer des médias (sans les déplacer)</summary>
        <div className="mt-2">
          <NewMediaForm
            characters={db.characters.filter((c) => !c.deletedAt).map((c) => ({ id: c.id, name: c.canonicalName }))}
            articles={db.articles.filter((a) => !a.deletedAt).map((a) => ({ id: a.id, name: a.title }))}
            preCharacter={sp.associer}
            preArticle={sp.article}
          />
        </div>
      </details>

      {rows.length === 0 ? (
        <Empty>Aucun média ne correspond.</Empty>
      ) : grid ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((m) => {
            const t = mediaThumbUrl(m);
            return (
              <Link key={m.id} href={`/medias/${m.id}`} className="pk-window block !p-2 text-black no-underline">
                {t ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t} alt={m.name} loading="lazy" className="thumb h-32 w-full" />
                ) : (
                  <div className="thumb grid h-32 place-items-center">{m.kind}</div>
                )}
                <div className="mt-1 truncate font-bold">{m.name}</div>
                <div className="flex flex-wrap gap-1">
                  <MediaCanonBadge status={m.canonStatus} />
                  <span className="badge grey">{m.location}</span>
                  {m.lastCheck?.status === "erreur" && <span className="badge red">Lien mort</span>}
                  <DemoBadge show={m.isDemo} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="pk-grid-wrap">
          <table className="pk-grid">
            <thead>
              <tr>
                <th>Aperçu</th>
                <th>Nom</th>
                <th>Statut</th>
                <th className="hidden md:table-cell">Emplacement</th>
                <th className="hidden lg:table-cell">Associations</th>
                <th>Lien</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const t = mediaThumbUrl(m);
                return (
                  <tr key={m.id}>
                    <td>
                      {t ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t} alt="" loading="lazy" className="thumb h-12 w-16" />
                      ) : (
                        <span className="badge grey">{m.kind}</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/medias/${m.id}`} className="font-bold">
                        {m.name}
                      </Link>{" "}
                      <DemoBadge show={m.isDemo} />
                      <div className="text-[11px] opacity-80">
                        {m.kind}
                        {m.width ? ` · ${m.width}×${m.height}` : ""}
                        {m.format ? ` · ${m.format}` : ""}
                        {m.variantOf ? " · variante" : ""}
                      </div>
                    </td>
                    <td>
                      <MediaCanonBadge status={m.canonStatus} />
                    </td>
                    <td className="hidden max-w-xs md:table-cell">
                      <span className="badge grey">{m.location}</span>{" "}
                      <a href={mediaUrl(m)} target="_blank" rel="noreferrer" className="break-all font-mono text-[11px]">
                        {m.ref}
                      </a>
                    </td>
                    <td className="hidden text-[11px] lg:table-cell">
                      {m.characterIds.map(charName).join(", ") || "—"}
                      {m.articleIds.length > 0 && <div>{m.articleIds.length} article(s)</div>}
                    </td>
                    <td>
                      {!m.lastCheck ? (
                        <span className="badge grey">Non vérifié</span>
                      ) : m.lastCheck.status === "ok" ? (
                        <span className="badge green">OK</span>
                      ) : (
                        <span className="badge red" title={m.lastCheck.message}>
                          Mort {m.lastCheck.httpStatus ?? ""}
                        </span>
                      )}
                    </td>
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
