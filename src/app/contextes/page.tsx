import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Window } from "@/components/ui";
import { IconRobot } from "@/components/icons";
import { ContextBuilder } from "./context-builder";

export const metadata: Metadata = { title: "Administration des Contextes IA" };

export default async function ContextsPage({ searchParams }: { searchParams: Promise<{ personnage?: string; article?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  return (
    <Window title="Administration des Contextes IA" code="PK-501" icon={<IconRobot size={18} />} status={["Mode déterministe — aucun appel réseau", "Coût : 0"]}>
      <ContextBuilder
        characters={db.characters.filter((c) => !c.deletedAt).map((c) => ({ id: c.id, name: c.canonicalName, demo: c.isDemo }))}
        articles={db.articles.filter((a) => !a.deletedAt).map((a) => ({ id: a.id, name: a.title }))}
        bible={db.bible.filter((b) => !b.deletedAt && b.status !== "archive").map((b) => ({ id: b.id, title: b.title, category: b.category }))}
        preCharacter={sp.personnage}
        preArticle={sp.article}
      />
    </Window>
  );
}
