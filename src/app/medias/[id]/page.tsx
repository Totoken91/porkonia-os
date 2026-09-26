import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/server/page-data";
import { Alert, DemoBadge, MediaCanonBadge, Window, fmtDate } from "@/components/ui";
import { IconCamera } from "@/components/icons";
import { Tabs } from "@/components/tabs";
import { RevisionHistory } from "@/components/revisions";
import { ActionButton } from "@/components/client";
import { mediaThumbUrl, mediaUrl } from "@/domain/markdown";
import { revisionsOf } from "@/domain/ops";
import type { Database } from "@/domain/types";
import { checkLinksAction, untrashAction } from "@/app/actions";
import { EditMediaForm } from "../media-forms";

export default async function MediaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await getDb()) as Database;
  const m = db.media.find((x) => x.id === id);
  if (!m) notFound();
  const url = mediaUrl(m);
  const thumb = mediaThumbUrl(m);
  const original = m.variantOf ? db.media.find((x) => x.id === m.variantOf) : undefined;
  const variants = db.media.filter((x) => x.variantOf === m.id);
  const portraitOf = db.characters.filter((c) => c.portraitMediaId === m.id);

  return (
    <Window
      title={`Média — ${m.name}`}
      code="PK-310"
      icon={<IconCamera size={18} />}
      menu={<Link href="/medias">← Archives audiovisuelles</Link>}
      status={[`ID permanent : ${m.id}`, `Révision ${m.revision}`, `Référencé le ${fmtDate(m.createdAt)}`, `Provenance : ${m.provenance.source}`]}
    >
      {m.deletedAt && (
        <Alert kind="error">
          Référence dans la corbeille.{" "}
          <ActionButton className="pk-btn small" action={untrashAction.bind(null, "media", m.id)}>
            Restaurer
          </ActionButton>
        </Alert>
      )}
      <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-2">
          {m.kind === "video" ? (
            <video src={url} controls className="thumb w-full" preload="metadata" />
          ) : m.kind === "audio" ? (
            <audio src={url} controls className="w-full" preload="none" />
          ) : thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={m.name} className="thumb max-h-96 w-full" />
          ) : (
            <div className="thumb grid h-48 place-items-center">Aucun aperçu disponible</div>
          )}
          <div className="flex flex-wrap items-center gap-1">
            <MediaCanonBadge status={m.canonStatus} />
            <span className="badge grey">{m.location}</span>
            <span className="badge grey">{m.kind}</span>
            <DemoBadge show={m.isDemo} />
            {portraitOf.map((c) => (
              <span key={c.id} className="badge green">
                Portrait de {c.canonicalName}
              </span>
            ))}
          </div>
          <table className="w-full text-[11px]">
            <tbody>
              <tr><td className="pr-2 align-top font-bold">Référence</td><td className="break-all font-mono"><a href={url} target="_blank" rel="noreferrer" className="text-[#1d3f8f] underline">{m.ref}</a></td></tr>
              <tr><td className="pr-2 font-bold">Dimensions</td><td>{m.width ? `${m.width} × ${m.height} px` : "—"}</td></tr>
              <tr><td className="pr-2 font-bold">Format</td><td>{m.format ?? "—"}</td></tr>
              <tr><td className="pr-2 font-bold">Nature</td><td>{m.nature === "reference-source" ? "Référence source (non modifiée)" : m.nature === "generation" ? "Génération" : "Indéterminée"}</td></tr>
              {m.external && (
                <tr><td className="pr-2 align-top font-bold">Origine</td><td className="break-all">{m.external.source} — <code>{m.external.originalRef}</code>{m.external.originalFilename ? ` (fichier source : ${m.external.originalFilename})` : ""}{m.external.displayed === false ? " — non affichée lors de l'extraction" : ""}</td></tr>
              )}
              <tr><td className="pr-2 font-bold">SHA-256</td><td className="break-all font-mono">{m.sha256 ?? "non calculée"}</td></tr>
              <tr><td className="pr-2 font-bold">Sauvegarde</td><td className="break-all">{m.location === "externe" ? "Référence externe : ce catalogue N'EST PAS une copie du fichier (voir npm run media:backup)." : m.external?.source === "bible-docx" ? "Copie octet pour octet extraite du DOCX original (conservé)." : m.backupPath ?? "aucune copie de sauvegarde"}</td></tr>
              <tr>
                <td className="pr-2 font-bold">Vérification</td>
                <td>
                  {m.lastCheck ? `${m.lastCheck.status}${m.lastCheck.httpStatus ? ` (HTTP ${m.lastCheck.httpStatus})` : ""}${m.lastCheck.message ? ` — ${m.lastCheck.message}` : ""} le ${fmtDate(m.lastCheck.checkedAt)}` : "jamais"}
                </td>
              </tr>
            </tbody>
          </table>
          <ActionButton className="pk-btn amber" action={checkLinksAction.bind(null, [m.id])}>
            Vérifier le lien maintenant
          </ActionButton>
        </div>
        <Tabs
          tabs={[
            { label: "Fiche", content: <EditMediaForm media={m} /> },
            {
              label: "Associations & versions",
              content: (
                <div className="space-y-2">
                  <fieldset className="pk-fieldset">
                    <legend>Usage et rôles (audit)</legend>
                    <p>Usage : <b>{m.usage ?? "non classé"}</b> · <Link className="text-[#1d3f8f] underline" href="/medias/audit">audit des associations</Link></p>
                    {(m.depictions ?? []).length > 0 ? (
                      <ul className="list-disc pl-5 text-[12px]">
                        {m.depictions!.map((d) => (
                          <li key={d.characterId}>
                            {db.characters.find((c) => c.id === d.characterId)?.canonicalName ?? d.characterId} — <b>{d.kind}</b> {d.confirmed ? "(confirmé)" : "(à confirmer)"} <span className="opacity-70">· {d.basis}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="italic">Rôles non audités.</p>
                    )}
                    {m.rawOriginal && (
                      <p className="mt-1 text-[12px]">
                        Original brut : {m.rawOriginal.status === "identique" ? "certifié identique" : m.rawOriginal.status === "differente" ? "différent (fichier distinct conservé)" : "non fourni"} — déclaré <code>{m.rawOriginal.declaredFilename ?? "?"}</code>
                      </p>
                    )}
                  </fieldset>
                  <fieldset className="pk-fieldset">
                    <legend>Personnages</legend>
                    {m.characterIds.length === 0 ? <p className="italic">Aucun.</p> : (
                      <ul className="list-disc pl-5">
                        {m.characterIds.map((cid) => (
                          <li key={cid}><Link className="text-[#1d3f8f] underline" href={`/personnages/${cid}`}>{db.characters.find((c) => c.id === cid)?.canonicalName ?? cid}</Link></li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-1 text-[11px]">Les associations se gèrent depuis la fiche du personnage (onglet Portrait & galerie).</p>
                  </fieldset>
                  <fieldset className="pk-fieldset">
                    <legend>Articles</legend>
                    {m.articleIds.length === 0 ? <p className="italic">Aucun.</p> : (
                      <ul className="list-disc pl-5">
                        {m.articleIds.map((aid) => (
                          <li key={aid}><Link className="text-[#1d3f8f] underline" href={`/articles/${aid}`}>{db.articles.find((a) => a.id === aid)?.title ?? aid}</Link></li>
                        ))}
                      </ul>
                    )}
                  </fieldset>
                  <fieldset className="pk-fieldset">
                    <legend>Versions</legend>
                    {original && <p>Variante / nouvelle version de : <Link className="text-[#1d3f8f] underline" href={`/medias/${original.id}`}>{original.name}</Link> (original conservé)</p>}
                    {variants.length > 0 ? (
                      <ul className="list-disc pl-5">
                        {variants.map((v) => (
                          <li key={v.id}><Link className="text-[#1d3f8f] underline" href={`/medias/${v.id}`}>{v.name}</Link> <MediaCanonBadge status={v.canonStatus} /></li>
                        ))}
                      </ul>
                    ) : !original && <p className="italic">Aucune variante.</p>}
                  </fieldset>
                </div>
              ),
            },
            { label: "Historique", content: <RevisionHistory type="media" entityId={m.id} current={m as never} revisions={revisionsOf(db, "media", m.id)} /> },
          ]}
        />
      </div>
    </Window>
  );
}
