import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Alert, Window } from "@/components/ui";
import { IconCamera } from "@/components/icons";
import { auditMediaForCharacter } from "@/domain/media-audit";
import { mediaThumbUrl } from "@/domain/markdown";
import type { Database } from "@/domain/types";
import { AuditTable } from "./audit-table";

export const metadata: Metadata = { title: "Audit des associations médias" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ personnage?: string }> }) {
  const { personnage } = await searchParams;
  const db = (await getDb()) as Database;
  const chars = db.characters.filter((c) => !c.deletedAt).sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, "fr"));
  const focus = personnage && chars.some((c) => c.id === personnage) ? personnage : undefined;
  const items = auditMediaForCharacter(db, focus);
  const names = Object.fromEntries(chars.map((c) => [c.id, c.canonicalName]));
  const thumbs = Object.fromEntries(items.map((i) => [i.mediaId, mediaThumbUrl(db.media.find((m) => m.id === i.mediaId)!)]));
  const focusChar = focus ? chars.find((c) => c.id === focus) : undefined;
  const stat = (k: string) => items.filter((i) => i.suggested.some((d) => d.characterId === focus && d.kind === k)).length;
  return (
    <Window title="Audit des associations médias ↔ personnages" code="PK-320" icon={<IconCamera size={18} />} menu={<Link href="/medias">← Archives audiovisuelles</Link>} status={[`${items.length} média(s) audité(s)`, `${items.filter((i) => i.changed).length} à revoir`]}>
      <Alert kind="info">
        Un média peut représenter plusieurs personnages <b>sans devenir leur portrait officiel</b>. L&apos;audit propose un usage (portrait source, illustration
        narrative, scène collective, variante générée, archive) et, pour chaque personnage, un rôle avec sa <b>base</b> (Bible, texte alternatif, légende, nom de
        fichier, article). Les rôles « Apparaît » déduits automatiquement restent <b>à confirmer</b>. Rien n&apos;est appliqué sans votre sélection ; les portraits
        officiels ne sont jamais modifiés ici.
      </Alert>
      <form className="mb-2 flex flex-wrap items-center gap-2">
        <select name="personnage" defaultValue={focus ?? ""} className="pk-select !w-72">
          <option value="">Tous les médias liés à des personnages</option>
          {chars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.canonicalName}
            </option>
          ))}
        </select>
        <button className="pk-btn">Filtrer</button>
        {focusChar && (
          <span className="text-[12px]">
            <b>{focusChar.canonicalName}</b> : {stat("portrait-source")} portrait source · {stat("apparait")} où il/elle apparaît (probable ou confirmé) ·{" "}
            {stat("lien-article")} illustrations de son article sans le/la nommer · {stat("lien-indirect")} liens indirects
          </span>
        )}
      </form>
      <AuditTable key={focus ?? "all"} items={items} names={names} thumbs={thumbs} focus={focus} />
    </Window>
  );
}
