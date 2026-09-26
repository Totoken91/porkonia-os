import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Window } from "@/components/ui";
import { IconScroll } from "@/components/icons";
import { buildLinkIndex } from "@/domain/markdown";
import { ArticleEditor } from "../article-editor";

export const metadata: Metadata = { title: "Nouvel article" };

export default async function NewArticlePage() {
  const db = await getDb();
  const sections = [...new Set(db.articles.map((a) => a.section).filter(Boolean))];
  return (
    <Window title="Ministère du Lore — Nouvel article" code="PK-202" icon={<IconScroll size={18} />}>
      <ArticleEditor
        index={buildLinkIndex(db)}
        sections={sections}
        characters={db.characters.filter((c) => !c.deletedAt).map((c) => ({ id: c.id, name: c.canonicalName }))}
        media={db.media.filter((m) => !m.deletedAt).map((m) => ({ id: m.id, name: m.name }))}
      />
    </Window>
  );
}
