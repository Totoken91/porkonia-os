import { describe, expect, it } from "vitest";
import { emptyWinState, winReducer, type Viewport } from "@/os/windows";
import { emptyRuleState, schedule } from "@/os/scheduler";
import { makeRng } from "@/os/rng";
import type { EventRule } from "@/content/types";
import { chord, LEVELS, newGame, remaining, reveal, toggleAssiette, neighbors } from "@/apps/nappe-vide/logic";

const vp: Viewport = { w: 1280, h: 800, bottom: 60 };
const open = (s = emptyWinState(), appId = "a", single = false) => winReducer(s, { type: "open", appId, title: appId, size: { w: 500, h: 400 }, single, vp });

describe("gestionnaire de fenêtres", () => {
  it("ouvre, met au premier plan, réduit et ferme", () => {
    let s = open();
    s = open(s, "b");
    expect(s.focusedId).toBe("w2");
    s = winReducer(s, { type: "focus", id: "w1" });
    expect(s.windows.find((w) => w.id === "w1")!.z).toBeGreaterThan(s.windows.find((w) => w.id === "w2")!.z);
    s = winReducer(s, { type: "minimize", id: "w1" });
    expect(s.focusedId).toBe("w2");
    s = winReducer(s, { type: "close", id: "w2" });
    expect(s.focusedId).toBeNull();
    s = winReducer(s, { type: "focus", id: "w1" });
    expect(s.windows[0]!.minimized).toBe(false);
  });
  it("une appli « single » n'ouvre qu'une fenêtre", () => {
    let s = open(undefined, "config", true);
    s = open(s, "config", true);
    expect(s.windows).toHaveLength(1);
  });
  it("garde la barre de titre à l'écran", () => {
    let s = open();
    s = winReducer(s, { type: "move", id: "w1", x: -5000, y: 5000, vp });
    const r = s.windows[0]!.rect;
    expect(r.x).toBeGreaterThan(-r.w);
    expect(r.y).toBeLessThanOrEqual(vp.h - vp.bottom - 32);
  });
  it("plein écran sur petit écran", () => {
    const s = winReducer(emptyWinState(), { type: "open", appId: "a", title: "a", size: { w: 800, h: 600 }, vp: { w: 390, h: 800, bottom: 60 } });
    expect(s.windows[0]!.maximized).toBe(true);
  });
});

describe("ordonnanceur d'événements", () => {
  const rules: EventRule[] = [
    { id: "bienvenue", trigger: { type: "login", delay: 1000 }, action: { type: "toast-pool", pool: "x" } },
    { id: "pub", trigger: { type: "interval", startAfter: 5000, every: 10000, jitter: 0 }, action: { type: "ad" }, max: 2 },
    { id: "cfg", trigger: { type: "app-open", app: "config" }, action: { type: "dialog-ref", id: "d" }, max: 1 },
    { id: "muet", trigger: { type: "login", delay: 0 }, action: { type: "toast-pool", pool: "y" }, unlessSetting: "rappels" },
  ];
  it("déclenche selon le temps, respecte max et les réglages", () => {
    const rng = makeRng(1);
    let st = emptyRuleState();
    const run = (i: Parameters<typeof schedule>[2]) => {
      const r = schedule(rules, st, i, rng, { rappels: false });
      st = r.state;
      return r.actions.map((a) => a.rule);
    };
    expect(run({ kind: "tick", elapsed: 500 })).toEqual([]);
    expect(run({ kind: "tick", elapsed: 1200 })).toEqual(["bienvenue"]);
    expect(run({ kind: "tick", elapsed: 1300 })).toEqual([]);
    expect(run({ kind: "tick", elapsed: 5000 })).toEqual(["pub"]);
    expect(run({ kind: "tick", elapsed: 14000 })).toEqual([]);
    expect(run({ kind: "tick", elapsed: 15000 })).toEqual(["pub"]);
    expect(run({ kind: "tick", elapsed: 99000 })).toEqual([]);
    expect(run({ kind: "app-open", app: "config", elapsed: 1 })).toEqual(["cfg"]);
    expect(run({ kind: "app-open", app: "config", elapsed: 2 })).toEqual([]);
  });
});

