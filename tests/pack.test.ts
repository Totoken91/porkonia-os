import { describe, expect, it } from "vitest";
import type { ActionRef, ContentPack, FsNode } from "@/content/types";
import { porkosPack } from "@/content/packs/porkos";
import porkopedia from "@/content/porkopedia/porkopedia.json";
import { APPS } from "@/apps/registry";
import { parseUrl, search } from "@/apps/navigateur/url";
import { compteur, cours, duJour, jour, meteo } from "@/apps/navigateur/portail";
import { at, gridOf, live, loopLength, programLength, voiceAt } from "@/apps/channel-pork/timeline";
import { existsSync } from "node:fs";
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
    if (a.type === "mail" && !pack.mails.some((x) => x.id === a.id && x.later)) out.push(`${where}: courrier tardif inconnu ${a.id}`);
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
    const emitted = ["nappe:incident", "nappe:conforme", "boot:impatience", "config:rappels-off", "tv:tour", "texte:enregistrer", "pub:cta", "nav:actualiser", "bureau:supprimer", "bureau:actualiser", "courrier:relever"];
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
    expect(at(p, p.subtitles[0]!.at)).toEqual({ slide: 0, subtitle: p.subtitles[0]!.text });
    expect(at(p, p.slides[0]!.seconds).slide).toBe(1);
    expect(at(p, programLength(p) + 5).slide).toBe(p.slides.length - 1);
  });

  it("cale la voix off sur les répliques enregistrées", () => {
    const p = porkosPack.programs[0]!;
    const s1 = p.subtitles[1]!;
    expect(voiceAt(p, 0)).toBeNull();
    expect(voiceAt(p, s1.at + 1.5)).toEqual({ index: 1, src: s1.voice, offset: 1.5 });
    const muet = { ...p, subtitles: [{ at: 0, text: "a", voice: "/a.mp3" }, { at: 2, text: "(silence)" }] };
    expect(voiceAt(muet, 3)).toBeNull();
  });

  it("diffuse en continu : chaque chaîne tourne sur l'horloge et enchaîne ses programmes", () => {
    for (const c of porkosPack.channels) {
      expect(gridOf(c, porkosPack.programs).length, c.id).toBe(c.grid.length);
      const total = loopLength(c, porkosPack.programs);
      const debut = live(c, porkosPack.programs, 0);
      expect(debut).toMatchObject({ slot: 0, t: 0 });
      // un tour plus tard, on retombe au même endroit ; juste avant la fin d'un programme, le suivant arrive
      expect(live(c, porkosPack.programs, total + 12.5)).toEqual(live(c, porkosPack.programs, 12.5));
      const len = programLength(debut.program);
      expect(live(c, porkosPack.programs, len - 0.1).slot).toBe(0);
      expect(live(c, porkosPack.programs, len + 0.1)).toMatchObject({ slot: 1 % c.grid.length, program: debut.suivant });
    }
    const c = porkosPack.channels[0]!;
    expect(live(c, porkosPack.programs, 1000, 97)).toEqual(live(c, porkosPack.programs, 1097));
  });

  it("donne une voix et une image à chaque réplique de chaque émission", () => {
    for (const p of porkosPack.programs) {
      expect(p.subtitles.every((s) => s.voice), p.id).toBe(true);
      expect(p.slides.every((s) => !s.focus || s.focus.every((v) => v >= 0 && v <= 1)), p.id).toBe(true);
      const at0 = p.subtitles.map((s) => s.at);
      expect([...at0].sort((a, b) => a - b), p.id).toEqual(at0);
    }
  });

  it("fournit les fichiers audio et garde les répliques dans le programme", () => {
    for (const p of porkosPack.programs) {
      for (const f of [p.music, ...p.subtitles.map((s) => s.voice)].filter(Boolean)) expect(existsSync(`public${f}`), f).toBe(true);
      for (const s of p.subtitles) expect(s.at).toBeLessThan(programLength(p));
    }
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
    expect(resolveCommand("defrag c:", porkosPack.run.aliases, porkosPack.apps)).toBeNull();
    for (const a of Object.values(porkosPack.run.aliases)) if ("app" in a) expect(porkosPack.apps.some((x) => x.id === a.app)).toBe(true);
    expect(resolveCommand("  Format   C: ", porkosPack.run.aliases, porkosPack.apps)).toEqual({ action: { type: "fatal" } });
  });
});

describe("portail PigNet", () => {
  const d = new Date(2026, 8, 27, 11, 30);
  it("change chaque jour mais reste le même pour tous le même jour", () => {
    expect(jour(new Date(2000, 0, 1, 23))).toBe(0);
    expect(jour(d)).toBe(jour(new Date(2026, 8, 27, 0, 1)));
    expect(duJour(porkosPack.portal.saints, d)).toBe(duJour(porkosPack.portal.saints, new Date(2026, 8, 27, 22)));
    const saints = new Set(Array.from({ length: 30 }, (_, i) => duJour(porkosPack.portal.saints, new Date(2026, 8, i + 1))));
    expect(saints.size).toBeGreaterThan(3);
  });
  it("fait monter le compteur de visites", () => {
    const c = porkosPack.portal.compteur;
    expect(compteur(c, new Date(2026, 8, 27, 12))).toBeGreaterThan(compteur(c, new Date(2026, 8, 27, 11)));
    expect(compteur(c, new Date(2026, 8, 28, 0))).toBeGreaterThanOrEqual(compteur(c, new Date(2026, 8, 27, 23, 59, 59)));
  });
  it("cote la bourse et annonce la météo de chaque ville", () => {
    const b = cours(porkosPack.portal.bourse, d);
    expect(b).toHaveLength(porkosPack.portal.bourse.length);
    for (const x of b) {
      expect(x.valeur).toBeGreaterThan(0);
      expect(Math.abs(x.variation)).toBeLessThan(60);
    }
    expect(cours(porkosPack.portal.bourse, d)).toEqual(b);
    const m = meteo(porkosPack.portal.meteo, d);
    expect(m.map((x) => x.ville)).toEqual(porkosPack.portal.meteo.villes);
    for (const x of m) expect(porkosPack.portal.meteo.ciels).toContain(x.ciel);
  });
  it("oriente la recherche et les rubriques vers les bonnes pages", () => {
    expect(parseUrl("porko://porkopedia?rubrique=Villes%20de%20Porkonia")).toEqual({ kind: "index", section: "Villes de Porkonia" });
    for (const s of porkosPack.portal.services) if (s.url) expect(["index", "etranger", "article", "accueil"]).toContain(parseUrl(s.url).kind);
  });
});
