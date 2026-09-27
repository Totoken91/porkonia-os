import { describe, expect, it } from "vitest";
import type { ActionRef, ContentPack, FsNode } from "@/content/types";
import { porkosPack } from "@/content/packs/porkos";
import porkopedia from "@/content/porkopedia/porkopedia.json";
import { APPS } from "@/apps/registry";
import { parseUrl, search } from "@/apps/navigateur/url";
import { at, programLength } from "@/apps/channel-pork/timeline";
import { checkPassword } from "@/components/Login";
import { makeRng } from "@/os/rng";
import { resolve, childPath, parentPath } from "@/os/fs";
import { DEFAULT_SETTINGS, sanitizeSettings } from "@/os/settings";

/** Vérifie qu'un pack est cohérent : toute référence (appli, dialogue, pool, pub, mise à jour) existe. */
function problems(pack: ContentPack): string[] {
  const out: string[] = [];
  const apps = new Set(pack.apps.map((a) => a.id));
  const checkAction = (a: ActionRef, where: string) => {
    if (a.type === "open" && !apps.has(a.app)) out.push(`${where}: appli inconnue ${a.app}`);
    if (a.type === "dialog-ref" && !pack.dialogs[a.id]) out.push(`${where}: dialogue inconnu ${a.id}`);
    if (a.type === "toast-pool" && !pack.toastPools[a.pool]?.length) out.push(`${where}: pool vide ${a.pool}`);
    if (a.type === "ad" && a.id && !pack.ads.some((x) => x.id === a.id)) out.push(`${where}: pub inconnue ${a.id}`);
    if (a.type === "update" && !pack.updates.some((x) => x.id === a.id)) out.push(`${where}: mise à jour inconnue ${a.id}`);
    if (a.type === "dialog") a.dialog.buttons.forEach((b) => b.then && checkAction(b.then, where));
  };
  for (const a of pack.apps) if (!(a.kind in APPS)) out.push(`appli ${a.id}: type ${a.kind} sans composant`);
  for (const d of pack.desktop) "app" in d.open ? !apps.has(d.open.app) && out.push(`icône ${d.id}`) : checkAction(d.open.action, `icône ${d.id}`);
  for (const r of pack.rules) {
    checkAction(r.action, `règle ${r.id}`);
    if (r.trigger.type === "app-open" && !apps.has(r.trigger.app)) out.push(`règle ${r.id}: appli ${r.trigger.app}`);
  }
  for (const [id, d] of Object.entries(pack.dialogs)) d.buttons.forEach((b) => b.then && checkAction(b.then, `dialogue ${id}`));
  const walk = (n: FsNode, path: string) => {
    if (n.type === "lien" && !apps.has(n.app)) out.push(`fichier ${path}: appli ${n.app}`);
    if (n.type === "dossier") {
      const names = n.children.map((c) => c.name);
      if (new Set(names).size !== names.length) out.push(`dossier ${path}: noms en double`);
      if (names.some((x) => x.includes("/"))) out.push(`dossier ${path}: « / » interdit dans un nom`);
      n.children.forEach((c) => walk(c, `${path}/${c.name}`));
    }
  };
  walk(pack.filesystem, "");
  if (!pack.users.length) out.push("aucun utilisateur");
  return out;
}

describe("pack PorkOS", () => {
  it("est cohérent", () => expect(problems(porkosPack)).toEqual([]));
  it("déclenche des signaux que le système émet vraiment", () => {
    const emitted = ["nappe:incident", "nappe:conforme", "boot:impatience", "config:rappels-off", "tv:zapper", "texte:enregistrer", "pub:cta", "nav:actualiser", "bureau:supprimer", "bureau:actualiser"];
    for (const r of porkosPack.rules) if (r.trigger.type === "signal") expect(emitted).toContain(r.trigger.name);
  });
  it("ne référence que des images d'origine (aucune copie locale hors emblème)", () => {
    const json = JSON.stringify(porkosPack);
    for (const m of json.matchAll(/"(https?:\/\/[^"]+\.(?:jpe?g|png|webp))"/g)) expect(m[1]).toMatch(/^https:\/\/porkopedia\.totoken\.chatgpt\.site\/assets\//);
  });
  it("les liens internes des notices pointent vers le catalogue", () => {
    const ids = new Set(porkopedia.catalog.map((c) => c.id));
    for (const a of porkopedia.articles) {
      expect(a.html).not.toMatch(/<script|<style|on\w+=/i);
      for (const m of a.html.matchAll(/data-article="([^"]+)"/g)) expect(ids.has(m[1]!) || porkopedia.articles.some((x) => x.id === m[1])).toBe(true);
    }
  });
});

