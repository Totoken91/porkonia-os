/** Menus de fenêtre : lettres d'accès (« &Fichier ») et raccourcis clavier (« Ctrl+S », « F5 »). Pur, testé. */
import type { MenuEntry, MenuSpec } from "@/content/types";

/** Découpe un libellé autour de sa lettre d'accès : « &Fichier » → { avant: "", lettre: "F", apres: "ichier" }. */
export function accel(label: string): { avant: string; lettre: string; apres: string; cle: string | null } {
  const i = label.indexOf("&");
  if (i < 0 || i === label.length - 1) return { avant: label.replace("&", ""), lettre: "", apres: "", cle: null };
  const lettre = label[i + 1]!;
  return { avant: label.slice(0, i), lettre, apres: label.slice(i + 2), cle: lettre.toLowerCase() };
}

export const sansEsperluette = (label: string) => label.replace("&", "");

/** Le raccourci « Ctrl+S », « F5 », « Maj+F2 » correspond-il à cet événement clavier ? */
export function matchShortcut(shortcut: string, e: { key: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey?: boolean }): boolean {
  const parts = shortcut.split("+").map((p) => p.trim().toLowerCase());
  const touche = parts.pop()!;
  const ctrl = parts.includes("ctrl");
  const alt = parts.includes("alt");
  const maj = parts.includes("maj") || parts.includes("shift");
  if (ctrl !== (e.ctrlKey || !!e.metaKey) || alt !== e.altKey || maj !== e.shiftKey) return false;
  const k = e.key.toLowerCase();
  const alias: Record<string, string> = { suppr: "delete", entrée: "enter", échap: "escape", espace: " ", retour: "backspace", "←": "arrowleft", "→": "arrowright" };
  return k === (alias[touche] ?? touche);
}

/** Première entrée active dont le raccourci correspond à l'événement. */
export function findShortcut(menus: MenuSpec[], e: Parameters<typeof matchShortcut>[1]): Extract<MenuEntry, { label: string }> | null {
  for (const m of menus)
    for (const it of m.items) if (!("separator" in it) && it.shortcut && !it.disabled && matchShortcut(it.shortcut, e)) return it;
  return null;
}

/** Index du menu dont la lettre d'accès correspond (Alt+lettre), ou -1. */
export function menuForKey(menus: MenuSpec[], key: string): number {
  const k = key.toLowerCase();
  return menus.findIndex((m) => accel(m.label).cle === k);
}

/** Raccourci « simple » (sans Ctrl, Alt ni touche F) : ignoré pendant la saisie de texte. */
export const isPlainShortcut = (shortcut: string) => !/ctrl|alt|^f\d/i.test(shortcut);
