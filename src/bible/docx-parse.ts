/**
 * Analyse d'un document DOCX (Bible visuelle) — lecture seule, sans exécution de contenu.
 * - Sections découpées sur les titres (Titre, Titre 1, Titre 2…), tableaux convertis en Markdown.
 * - Images : octets d'origine (aucune recompression), position exacte (section, cellule, légende).
 * - Portraits canoniques : image + nom (cellule ou titre) + règle d'apparence + nom de fichier source.
 * Ne complète JAMAIS un contenu manquant.
 */
import { unzipSync } from "fflate";
import { DOMParser } from "@xmldom/xmldom";
import { createHash } from "node:crypto";
import type { BibleCategory } from "@/domain/types";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

export interface DocxImage {
  file: string;
  name: string;
  sha256: string;
  bytes: number;
  format: string;
  width: number | null;
  height: number | null;
  placed: boolean;
  placements: { sectionPath: string; cellName?: string; descr?: string; caption?: string }[];
  role: "portrait" | "identite" | "reference" | "non-placee" | "miniature";
}

export interface DocxSection {
  order: number;
  path: string;
  title: string;
  level: number;
  markdown: string;
  images: string[];
  textHash: string;
  suggestedCategory: BibleCategory | null;
  chars: number;
}

export interface PortraitCandidate {
  key: string;
  name: string;
  names: string[];
  image: string;
  originalFilename: string | null;
  appearance: string;
  notes: string;
  sectionPath: string;
}

export interface DocxAnalysis {
  format: "porkonia-os/docx-analysis@1";
  sha256: string;
  filename: string;
  bytes: number;
  analyzedAt: string;
  title: string | null;
  sections: DocxSection[];
  images: DocxImage[];
  portraits: PortraitCandidate[];
  warnings: string[];
  stats: { paragraphs: number; tables: number; headings: number };
}

const sha = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const MARKER = /SOURCE CANONIQUE NON MODIFI[ÉE]E\s*[•·-]?\s*(\S+)?/i;

/** Dimensions PNG / JPEG / GIF / WebP lues dans l'en-tête (sans décoder l'image). */
export function imageSize(buf: Uint8Array): { width: number; height: number } | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) return { width: dv.getUint32(16), height: dv.getUint32(20) };
  if (buf.length > 10 && buf[0] === 0x47 && buf[1] === 0x49) return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
  if (buf.length > 30 && buf[0] === 0x52 && buf[8] === 0x57 && buf[12] === 0x56 && buf[15] === 0x20) return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1]!;
      const len = dv.getUint16(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
      i += 2 + len;
    }
  }
  return null;
}

type Para = { kind: "p"; style: string; text: string; images: { target: string; descr?: string }[]; list: boolean };
type Cell = Para[];
type Table = { kind: "tbl"; rows: Cell[][] };

function els(parent: Element, ns: string, local: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS(ns, local));
}
function kids(parent: Element): Element[] {
  const out: Element[] = [];
  for (let n = parent.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) out.push(n as Element);
  return out;
}

export function suggestCategory(path: string): BibleCategory | null {
  const p = path.toLowerCase();
  if (/visages canoniques|portrait|fontanillas|bernis|mauriac/.test(p)) return "personnages";
  if (/douze sacr|tradition|sacré/.test(p)) return "traditions";
  if (/prompt|règle de production|checklist|génération/.test(p)) return "contraintes-generation";
  if (/hamelot|coteaux|géographie|ville de/.test(p)) return "geographie";
  if (/narrati|rédaction|voix|comique|rythme|construire un vrai article|réécriture|amplitude|n.importe quoi|vérification avant publication|personnages et continuité/.test(p)) return "regles-narratives";
  if (/chronolog|calendrier|époques?\b/.test(p)) return "chronologie";
  if (/organisation|institution|ministère|administration/.test(p)) return "organisations";
  if (/photograph|visuel|direction artistique|emblème|écusson|insigne|signature|palette|identité|références canoniques|registre|catsoup|usage de sofiane|choix du registre/.test(p)) return "regles-visuelles";
  return null;
}