describe("PigNet", () => {
  it("analyse les adresses", () => {
    expect(parseUrl("")).toEqual({ kind: "accueil" });
    expect(parseUrl("porko://porkopedia/douzi")).toEqual({ kind: "article", id: "douzi" });
    expect(parseUrl("porko://porkopedia")).toEqual({ kind: "index" });
    expect(parseUrl("porko://recherche?q=grand%20banquet")).toEqual({ kind: "recherche", q: "grand banquet" });
    expect(parseUrl("https://google.com").kind).toBe("etranger");
    expect(parseUrl("wikipedia.org").kind).toBe("etranger");
    expect(parseUrl("porko://ministere/secret").kind).toBe("inconnu");
    expect(parseUrl("douzi")).toEqual({ kind: "recherche", q: "douzi" });
  });
  it("recherche sans accents ni casse", () => {
    expect(search([{ title: "Le Grand Banquet" }, { title: "Douzi City" }], "grand banquét")).toHaveLength(1);
    expect(search([{ title: "x" }], "  ")).toEqual([]);
  });
});

describe("Channel Pork", () => {
  it("suit diapositives et sous-titres", () => {
    const p = porkosPack.programs[0]!;
    expect(at(p, 0)).toEqual({ slide: 0, subtitle: p.subtitles[0]!.text });
    expect(at(p, p.slides[0]!.seconds).slide).toBe(1);
    expect(at(p, programLength(p) + 5).slide).toBe(p.slides.length - 1);
  });
});

describe("connexion", () => {
  const citoyen = porkosPack.users[0]!;
  const rnd = makeRng(1);
  it("refuse le silence, accepte le reste en le commentant", () => {
    expect(checkPassword(citoyen, "  ", porkosPack, rnd)).toEqual({ ok: false, message: porkosPack.login.emptyPassword });
    expect(checkPassword(citoyen, "12", porkosPack, rnd)).toEqual({ ok: true, message: porkosPack.login.patriotic });
    const r = checkPassword(citoyen, "motdepasse", porkosPack, rnd);
    expect(r.ok).toBe(true);
    expect(porkosPack.login.acceptedAny).toContain(r.message);
  });
  it("vérifie un mot de passe exigé", () => {
    const strict = { ...citoyen, password: "rôti" };
    expect(checkPassword(strict, "bœuf", porkosPack, rnd).ok).toBe(false);
    expect(checkPassword(strict, "rôti", porkosPack, rnd).ok).toBe(true);
  });
});

describe("système de fichiers et réglages", () => {
  it("résout les chemins", () => {
    const p = childPath("Documents officiels", "Lettre de bienvenue.txt");
    expect(resolve(porkosPack.filesystem, p)?.type).toBe("texte");
    expect(parentPath(p)).toBe("Documents officiels");
    expect(resolve(porkosPack.filesystem, "Nulle part/rien")).toBeNull();
    expect(resolve(porkosPack.filesystem, "")).toBe(porkosPack.filesystem);
  });
  it("ramène tout réglage fantaisiste à la valeur recommandée", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ crt: 3, hymne: 500, fond: "rien", rappels: "oui" })).toEqual({ ...DEFAULT_SETTINGS, crt: 12, hymne: 100 });
  });
});

describe("Exécuter", async () => {
  const { resolveCommand } = await import("@/apps/executer/Executer");
  it("reconnaît les alias, les noms de programme et refuse le reste", () => {
    expect(resolveCommand("  NAPPE ", porkosPack.run.aliases, porkosPack.apps)).toEqual({ app: "nappe-vide" });
    expect(resolveCommand("notepad.exe", porkosPack.run.aliases, porkosPack.apps)).toEqual({ app: "texte" });
    expect(resolveCommand("Channel Pork", porkosPack.run.aliases, porkosPack.apps)).toEqual({ app: "channel-pork" });
    expect(resolveCommand("format c:", porkosPack.run.aliases, porkosPack.apps)).toBeNull();
    for (const a of Object.values(porkosPack.run.aliases)) expect(porkosPack.apps.some((x) => x.id === a.app)).toBe(true);
  });
});
