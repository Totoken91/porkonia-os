import { notFound, redirect } from "next/navigation";
import { getDb } from "@/server/page-data";
import { resolveArticle } from "@/domain/ops";
import type { Database } from "@/domain/types";

/** Résolution d'un ancien lien (slug, alias, identifiant Porkopédia) vers l'identifiant permanent. */
export default async function AliasRedirect({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const a = resolveArticle((await getDb()) as Database, key);
  if (!a) notFound();
  redirect(`/articles/${a.id}`);
}