export function analyzeDocx(buf: Uint8Array, filename: string): DocxAnalysis {
  const zip = unzipSync(buf);
  const text = (p: string) => (zip[p] ? new TextDecoder().decode(zip[p]) : null);
  const warnings: string[] = [];
  const parser = new DOMParser();
  const docXml = text("word/document.xml");
  if (!docXml) throw new Error("document.xml introuvable : ce fichier n'est pas un DOCX valide.");
  const doc = parser.parseFromString(docXml, "text/xml");

  // Styles : id → nom (« heading 1 », « Title », « Caption »…)
  const styleNames = new Map<string, string>();
  const stylesXml = text("word/styles.xml");
  if (stylesXml) {
    for (const s of els(parser.parseFromString(stylesXml, "text/xml").documentElement as unknown as Element, W, "style")) {
      const id = s.getAttributeNS(W, "styleId") || s.getAttribute("w:styleId") || "";
      const name = els(s, W, "name")[0]?.getAttributeNS(W, "val") || els(s, W, "name")[0]?.getAttribute("w:val") || id;
      styleNames.set(id, name.toLowerCase());
    }
  }
  const rels = new Map<string, string>();
  const relXml = text("word/_rels/document.xml.rels");
  if (relXml)
    for (const r of Array.from(parser.parseFromString(relXml, "text/xml").getElementsByTagNameNS(PKG_REL, "Relationship")))
      rels.set(r.getAttribute("Id") ?? "", "word/" + (r.getAttribute("Target") ?? "").replace(/^\.\//, ""));

  const readPara = (p: Element): Para => {
    const pStyle = els(p, W, "pStyle")[0];
    const styleId = pStyle?.getAttributeNS(W, "val") || pStyle?.getAttribute("w:val") || "";
    const style = styleNames.get(styleId) ?? styleId.toLowerCase();
    const t = els(p, W, "t").map((x) => x.textContent ?? "").join("");
    const images = els(p, A, "blip").map((b) => {
      const id = b.getAttributeNS(R, "embed") || b.getAttribute("r:embed") || "";
      return { target: rels.get(id) ?? id };
    });
    const descrs = els(p, WP, "docPr").map((d) => d.getAttribute("descr") || d.getAttribute("name") || undefined);
    images.forEach((im, i) => Object.assign(im, { descr: descrs[i] }));
    const list = !!els(p, W, "numPr")[0] || /list/.test(style);
    return { kind: "p", style, text: t, images, list };
  };

  const body = els(doc.documentElement as unknown as Element, W, "body")[0]!;
  const blocks: (Para | Table)[] = [];
  let stats = { paragraphs: 0, tables: 0, headings: 0 };
  for (const el of kids(body)) {
    if (el.localName === "p") {
      blocks.push(readPara(el));
      stats.paragraphs += 1;
    } else if (el.localName === "tbl") {
      const rows = els(el, W, "tr").map((tr) => kids(tr).filter((c) => c.localName === "tc").map((tc) => els(tc, W, "p").map(readPara)));
      blocks.push({ kind: "tbl", rows });
      stats.tables += 1;
    }
  }

  const headingLevel = (p: Para) => {
    if (p.style === "title") return 0;
    const m = /heading (\d)/.exec(p.style) ?? /titre ?(\d)/.exec(p.style);
    return m ? Number(m[1]) : null;
  };

  // Images référencées + placements
  const placements = new Map<string, DocxImage["placements"]>();
  const place = (target: string, pl: DocxImage["placements"][number]) => placements.set(target, [...(placements.get(target) ?? []), pl]);
  const portraits: PortraitCandidate[] = [];
  const seenPortraitImages = new Set<string>();

  const sections: DocxSection[] = [];
  let title: string | null = null;
  let h1 = "";
  let current: { path: string; title: string; level: number; lines: string[]; images: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const md = current.lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (md || current.images.length)
      sections.push({ order: sections.length, path: current.path, title: current.title, level: current.level, markdown: md, images: [...new Set(current.images)], textHash: sha(md), suggestedCategory: suggestCategory(current.path), chars: md.length });
  };
  const open = (path: string, t: string, level: number) => {
    flush();
    current = { path, title: t, level, lines: [], images: [] };
  };
  open("Introduction", "Introduction", 0);
  const imgMd = (target: string, alt: string) => `![${alt.replace(/[[\]]/g, "")}](docx-img:${target})`;

  const cellParasToMd = (paras: Para[], sectionPath: string) => {
    const out: string[] = [];
    const nameCandidate = paras.find((p) => p.text.trim())?.text.trim() ?? "";
    const marker = paras.map((p) => MARKER.exec(p.text)).find(Boolean);
    const imgs = paras.flatMap((p) => p.images);
    for (const p of paras) {
      for (const im of p.images) {
        place(im.target, { sectionPath, cellName: nameCandidate || undefined, descr: im.descr });
        current!.images.push(im.target);
        out.push(imgMd(im.target, nameCandidate || im.descr || "image"));
      }
      if (p.text.trim()) out.push(p.list ? `- ${p.text.trim()}` : p.text.trim());
    }
    const shortName = nameCandidate.length > 0 && nameCandidate.length <= 60 && !/[.:;!?]$/.test(nameCandidate);
    if (imgs.length && shortName && (marker || /visage|portrait/i.test(sectionPath))) {
      const im = imgs[0]!.target;
      if (!seenPortraitImages.has(im)) {
        seenPortraitImages.add(im);
        const rest = paras.map((p) => p.text.trim()).filter((t) => t && t !== nameCandidate && !MARKER.test(t));
        portraits.push({
          key: `portrait:${im}`,
          name: nameCandidate,
          names: nameCandidate.split(/\s+alias\s+/i).map((s) => s.trim()).flatMap((n) => [n, n.replace(/^(général|generale?|dr|docteur|maître|grand maître)\s+/i, "")]).filter((v, i, a) => v && a.indexOf(v) === i),
          image: im,
          originalFilename: marker?.[1] ?? null,
          appearance: rest.filter((t) => /\bconserver\b/i.test(t)).join("\n"),
          notes: rest.filter((t) => !/\bconserver\b/i.test(t)).join("\n"),
          sectionPath,
        });
      }
    }
    return out;
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.kind === "p") {
      const lvl = headingLevel(b);
      if (lvl !== null && b.text.trim()) {
        stats.headings += 1;
        if (lvl === 0) {
          title = title ?? b.text.trim();
          continue;
        }
        if (lvl === 1) {
          h1 = b.text.trim();
          open(h1, h1, 1);
        } else {
          open(`${h1 ? h1 + " > " : ""}${b.text.trim()}`, b.text.trim(), lvl);
        }
        continue;
      }
      const cur = current!;
      // Section de portrait sous un titre (ex. « Maxime Mauriac ») : image + règle + marqueur SOURCE CANONIQUE.
      if (b.images.length) {
        const caption = blocks[i + 1] && blocks[i + 1]!.kind === "p" && /caption|légende/.test((blocks[i + 1] as Para).style) ? (blocks[i + 1] as Para).text.trim() : undefined;
        for (const im of b.images) {
          place(im.target, { sectionPath: cur.path, descr: im.descr, caption });
          cur.images.push(im.target);
          cur.lines.push(imgMd(im.target, caption ?? cur.title));
        }
        const following = blocks.slice(i + 1, i + 6).filter((x): x is Para => x.kind === "p" && headingLevel(x) === null);
        const marker = following.map((p) => MARKER.exec(p.text)).find(Boolean);
        if (marker && cur.level >= 2) {
          const im = b.images[0]!.target;
          if (!seenPortraitImages.has(im)) {
            seenPortraitImages.add(im);
            const texts = following.map((p) => p.text.trim()).filter((t) => t && !MARKER.test(t));
            portraits.push({
              key: `portrait:${im}`,
              name: cur.title,
              names: [cur.title, cur.title.replace(/^(général|generale?|dr|docteur)\s+/i, "")].filter((v, k, a) => a.indexOf(v) === k),
              image: im,
              originalFilename: marker[1] ?? null,
              appearance: texts.filter((t) => /\bconserver\b/i.test(t)).join("\n"),
              notes: texts.filter((t) => !/\bconserver\b/i.test(t)).join("\n"),
              sectionPath: cur.path,
            });
          }
        }
      }
      if (b.text.trim()) cur.lines.push(b.list ? `- ${b.text.trim()}` : /caption|légende/.test(b.style) ? `*${b.text.trim()}*` : b.text.trim());
      cur.lines.push("");
      continue;
    }
    // Tableau
    const cur = current!;
    const layout = b.rows.length === 1 || b.rows.some((r) => r.some((c) => c.some((p) => p.images.length)));
    if (layout) {
      for (const row of b.rows)
        for (const cell of row) {
          const md = cellParasToMd(cell, cur.path);
          if (md.length) cur.lines.push(...md, "");
        }
    } else {
      const cellText = (c: Cell) => c.map((p) => p.text.trim()).filter(Boolean).join(" · ").replace(/\|/g, "/");
      const [head, ...rest] = b.rows;
      cur.lines.push(`| ${head!.map(cellText).join(" | ")} |`, `|${head!.map(() => "---").join("|")}|`, ...rest.map((r) => `| ${r.map(cellText).join(" | ")} |`), "");
    }
  }
  flush();

  // Toutes les images du paquet (y compris non placées et miniature)
  const images: DocxImage[] = Object.keys(zip)
    .filter((p) => /^word\/media\//.test(p) || /^docProps\/thumbnail\./.test(p))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    .map((file) => {
      const data = zip[file]!;
      const pls = placements.get(file) ?? [];
      const size = imageSize(data);
      const isThumb = file.startsWith("docProps/");
      const portrait = portraits.some((p) => p.image === file);
      const identity = pls.some((p) => /emblème|écusson|insigne|signature|identité|références canoniques/i.test(p.sectionPath));
      return {
        file,
        name: file.split("/").pop()!,
        sha256: sha(data),
        bytes: data.length,
        format: (file.split(".").pop() ?? "").toLowerCase(),
        width: size?.width ?? null,
        height: size?.height ?? null,
        placed: pls.length > 0,
        placements: pls,
        role: isThumb ? "miniature" : portrait ? "portrait" : !pls.length ? "non-placee" : identity ? "identite" : "reference",
      };
    });
  for (const im of images) if (!im.placed && im.role !== "miniature") warnings.push(`Image « ${im.name} » présente dans le fichier mais non placée dans le corps du document.`);
  const missing = [...placements.keys()].filter((t) => !zip[t]);
  for (const m of missing) warnings.push(`Image référencée mais absente du paquet : ${m}`);

  return {
    format: "porkonia-os/docx-analysis@1",
    sha256: sha(buf),
    filename,
    bytes: buf.length,
    analyzedAt: new Date().toISOString(),
    title,
    sections,
    images,
    portraits,
    warnings,
    stats,
  };
}

/** Accès aux octets d'origine d'une image du paquet (aucune transformation). */
export function extractDocxFile(buf: Uint8Array, file: string): Uint8Array {
  const zip = unzipSync(buf, { filter: (f) => f.name === file });
  const data = zip[file];
  if (!data) throw new Error(`Fichier ${file} absent du DOCX.`);
  return data;
}
