/** Adresses PigNet (porko://…) → pages. Logique pure, testée. */
export type Route =
  | { kind: "accueil" }
  | { kind: "index"; section?: string }
  | { kind: "article"; id: string }
  | { kind: "recherche"; q: string }
  | { kind: "etranger"; url: string }
  | { kind: "site"; hote: string; page: string }
  | { kind: "inconnu"; url: string };

export const HOME = "porko://accueil";

/** `hotes` : sites de PigNet connus du pack (pages perso, annuaire) ; les autres adresses restent non homologuées. */
export function parseUrl(raw: string, hotes: string[] = []): Route {
  const url = raw.trim();
  if (!url || /^porko:\/\/(accueil)?\/?$/i.test(url)) return { kind: "accueil" };
  if (/^(https?:\/\/|www\.)/i.test(url) || /^[a-z0-9-]+\.(com|net|org|fr|io|be|ch|de|uk)(\/|$)/i.test(url)) return { kind: "etranger", url };
  const m = /^porko:\/\/([^/?#]+)\/?([^?#]*)(?:\?(.*))?$/i.exec(url);
  if (!m) return { kind: "recherche", q: url };
  const [, host = "", path = "", query = ""] = m;
  if (host === "porkopedia") {
    if (path) return { kind: "article", id: decodeURIComponent(path) };
    const section = new URLSearchParams(query).get("rubrique");
    return section ? { kind: "index", section } : { kind: "index" };
  }
  if (host === "recherche") return { kind: "recherche", q: new URLSearchParams(query).get("q") ?? "" };
  if (hotes.includes(host.toLowerCase())) return { kind: "site", hote: host.toLowerCase(), page: decodeURIComponent(path).replace(/\/$/, "") };
  return { kind: "inconnu", url };
}

export const articleUrl = (id: string) => `porko://porkopedia/${id}`;
export const searchUrl = (q: string) => `porko://recherche?q=${encodeURIComponent(q)}`;
export const rubriqueUrl = (section: string) => `porko://porkopedia?rubrique=${encodeURIComponent(section)}`;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function search<T extends { title: string }>(items: T[], q: string): T[] {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return items.filter((it) => words.every((w) => fold(it.title).includes(w)));
}

export const siteUrl = (hote: string, page = "") => `porko://${hote}${page ? `/${page}` : ""}`;

/** Voisins dans l'Anneau des pages perso : précédent et suivant, en boucle ; null hors de l'anneau. */
export function anneau(hotes: string[], hote: string): { precedent: string; suivant: string } | null {
  const i = hotes.indexOf(hote);
  if (i < 0 || hotes.length < 2) return null;
  return { precedent: hotes[(i - 1 + hotes.length) % hotes.length]!, suivant: hotes[(i + 1) % hotes.length]! };
}
