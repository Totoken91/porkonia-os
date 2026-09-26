import { createHash, randomBytes } from "node:crypto";

const PREFIX = {
  character: "per",
  article: "art",
  media: "med",
  bible: "bib",
  publication: "pub",
  revision: "rev",
  log: "log",
  backup: "sav",
} as const;

export type IdKind = keyof typeof PREFIX;

/** Identifiant permanent, indépendant du titre : ex. `per_7k2m9x4qa1`. */
export function newId(kind: IdKind): string {
  const alphabet = "0123456789abcdefghijkmnpqrstuvwxyz";
  const bytes = randomBytes(10);
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `${PREFIX[kind]}_${s}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Liste « a, b ; c » → ["a","b","c"] (dédoublonnée). */
export function splitList(input: string | null | undefined): string[] {
  if (!input) return [];
  return [...new Set(input.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))];
}

/** Estimation grossière et assumée du nombre de tokens (≈ 4 caractères / token, un peu plus en français). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.6);
}

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: "CONFLIT" | "INTROUVABLE" | "INVALIDE" | "PROTEGE",
  ) {
    super(message);
    this.name = "DomainError";
  }
}
