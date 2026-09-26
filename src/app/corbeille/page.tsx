import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Empty, Window, fmtDate } from "@/components/ui";
import { IconTrash } from "@/components/icons";
import { ActionButton } from "@/components/client";
import { untrashAction } from "@/app/actions";

export const metadata: Metadata = { title: "Corbeille" };

export default async function TrashPage() {
  const db = await getDb();
  const items = [
    ...db.characters.filter((x) => x.deletedAt).map((x) => ({ type: "character" as const, id: x.id, label: x.canonicalName, kind: "Personnage", at: x.deletedAt! })),
    ...db.articles.filter((x) => x.deletedAt).map((x) => ({ type: "article" as const, id: x.id, label: x.title, kind: "Article", at: x.deletedAt! })),
    ...db.media.filter((x) => x.deletedAt).map((x) => ({ type: "media" as const, id: x.id, label: x.name, kind: "Média (référence)", at: x.deletedAt! })),
    ...db.bible.filter((x) => x.deletedAt).map((x) => ({ type: "bible" as const, id: x.id, label: x.title, kind: "Bible", at: x.deletedAt! })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Window title="Corbeille" code="PK-901" icon={<IconTrash size={18} />} status={[`${items.length} élément(s)`, "Aucune suppression physique n'est possible depuis l'interface"]}>
      {items.length === 0 ? (
        <Empty>La corbeille est vide.</Empty>
      ) : (
        <div className="pk-grid-wrap">
          <table className="pk-grid">
            <thead>
              <tr>
                <th>Type</th>
                <th>Élément</th>
                <th>Mis à la corbeille le</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.kind}</td>
                  <td>
                    {i.label} <span className="font-mono text-[10px] opacity-70">{i.id}</span>
                  </td>
                  <td>{fmtDate(i.at)}</td>
                  <td>
                    <ActionButton className="pk-btn small" action={untrashAction.bind(null, i.type, i.id)}>
                      Restaurer
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Window>
  );
}
