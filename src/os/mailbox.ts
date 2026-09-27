/**
 * Boîte aux lettres du poste — logique pure, testée.
 * Aucun message n'est jamais détruit : supprimer place en corbeille, et la corbeille ne se vide pas (c'est l'État qui garde).
 */
import type { Mail } from "@/content/types";

export type Dossier = Mail["folder"];
export const DOSSIERS: Dossier[] = ["reception", "envoyes", "brouillons", "corbeille"];

export interface Boite {
  messages: Mail[];
  seq: number;
}

export interface Brouillon {
  to: string;
  subject: string;
  body: string;
}

export const initBoite = (mails: Mail[]): Boite => ({ messages: mails.filter((m) => !m.later).map((m) => ({ ...m })), seq: 0 });

/** Livre un message tardif dans la boîte de réception (une seule fois). */
export function deliver(b: Boite, mail: Mail, date: string): Boite {
  if (b.messages.some((m) => m.id === mail.id)) return b;
  return { ...b, messages: [...b.messages, { ...mail, folder: "reception", read: false, date, later: undefined }] };
}

export const markRead = (b: Boite, id: string, read = true): Boite => ({ ...b, messages: b.messages.map((m) => (m.id === id ? { ...m, read } : m)) });

/** Déplace un message ; « supprimer » depuis la corbeille est refusé (renvoie la boîte inchangée). */
export function move(b: Boite, id: string, folder: Dossier): Boite {
  const m = b.messages.find((x) => x.id === id);
  if (!m || m.folder === folder) return b;
  return { ...b, messages: b.messages.map((x) => (x.id === id ? { ...x, folder } : x)) };
}

/** Enregistre un brouillon (nouveau ou existant). Renvoie la boîte et l'identifiant du brouillon. */
export function saveDraft(b: Boite, d: Brouillon, from: string, date: string, id?: string): [Boite, string] {
  if (id && b.messages.some((m) => m.id === id)) {
    return [{ ...b, messages: b.messages.map((m) => (m.id === id ? { ...m, ...d, date } : m)) }, id];
  }
  const seq = b.seq + 1;
  const nid = `brouillon-${seq}`;
  return [{ seq, messages: [...b.messages, { id: nid, folder: "brouillons", from, date, read: true, ...d }] }, nid];
}

/** Envoie un message : il rejoint « Messages envoyés » ; le brouillon d'origine, s'il y en a un, disparaît dans l'envoi. */
export function send(b: Boite, d: Brouillon, from: string, date: string, draftId?: string): [Boite, Mail] {
  const seq = b.seq + 1;
  const mail: Mail = { id: `envoi-${seq}`, folder: "envoyes", from, date, read: true, ...d };
  const messages = b.messages.filter((m) => !(draftId && m.id === draftId && m.folder === "brouillons"));
  return [{ seq, messages: [...messages, mail] }, mail];
}

export const inFolder = (b: Boite, folder: Dossier): Mail[] => b.messages.filter((m) => m.folder === folder).reverse();
export const unread = (b: Boite, folder: Dossier = "reception") => b.messages.filter((m) => m.folder === folder && !m.read).length;

const nom = (adresse: string) => adresse.replace(/\s*<[^>]*>\s*/, "").trim() || adresse;
const citer = (m: Mail) =>
  `\n\n----- Message d'origine -----\nDe : ${m.from}\nDate : ${m.date}\nObjet : ${m.subject}\n\n${m.body
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n")}`;

export const reply = (m: Mail, signature: string): Brouillon => ({ to: m.from, subject: /^re\s*:/i.test(m.subject) ? m.subject : `RE: ${m.subject}`, body: `\n\n${signature}${citer(m)}` });
export const forward = (m: Mail, signature: string): Brouillon => ({ to: "", subject: `TR: ${m.subject}`, body: `\n\n${signature}${citer(m)}` });
export { nom as displayName };

/** Relit une boîte enregistrée : on ne garde que des messages bien formés, sinon on repart du pack. */
export function sanitizeBoite(raw: unknown, mails: Mail[]): Boite {
  const o = raw as Partial<Boite> | null;
  if (!o || !Array.isArray(o.messages) || typeof o.seq !== "number") return initBoite(mails);
  const ok = o.messages.filter(
    (m): m is Mail => !!m && typeof m.id === "string" && DOSSIERS.includes(m.folder) && typeof m.subject === "string" && typeof m.body === "string" && typeof m.from === "string",
  );
  return { seq: o.seq, messages: ok };
}
