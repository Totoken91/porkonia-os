import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export function mediaRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.PORKONIA_MEDIA_ROOT || path.join(process.cwd(), "medias-locales"));
}

/** Résout un chemin relatif SOUS la racine des médias (anti-traversée de répertoire). */
export function resolveLocalMedia(rel: string): string | null {
  const root = mediaRoot();
  const abs = path.resolve(/*turbopackIgnore: true*/ root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

export const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif",
  svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
  pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  json: "application/json", md: "text/markdown; charset=utf-8", txt: "text/plain; charset=utf-8",
};

export async function statLocal(rel: string) {
  const abs = resolveLocalMedia(rel);
  if (!abs) return null;
  try {
    const st = await fs.stat(/*turbopackIgnore: true*/ abs);
    return st.isFile() ? { abs, size: st.size } : null;
  } catch {
    return null;
  }
}
