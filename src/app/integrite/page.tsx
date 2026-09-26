import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Alert, Window } from "@/components/ui";
import { IconShield } from "@/components/icons";
import { integrityReport } from "@/domain/integrity";
import type { Database } from "@/domain/types";

export const metadata: Metadata = { title: "Contrôle national d'intégrité" };

const HREF = { character: "/personnages/", article: "/articles/", media: "/medias/", bible: "/bible?edit=" } as const;

export default async function IntegrityPage() {
  const db = (await getDb()) as Database;
  const issues = integrityReport(db);
  const label = (t: keyof typeof HREF, id: string) =>
    t === "character" ? db.characters.find((x) => x.id === id)?.canonicalName : t === "article" ? db.articles.find((x) => x.id === id)?.title : t === "media" ? db.media.find((x) => x.id === id)?.name : db.bible.find((x) => x.id === id)?.title;
  return (
    <Window title="Contrôle national d'intégrité" code="PK-701" icon={<IconShield size={18} />} status={[`${issues.filter((i) => i.level === "erreur").length} erreur(s)`, `${issues.filter((i) => i.level === "avertissement").length} avertissement(s)`]}>
      <p className="mb-2">
        Vérifie : portraits officiels (existants, homologués, associés), relations et associations orphelines, slugs/alias en double, liens internes
        [[…]] non résolus, images insérées introuvables, liens médias morts (selon la dernière vérification).
      </p>
      {issues.length === 0 ? (
        <Alert kind="ok">Aucune anomalie détectée. Le Ministère vous remercie pour votre rigueur.</Alert>
      ) : (
        <div className="pk-grid-wrap">
          <table className="pk-grid">
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Élément</th>
                <th>Anomalie</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i, n) => (
                <tr key={n}>
                  <td>{i.level === "erreur" ? <span className="badge red">Erreur</span> : <span className="badge amber">Avertissement</span>}</td>
                  <td>
                    <Link href={`${HREF[i.entityType]}${i.entityId}`} className="text-[#1d3f8f] underline">
                      {label(i.entityType, i.entityId) ?? i.entityId}
                    </Link>
                  </td>
                  <td>{i.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Window>
  );
}
