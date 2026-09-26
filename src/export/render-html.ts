/**
 * Markdown → HTML pour Porkopédia (sans HTML brut : remark-rehype l'ignore par défaut).
 * Liens internes [[clé|texte]] → <a href="#" data-article="id-porkopédia"> ; images media: → chemin hébergé sur le site.
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

export interface RenderContext {
  /** Clé [[…]] → identifiant d'article sur Porkopédia (null si introuvable). */
  resolveArticle: (key: string) => { siteId: string; title: string } | null;
  /** Identifiant de média → chemin utilisable sur Porkopédia (null si le média n'y est pas hébergé). */
  resolveMedia: (id: string) => { src: string; name: string } | null;
}

export function renderForPorkopedia(markdown: string, ctx: RenderContext): { html: string; problems: string[] } {
  const problems: string[] = [];
  const TOKEN = "PKLINK";
  const links: { siteId: string; text: string }[] = [];
  const md = markdown
    .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_a, key: string, label?: string) => {
      const t = ctx.resolveArticle(key.trim());
      if (!t) {
        problems.push(`Lien interne non résolu : [[${key}]]`);
        return label ?? key;
      }
      links.push({ siteId: t.siteId, text: (label ?? t.title).trim() });
      return `${TOKEN}${links.length - 1}${TOKEN}`;
    })
    .replace(/!\[([^\]]*)\]\(media:([a-z]{3}_[a-z0-9]+)\)/g, (_a, alt: string, id: string) => {
      const m = ctx.resolveMedia(id);
      if (!m) {
        problems.push(`Image media:${id} non hébergée sur Porkopédia`);
        return "";
      }
      return `![${alt || m.name}](${m.src})`;
    });
  let html = String(unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify).processSync(md));
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  html = html.replace(new RegExp(`${TOKEN}(\\d+)${TOKEN}`, "g"), (_a, i: string) => {
    const l = links[Number(i)]!;
    return `<a href="#" data-article="${esc(l.siteId)}">${esc(l.text)}</a>`;
  });
  return { html: html.trim(), problems };
}
