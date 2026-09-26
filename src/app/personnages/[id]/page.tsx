import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/server/page-data";
import { CanonBadge, DemoBadge, Window, fmtDate, Alert } from "@/components/ui";
import { IconPerson } from "@/components/icons";
import { Tabs } from "@/components/tabs";
import { RevisionHistory } from "@/components/revisions";
import { mediaThumbUrl } from "@/domain/markdown";
import { revisionsOf } from "@/domain/ops";
import type { Database, Media } from "@/domain/types";
import { CharacterForm, GalleryPanel, RelationsEditor } from "../character-forms";
import { ActionButton } from "@/components/client";
import { untrashAction } from "@/app/actions";

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await getDb()) as Database;
  const c = db.characters.find((x) => x.id === id);
  if (!c) notFound();

  const name = (cid: string) => db.characters.find((x) => x.id === cid)?.canonicalName ?? cid;
  const lite = (m: Media) => ({
    id: m.id,
    name: m.name,
    thumb: mediaThumbUrl(m),
    canonStatus: m.canonStatus,
    ref: m.ref,
    linkedTo: m.characterIds.filter((x) => x !== c.id).map(name),
  });
  const liveMedia = db.media.filter((m) => !m.deletedAt);
  const gallery = liveMedia.filter((m) => m.characterIds.includes(c.id)).map(lite);
  const others = liveMedia.filter((m) => !m.characterIds.includes(c.id)).map(lite);
  const articles = db.articles.filter((a) => !a.deletedAt && a.characterIds.includes(c.id));
  const incoming = db.characters.filter((x) => !x.deletedAt && x.relations.some((r) => r.targetId === c.id));

  return (
    <Window
      title={`Fiche individuelle — ${c.canonicalName}`}
      code={`PK-1${String(db.characters.indexOf(c) + 10).padStart(2, "0")}`}
      icon={<IconPerson size={18} />}
      menu={
        <>
          <Link href="/personnages">← Registre</Link>
          <Link href={`/contextes?personnage=${c.id}`}>Préparer un contexte IA</Link>
        </>
      }
      status={[`ID permanent : ${c.id}`, `Révision ${c.revision}`, `Modifié le ${fmtDate(c.updatedAt)}`, `Source : ${c.provenance.source}`]}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-bold text-[#7a1016]">{c.canonicalName}</span>
        <CanonBadge status={c.status} />
        <DemoBadge show={c.isDemo} />
      </div>
      {c.deletedAt && (
        <Alert kind="error">
          Cette fiche est dans la corbeille depuis le {fmtDate(c.deletedAt)}.{" "}
          <ActionButton action={untrashAction.bind(null, "character", c.id)} className="pk-btn small">
            Restaurer
          </ActionButton>
        </Alert>
      )}
      {c.status === "proposition" && <Alert kind="info">Proposition non validée : ces informations ne sont pas canoniques.</Alert>}
      <Tabs
        tabs={[
          { label: "Fiche", content: <CharacterForm key={c.revision} character={c} /> },
          {
            label: `Portrait & galerie (${gallery.length})`,
            content: <GalleryPanel character={c} gallery={gallery} others={others} />,
          },
          {
            label: `Relations (${c.relations.length})`,
            content: (
              <div className="space-y-3">
                <RelationsEditor
                  key={c.revision}
                  character={c}
                  candidates={db.characters.filter((x) => !x.deletedAt && x.id !== c.id).map((x) => ({ id: x.id, name: x.canonicalName }))}
                />
                <fieldset className="pk-fieldset">
                  <legend>Références entrantes</legend>
                  {incoming.length === 0 && articles.length === 0 ? (
                    <p className="italic">Aucune.</p>
                  ) : (
                    <ul className="list-disc pl-5">
                      {incoming.map((x) => (
                        <li key={x.id}>
                          <Link className="text-[#1d3f8f] underline" href={`/personnages/${x.id}`}>{x.canonicalName}</Link> :{" "}
                          {x.relations.filter((r) => r.targetId === c.id).map((r) => r.kind).join(", ")}
                        </li>
                      ))}
                      {articles.map((a) => (
                        <li key={a.id}>
                          Article <Link className="text-[#1d3f8f] underline" href={`/articles/${a.id}`}>{a.title}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </fieldset>
              </div>
            ),
          },
          {
            label: "Historique",
            content: <RevisionHistory type="character" entityId={c.id} current={c as never} revisions={revisionsOf(db, "character", c.id)} />,
          },
        ]}
      />
    </Window>
  );
}
