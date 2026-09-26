import "server-only";
import type { LinkCheck, Media } from "@/domain/types";
import { nowIso } from "@/domain/util";
import { statLocal } from "./local";

/**
 * Vérifie qu'un média est toujours accessible. Lecture seule : HEAD, puis GET partiel si HEAD refusé.
 * Ne modifie jamais le média distant ni sa référence.
 */
export async function checkMediaLink(m: Pick<Media, "location" | "ref">, timeoutMs = 10_000): Promise<LinkCheck> {
  if (m.location === "locale") {
    const st = await statLocal(m.ref);
    return st
      ? { status: "ok", message: `Fichier local présent (${st.size} octets)`, checkedAt: nowIso() }
      : { status: "erreur", message: "Fichier local introuvable sous PORKONIA_MEDIA_ROOT", checkedAt: nowIso() };
  }
  const attempt = async (method: "HEAD" | "GET") => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(m.ref, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers: method === "GET" ? { Range: "bytes=0-0" } : {},
        cache: "no-store",
      });
      await res.body?.cancel().catch(() => undefined);
      return res;
    } finally {
      clearTimeout(t);
    }
  };
  try {
    let res = await attempt("HEAD");
    if (res.status === 405 || res.status === 403 || res.status === 501) res = await attempt("GET");
    const ok = res.status >= 200 && res.status < 400;
    return {
      status: ok ? "ok" : "erreur",
      httpStatus: res.status,
      contentType: res.headers.get("content-type") ?? undefined,
      checkedAt: nowIso(),
    };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "Délai dépassé" : e.message) : String(e);
    return { status: "erreur", message: msg, checkedAt: nowIso() };
  }
}
