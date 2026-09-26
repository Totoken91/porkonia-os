"use client";
import { useEffect, useState } from "react";

/**
 * Affichage du HTML d'origine (articles importés de Porkopédia) : nettoyé par DOMPurify
 * (aucun script, aucun gestionnaire d'événement), chemins relatifs résolus vers le site d'origine
 * (les images restent hébergées là-bas), liens #article= renvoyés vers les fiches locales.
 */
export function HtmlView({ html, baseUrl }: { html: string; baseUrl?: string | null }) {
  const [clean, setClean] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("dompurify").then(({ default: DOMPurify }) => {
      const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ["data-article", "loading"], FORBID_TAGS: ["style", "form", "input", "button"] });
      const doc = new DOMParser().parseFromString(`<div>${safe}</div>`, "text/html");
      doc.querySelectorAll("[src]").forEach((el) => {
        const src = el.getAttribute("src")!;
        if (baseUrl && !/^(https?:|data:|\/)/i.test(src)) el.setAttribute("src", new URL(src, baseUrl).toString());
      });
      doc.querySelectorAll("a").forEach((a) => {
        const target = a.getAttribute("data-article") ?? /^#article=(.+)$/.exec(a.getAttribute("href") ?? "")?.[1];
        if (target) a.setAttribute("href", `/a/${encodeURIComponent(decodeURIComponent(target))}`);
        else if (/^https?:/i.test(a.getAttribute("href") ?? "")) a.setAttribute("rel", "noreferrer noopener");
      });
      if (alive) setClean(doc.body.firstElementChild!.innerHTML);
    });
    return () => {
      alive = false;
    };
  }, [html, baseUrl]);
  if (clean === null) return <p className="italic text-[#555]">Préparation de l&apos;aperçu…</p>;
  return <div className="prose-porko porko-html" dangerouslySetInnerHTML={{ __html: clean }} />;
}
