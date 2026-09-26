import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Alert, CanonBadge, Window, fmtDate } from "@/components/ui";
import { IconPerson } from "@/components/icons";
import { mediaThumbUrl } from "@/domain/markdown";
import { auditMediaForCharacter } from "@/domain/media-audit";
import { VALIDATION_CHECKS } from "@/domain/ops";
import type { Database } from "@/domain/types";
import { UseRawButton, ValidationControls } from "./validation-card";

export const metadata: Metadata = { title: "Validation des fiches" };

export default async function ValidationPage() {
  const db = (await getDb()) as Database;
  const chars = db.characters
    .filter((c) => !c.deletedAt && (c.external?.bibleName || c.external?.porkopediaId))
    .sort((a, b) => (a.status === b.status ? a.canonicalName.localeCompare(b.canonicalName, "fr") : a.status === "proposition" ? -1 : 1));
  const pending = chars.filter((c) => c.status === "proposition").length;
  return (
    <Window title="Validation des fiches importées" code="PK-140" icon={<IconPerson size={18} />} menu={<Link href="/personnages">← Registre</Link>} status={[`${chars.length} fiche(s) importée(s)`, `${pending} en attente de validation`]}>
      <Alert kind="info">
        Validez chaque fiche individuellement. Le portrait affiché est la <b>copie extraite du DOCX</b>, conservée sans altération. Tant que la{" "}
        <b>photographie brute originale</b> déclarée par la Bible n&apos;est pas fournie et comparée octet pour octet, leur identité n&apos;est <b>pas certifiée</b> :
        Word peut avoir recompressé ou recadré l&apos;image.
      </Alert>
      <div className="space-y-2">
        {chars.map((c) => {
          const p = c.portraitMediaId ? db.media.find((m) => m.id === c.portraitMediaId) : undefined;
          const raw = p?.rawOriginal;
          const rawMedia = raw?.mediaId ? db.media.find((m) => m.id === raw.mediaId) : undefined;
          const declared = p?.external?.originalFilename ?? raw?.declaredFilename ?? null;
          const audit = auditMediaForCharacter(db, c.id);
          const dep = (k: string, conf?: boolean) => audit.filter((a) => a.suggested.some((d) => d.characterId === c.id && d.kind === k && (conf === undefined || d.confirmed === conf))).length;
          const unaudited = c.galleryMediaIds.filter((id) => !db.media.find((m) => m.id === id)?.depictions?.some((d) => d.characterId === c.id)).length;
          const article = c.external?.porkopediaId ? db.articles.find((a) => a.external?.id === c.external!.porkopediaId) : undefined;
          const face = db.bible.find((b) => b.characterIds.includes(c.id) && b.title.startsWith("Visage canonique"));
          return (
            <section key={c.id} id={c.id} className="pk-window !p-2">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Link href={`/personnages/${c.id}`} className="text-[15px] font-bold text-[#7a1016]" style={{ fontFamily: "var(--font-serif)" }}>
                  {c.canonicalName}
                </Link>
                <CanonBadge status={c.status} />
                {c.nicknames.length > 0 && <span className="text-[11px]">dit {c.nicknames.join(", ")}</span>}
                {c.validation && (
                  <span className="text-[11px] opacity-80">
                    Dernière décision : {c.validation.decision} le {fmtDate(c.validation.at)}
                    {c.validation.note ? ` — ${c.validation.note}` : ""}
                  </span>
                )}
              </div>
              <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1.3fr)_minmax(0,1fr)]">
                <div>
                  {p ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaThumbUrl(p) ?? ""} alt={p.name} className="thumb h-48 w-44" />
                  ) : (
                    <div className="thumb grid h-48 w-44 place-items-center">Aucun portrait</div>
                  )}
                  {rawMedia && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaThumbUrl(rawMedia) ?? ""} alt="original brut" className="thumb mt-1 h-24 w-44" />
                  )}
                </div>
                <div className="space-y-1 text-[12px]">
                  {p && (
                    <table className="w-full text-[11px]">
                      <tbody>
                        <tr><td className="pr-2 align-top font-bold">Portrait (copie extraite)</td><td className="break-all">{p.external?.originalRef ?? p.ref} · {p.width}×{p.height} · SHA-256 <code>{p.sha256?.slice(0, 16)}…</code> · {p.nature === "reference-source" ? "référence source" : p.nature}</td></tr>
                        <tr><td className="pr-2 align-top font-bold">Original brut déclaré</td><td className="break-all"><code>{declared ?? "non déclaré"}</code></td></tr>
                        <tr>
                          <td className="pr-2 align-top font-bold">Certification</td>
                          <td>
                            {!raw || raw.status === "non-fournie" ? (
                              <span className="badge amber">Non certifiée — original brut non fourni</span>
                            ) : raw.status === "identique" ? (
                              <span className="badge green">Certifiée identique octet pour octet ({raw.uploadedFilename})</span>
                            ) : (
                              <span className="badge red">Différente de l&apos;original brut ({raw.uploadedFilename}, {raw.width}×{raw.height}) — deux fichiers conservés</span>
                            )}
                            {raw?.uploadedFilename && declared && raw.uploadedFilename !== declared && <div className="text-[10px] text-[#7a0f0f]">Nom déposé différent du nom déclaré.</div>}
                            {(() => {
                              const twins = db.media.filter((x) => x.id !== p.id && !x.deletedAt && x.sha256 && x.sha256 === p.sha256);
                              return twins.length ? (
                                <div className="text-[10px]">
                                  Octets identiques à : {twins.map((t) => <code key={t.id} className="mr-1">{t.external?.originalRef ?? t.ref}</code>)} (même fichier ailleurs ; cela ne prouve pas l&apos;identité avec l&apos;original brut)
                                </div>
                              ) : null;
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                  {p && (!raw || raw.status === "non-fournie") && (
                    <form action={`/api/media/${p.id}/raw-original`} method="post" encType="multipart/form-data" className="flex flex-wrap items-center gap-1">
                      <input type="file" name="file" accept="image/*" required className="pk-input !w-60" />
                      <button className="pk-btn small">Déposer l&apos;original brut pour comparaison</button>
                    </form>
                  )}
                  {rawMedia && c.portraitMediaId !== rawMedia.id && <UseRawButton characterId={c.id} rawMediaId={rawMedia.id} />}
                  <div>
                    <b>Apparence (Bible) :</b> {c.appearance ? <span className="italic">{c.appearance}</span> : <span className="text-[#7a0f0f]">non renseignée</span>}
                  </div>
                  <div className="text-[11px]">
                    Sources : {face ? <Link className="text-[#1d3f8f] underline" href={`/bible?edit=${face.id}`}>{face.title}</Link> : "—"} ·{" "}
                    {article ? <Link className="text-[#1d3f8f] underline" href={`/articles/${article.id}`}>article Porkopédia #{article.external?.id}</Link> : "pas d'article"}
                  </div>
                  <div className="text-[11px]">
                    Galerie : {c.galleryMediaIds.length} média(s) — {dep("apparait", true)} où apparaît (confirmé), {dep("apparait", false)} probable(s), {dep("lien-article")} illustrations
                    de l&apos;article, {dep("lien-indirect")} liens indirects,{" "}
                    {unaudited ? <span className="badge amber">{unaudited} non audité(s)</span> : <span className="badge green">galerie auditée</span>}{" "}
                    <Link className="text-[#1d3f8f] underline" href={`/medias/audit?personnage=${c.id}`}>auditer</Link>
                  </div>
                </div>
                <ValidationControls
                  id={c.id}
                  name={c.canonicalName}
                  revision={c.revision}
                  checks={VALIDATION_CHECKS}
                  initial={c.validation?.checklist ?? {}}
                  hasPortrait={!!c.portraitMediaId}
                />
              </div>
            </section>
          );
        })}
      </div>
    </Window>
  );
}
