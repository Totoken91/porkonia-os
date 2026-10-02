/**
 * Génère les données hors ligne de PigNet Navigateur à partir d'une extraction de Porkopédia
 * (format « porkonia-os/porkopedia-extraction@1 », voir la branche archive/atelier).
 *
 *   npm run content:porkopedia -- <chemin/extraction.json>
 *
 * - Sélection d'articles (liste ci-dessous), HTML nettoyé par liste blanche (aucun script, aucun style).
 * - Images : URL absolues vers Porkopédia (rien n'est copié).
 * - Catalogue complet (id, titre, section) pour la recherche et les liens vers des notices non embarquées.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Root, Element } from "hast";

const SITE = "https://porkopedia.totoken.chatgpt.site/";
/** Les images de Porkopédia sont servies depuis la copie locale public/porkopedia/ (site protégé par mot de passe). */
const local = (u: string) => (u.startsWith(SITE + "assets/") ? "/porkopedia/" + u.slice(SITE.length + 7) : u);
const SELECTION = [
  "douzi",
  "douzi-city",
  "la-pork-id",
  "le-niveau-de-banquet-vii",
  "le-douze-sacre",
  "le-grand-banquet",
  "gobelin",
  "dj-viteau",
  "le-premier-groin",
  "luis-fontanillas",
  "stanley-ferret",
  "coup-de-la-mairie-de-hamelot",
];

const src = process.argv[2];
if (!src) throw new Error("Usage : npm run content:porkopedia -- <extraction.json>");
const ex = JSON.parse(readFileSync(src, "utf8")) as { extractionId: string; extractedAt: string; articles: { id: string; title: string; sub: string; section: string; lead: string; image: string | null; html: string }[] };

const schema = {
  ...defaultSchema,
  tagNames: ["p", "h2", "h3", "h4", "ul", "ol", "li", "b", "i", "strong", "em", "a", "figure", "figcaption", "img", "table", "thead", "tbody", "tr", "th", "td", "blockquote", "br", "div", "span", "section", "aside"],
  attributes: { a: ["dataArticle"], img: ["src", "alt"], "*": ["className"] },
  protocols: { src: ["https"] },
  clobber: [],
};

function absolutize() {
  return (tree: Root) => {
    const walk = (n: Root | Element) => {
      for (const c of n.children) {
        if (c.type !== "element") continue;
        if (c.tagName === "img" && typeof c.properties.src === "string" && !/^https?:/.test(c.properties.src)) c.properties.src = local(new URL(c.properties.src, SITE).toString());
        if (c.tagName === "a") delete c.properties.href;
        walk(c);
      }
    };
    walk(tree);
  };
}

const clean = (html: string) => String(unified().use(rehypeParse, { fragment: true }).use(absolutize).use(rehypeSanitize, schema).use(rehypeStringify).processSync(html));

const articles = SELECTION.map((id) => {
  const a = ex.articles.find((x) => x.id === id);
  if (!a) throw new Error(`Article absent de l'extraction : ${id}`);
  return { id: a.id, title: a.title, sub: a.sub, section: a.section, lead: a.lead, image: a.image ? local(new URL(a.image, SITE).toString()) : null, html: clean(a.html) };
});
const catalog = ex.articles.map((a) => ({ id: a.id, title: a.title, section: a.section })).sort((x, y) => x.title.localeCompare(y.title, "fr"));
writeFileSync(
  "src/content/porkopedia/porkopedia.json",
  JSON.stringify({ source: SITE, extractionId: ex.extractionId, extractedAt: ex.extractedAt, articles, catalog }, null, 1),
);
console.log(`${articles.length} articles embarqués, ${catalog.length} titres au catalogue.`);
