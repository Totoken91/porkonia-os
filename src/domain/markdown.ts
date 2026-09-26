/**
 * Utilitaires Markdown utilisables côté client ET serveur (aucune dépendance Node).
 */
import type { Article, Database, Media } from "./types";

/** URL affichable d'un média : l'URL externe telle quelle, ou le proxy lecture seule pour les fichiers locaux. */
export function mediaUrl(m: Pick<Media, "location" | "ref">): string {
  return m.location === "externe" ? m.ref : `/api/media/local/${m.ref.split("/").map(encodeURIComponent).join("/")}`;
}

export function mediaThumbUrl(m: Pick<Media, "location" | "ref" | "thumbnailRef" | "kind">): string | null {
  if (m.thumbnailRef) return m.location === "externe" ? m.thumbnailRef : mediaUrl({ location: "locale", ref: m.thumbnailRef });
  const imageLike = ["image", "illustration", "photo", "logo"].includes(m.kind) || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(m.ref);
  return imageLike ? mediaUrl(m) : null;
}

/** Index léger transmissible à un composant client. */
export interface LinkIndex {
  articles: { id: string; slug: string; aliases: string[]; title: string }[];
  media: { id: string; url: string; name: string }[];
}

export function buildLinkIndex(db: Pick<Database, "articles" | "media">): LinkIndex {
  return {
    articles: db.articles.filter((a) => !a.deletedAt).map((a) => ({ id: a.id, slug: a.slug, aliases: a.aliases, title: a.title })),
    media: db.media.filter((m) => !m.deletedAt).map((m) => ({ id: m.id, url: mediaUrl(m), name: m.name })),
  };
}

export function findInIndex(index: LinkIndex, key: string): LinkIndex["articles"][number] | undefined {
  const k = key.trim();
  return (
    index.articles.find((a) => a.id === k) ??
    index.articles.find((a) => a.slug === k) ??
    index.articles.find((a) => a.aliases.includes(k))
  );
}

/**
 * Convertit la syntaxe interne en Markdown standard avant rendu :
 * - [[cle|texte]] → lien vers l'article (id, slug ou alias) ; non résolu → marqué.
 * - (media:med_xxx) → URL réelle du média.
 */
export function expandInternalSyntax(body: string, index: LinkIndex, linkBase = "/articles/"): string {
  return body
    .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_all, key: string, label?: string) => {
      const a = findInIndex(index, key);
      const text = (label ?? a?.title ?? key).trim();
      if (!a) return `**[lien cassé : ${text}]**`;
      return `[${text}](${linkBase}${a.id})`;
    })
    .replace(/\(media:([a-z]{3}_[a-z0-9]+)\)/g, (_all, id: string) => {
      const m = index.media.find((x) => x.id === id);
      return m ? `(${m.url})` : "(#media-introuvable)";
    });
}

export type ArticleLite = Pick<Article, "id" | "title" | "slug">;