describe("Nappe Vide (démineur)", () => {
  const lvl = LEVELS[0]!;
  it("le premier service est toujours sûr et place le bon nombre de zones vides", () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = reveal(newGame(lvl), 40, makeRng(seed), 0);
      expect(g.state === "service" || g.state === "conforme").toBe(true);
      expect(g.cells.filter((c) => c.vide).length).toBe(lvl.vides);
      expect([40, ...neighbors(lvl, 40)].some((i) => g.cells[i]!.vide)).toBe(false);
    }
  });
  it("découvrir une zone vide = incident ; tout servir = banquet conforme", () => {
    const rng = makeRng(7);
    let g = reveal(newGame(lvl), 0, rng, 0);
    const bad = g.cells.findIndex((c) => c.vide);
    expect(reveal(g, bad, rng, 1).state).toBe("incident");
    for (let i = 0; i < g.cells.length; i++) if (!g.cells[i]!.vide) g = reveal(g, i, rng, 2);
    expect(g.state).toBe("conforme");
    expect(remaining(g)).toBe(0);
  });
  it("assiettes et service groupé", () => {
    const rng = makeRng(3);
    let g = reveal(newGame(lvl), 40, rng, 0);
    const num = g.cells.findIndex((c) => c.open && c.adj > 0);
    const around = neighbors(lvl, num);
    for (const n of around) if (g.cells[n]!.vide) g = toggleAssiette(g, n);
    const next = chord(g, num, rng, 1);
    expect(next.state).not.toBe("incident");
    expect(around.every((n) => next.cells[n]!.open || next.cells[n]!.assiette)).toBe(true);
  });
});

describe("icônes pixel", async () => {
  const { iconGrid, gridPaths } = await import("@/components/pixel");
  const noms = ["dossier", "texte", "image", "mail", "carte", "cadenas", "poubelle", "tele", "navigateur", "nappe", "config", "ordinateur", "executer"] as const;
  it("dessine chaque icône en 32×32 et 16×16, avec un contour noir", () => {
    for (const n of noms) {
      const g = iconGrid(n);
      expect(g).toHaveLength(1024);
      expect(g.filter(Boolean).length).toBeGreaterThan(150);
      expect(g).toContain("k");
      expect(iconGrid(n, 16)).toHaveLength(256);
      expect(iconGrid(n, 16).filter(Boolean).length).toBeGreaterThan(60);
      expect(gridPaths(g).length).toBeGreaterThan(2);
    }
  });
});

describe("gestionnaire de fenêtres : disposition et session", () => {
  const vp2: Viewport = { w: 800, h: 600, bottom: 28 };
  const ouvrir = (s = emptyWinState(), id = "a") => winReducer(s, { type: "open", appId: id, title: id, size: { w: 400, h: 300 }, vp: vp2 });
  it("cascade, mosaïque, tout réduire", () => {
    let s = ouvrir(ouvrir(ouvrir(), "b"), "c");
    s = winReducer(s, { type: "cascade", vp: vp2 });
    expect(s.windows.map((w) => w.rect.x)).toEqual([6, 32, 58]);
    s = winReducer(s, { type: "tile", vp: vp2 });
    const r = s.windows.map((w) => w.rect);
    expect(r[0]).toEqual({ x: 0, y: 0, w: 400, h: 286 });
    expect(r[2]).toEqual({ x: 0, y: 286, w: 400, h: 286 });
    s = winReducer(s, { type: "minimizeAll" });
    expect(s.windows.every((w) => w.minimized)).toBe(true);
    expect(s.focusedId).toBeNull();
  });
  it("enregistre et restaure une session", async () => {
    const { saveWindows } = await import("@/os/windows");
    let s = ouvrir(ouvrir(), "b");
    s = winReducer(s, { type: "minimize", id: "w1" });
    const saved = saveWindows(s);
    const r = winReducer(emptyWinState(), { type: "restore", windows: saved, vp: vp2 });
    expect(r.windows.map((w) => [w.appId, w.minimized])).toEqual([["a", true], ["b", false]]);
    expect(r.windows.find((w) => w.id === r.focusedId)!.appId).toBe("b");
  });
});
