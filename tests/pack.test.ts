import { describe, expect, it } from "vitest";
import type { ActionRef, ContentPack, FsNode } from "@/content/types";
import { porkosPack } from "@/content/packs/porkos";
import porkopedia from "@/content/porkopedia/porkopedia.json";
import { APPS } from "@/apps/registry";
import { anneau, parseUrl, search } from "@/apps/navigateur/url";
import { compteur, cours, duJour, jour, meteo } from "@/apps/navigateur/portail";
import { at, decouper, gridOf, live, loopLength, programLength, sousTitre, voiceAt } from "@/apps/channel-pork/timeline";
import { existsSync } from "node:fs";
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
    const aussi = ["systeme:fatal", "session:perdue", "session:ouverte", "executer:sudo", "defrag:fin", "paint:enregistrer", "porkamp:fin", "nappe:conforme:vii", "tv:integral:brume-*", "courrier:envoye", "economiseur:vu", "pignet:livredor:tonton-marcel"];
    for (const r of porkosPack.rules) if (r.trigger.type === "signal") expect([...emitted, ...aussi]).toContain(r.trigger.name);
  });
  it("décerne des distinctions atteignables", () => {
    // Signaux émis par le système ; `executer:<alias>` et `tv:integral:<émission>` sont vérifiés contre le pack.
    const emis = ["session:ouverte", "session:perdue", "systeme:fatal", "courrier:envoye", "economiseur:vu", "porkamp:fin", "defrag:fin", "fichiers:caches", "nappe:incident", "nappe:conforme", "boot:impatience", "config:rappels-off", "tv:tour", "texte:enregistrer", "pub:cta", "nav:actualiser", "bureau:supprimer", "banque:ouverte", "grosses:gagne", "ivresse:warp"];
    const d = porkosPack.distinctions;
    expect(new Set(d.map((x) => x.id)).size).toBe(d.length);
    for (const x of d) {
      const t = x.trigger;
      if (t.type === "app-open") expect(porkosPack.apps.map((a) => a.id)).toContain(t.app);
      if (t.type !== "signal") continue;
      const n = t.name.replace(/\*$/, "");
      if (n === "executer:secret") expect(porkosPack.run.secretes.every((c) => c in porkosPack.run.aliases)).toBe(true);
      else if (n.startsWith("executer:")) expect(Object.keys(porkosPack.run.aliases)).toContain(n.slice(9));
      else if (n.startsWith("nappe:conforme:")) expect(["petit", "grand", "vii"]).toContain(n.slice(15));
      else if (n.startsWith("tv:txt:")) expect(porkosPack.teletexte.pages.map((p) => String(p.numero))).toContain(n.slice(7));
      else if (n.startsWith("installeur:installe:")) expect(porkosPack.installeurs.map((i) => i.id)).toContain(n.slice(20) || porkosPack.installeurs[0]!.id);
      else if (n === "jambonjon:victoire") expect(porkosPack.apps.some((a) => a.id === "jambonjon")).toBe(true);
      else if (n.startsWith("tv:integral:")) expect(porkosPack.programs.some((p) => p.id.startsWith(n.slice(12)))).toBe(true);
      else expect(emis).toContain(n);
    }
    const seuils = porkosPack.rangs.map((r) => r.seuil);
    expect(seuils[0]).toBe(0);
    expect([...seuils].sort((a, b) => a - b)).toEqual(seuils);
    expect(Math.max(...seuils)).toBeLessThanOrEqual(d.length);
  });
  it("sert les images de Porkopédia depuis la copie locale, et elles existent", () => {
    const json = JSON.stringify(porkosPack) + JSON.stringify(porkopedia);
    expect(json).not.toMatch(/porkopedia\.totoken\.chatgpt\.site\/assets\//);
    for (const m of json.matchAll(/(\/porkopedia\/[^"\\ )]+\.(?:jpe?g|png|webp))/g)) expect(existsSync(`public${m[1]}`), m[1]).toBe(true);
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
    expect(parseUrl("porko://tonton-marcel/photos", ["tonton-marcel"])).toEqual({ kind: "site", hote: "tonton-marcel", page: "photos" });
    expect(parseUrl("porko://Tonton-Marcel", ["tonton-marcel"])).toEqual({ kind: "site", hote: "tonton-marcel", page: "" });
    expect(anneau(["a", "b", "c"], "a")).toEqual({ precedent: "c", suivant: "b" });
    expect(anneau(["a", "b"], "z")).toBeNull();
    // Sites du pack : liens internes valides, images d'origine seulement, anneau d'au moins trois membres.
    const hotes = porkosPack.sites.map((x) => x.hote);
    for (const site of porkosPack.sites)
      for (const [nom, page] of Object.entries(site.pages))
        for (const b of page.blocs) {
          if (b.t === "liens") for (const l of b.liens) {
            const r = parseUrl(l.url, hotes);
            expect(r.kind, `${site.hote}/${nom} → ${l.url}`).not.toBe("inconnu");
            if (r.kind === "site") expect(porkosPack.sites.find((x) => x.hote === r.hote)?.pages[r.page], l.url).toBeTruthy();
          }
          if (b.t === "image") expect(existsSync(`public${b.src}`), b.src).toBe(true);
        }
    expect(porkosPack.sites.filter((x) => x.anneau).length).toBeGreaterThanOrEqual(3);
    for (const a of Object.values(porkosPack.run.aliases)) if ("args" in a && a.args?.url) expect(parseUrl(a.args.url, hotes).kind).not.toBe("inconnu");
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
    // Le journal s'ouvre sur son générique : le jingle passe comme une réplique sans texte.
    expect(voiceAt(p, 0)).toMatchObject({ index: 0, src: "/audio/channel-pork/generique-journal.mp3" });
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

  it("place chaque point du bulletin météo sur un lieu de la carte", () => {
    const lieux = porkosPack.carteMeteo.lieux;
    const meteo = porkosPack.programs.find((p) => p.kind === "meteo")!;
    for (const s of meteo.slides.filter((x) => !x.image.includes("/generiques/"))) {
      expect(s.meteo, s.image).toBeTruthy();
      for (const pt of s.meteo!.points) expect(lieux[pt.lieu], pt.lieu).toBeDefined();
    }
    for (const [x, y] of Object.values(lieux)) expect(x >= 0 && x <= 1 && y >= 0 && y <= 1).toBe(true);
    expect(porkosPack.channels.some((c) => c.grid.includes(meteo.id))).toBe(true);
  });

  it("donne une voix et une image à chaque réplique de chaque émission", () => {
    for (const p of porkosPack.programs) {
      // Une bande complète (jeu télévisé) porte toutes les voix ; sinon chaque réplique a la sienne.
      expect(!!p.bande || p.subtitles.every((s) => s.voice), p.id).toBe(true);
      expect(p.slides.every((s) => !s.focus || s.focus.every((v) => v >= 0 && v <= 1)), p.id).toBe(true);
      const at0 = p.subtitles.map((s) => s.at);
      expect([...at0].sort((a, b) => a - b), p.id).toEqual(at0);
    }
  });

  it("fournit les fichiers audio et garde les répliques dans le programme", () => {
    for (const p of porkosPack.programs) {
      for (const f of [p.music, p.bande, ...p.subtitles.map((s) => s.voice)].filter(Boolean)) expect(existsSync(`public${f}`), f).toBe(true);
      for (const s of p.subtitles) expect(s.at).toBeLessThan(programLength(p));
      for (const s of p.slides) if (s.image.startsWith("/")) expect(existsSync(`public${s.image}`), s.image).toBe(true);
    }
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
  it("accepte un fond en image du pack, refuse un chemin bricolé", () => {
    expect(sanitizeSettings({ fond: "image:lac" }).fond).toBe("image:lac");
    expect(sanitizeSettings({ fond: "image:../../etc" }).fond).toBe(DEFAULT_SETTINGS.fond);
    const imgs = porkosPack.wallpaper?.images ?? [];
    expect(imgs.length).toBe(10);
    expect(new Set(imgs.map((i) => i.id)).size).toBe(imgs.length);
    for (const i of imgs) {
      expect(i.id).toMatch(/^[a-z0-9-]+$/);
      expect(existsSync(`public${i.image}`), i.image).toBe(true);
      expect(existsSync(`public${i.vignette}`), i.vignette).toBe(true);
    }
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
    const hotes = porkosPack.sites.map((x) => x.hote);
    for (const s of porkosPack.portal.services) if (s.url) expect(["index", "etranger", "article", "accueil", "site"]).toContain(parseUrl(s.url, hotes).kind);
  });
});

describe("sous-titres de Channel Pork", () => {
  const long = "Après quatre heures de débat, les élus ont tranché, comme le veut la tradition municipale de Douzi City. Les séances dureront désormais quatre heures. Personne n'a protesté.";
  it("découpe une réplique longue sans rien perdre", () => {
    const b = decouper(long);
    expect(b.join(" ")).toBe(long);
    for (const x of b) expect(x.length).toBeLessThanOrEqual(76);
    expect(b.length).toBeGreaterThan(1);
    expect(decouper("Court.")).toEqual(["Court."]);
  });
  it("fait défiler les morceaux au rythme de la voix et se tait entre deux répliques", () => {
    const p = { ...porkosPack.programs[0]!, subtitles: [{ at: 1, text: long, dur: 12 }, { at: 20, text: "Suite.", dur: 1 }] };
    const vus = new Set<string>();
    for (let t = 1; t < 13; t += 0.25) vus.add(sousTitre(p, t)!);
    expect([...vus]).toEqual(decouper(long));
    expect(sousTitre(p, 0.5)).toBeNull();
    expect(sousTitre(p, 16)).toBeNull();
    expect(sousTitre(p, 20.2)).toBe("Suite.");
  });
});
