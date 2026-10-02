/**
 * Gestionnaire de fenêtres — logique pure (aucun DOM), testée dans tests/windows.test.ts.
 */
export interface WinRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Win {
  id: string;
  appId: string;
  title: string;
  args: Record<string, string>;
  rect: WinRect;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

export interface WinState {
  windows: Win[];
  focusedId: string | null;
  nextZ: number;
  seq: number;
}

export const emptyWinState = (): WinState => ({ windows: [], focusedId: null, nextZ: 10, seq: 0 });

export interface Viewport {
  w: number;
  h: number;
  /** Hauteur réservée en bas (barre des tâches + bandeau). */
  bottom: number;
  /** PorkOS Poche : toute fenêtre occupe la zone utile, on ne déplace ni ne redimensionne rien. */
  poche?: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Garde toujours une partie de la barre de titre saisissable à l'écran. */
export function constrain(r: WinRect, vp: Viewport): WinRect {
  const w = clamp(r.w, 240, vp.w);
  const h = clamp(r.h, 140, vp.h - vp.bottom);
  return { w, h, x: clamp(r.x, -w + 120, vp.w - 120), y: clamp(r.y, 0, vp.h - vp.bottom - 32) };
}

export type WinAction =
  | { type: "open"; appId: string; title: string; args?: Record<string, string>; size: { w: number; h: number }; single?: boolean; vp: Viewport }
  | { type: "close"; id: string }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "toggleMaximize"; id: string }
  | { type: "move"; id: string; x: number; y: number; vp: Viewport }
  | { type: "resize"; id: string; w: number; h: number; vp: Viewport }
  | { type: "retitle"; id: string; title: string }
  | { type: "closeAll" }
  /** Réduit toutes les fenêtres (bouton « Afficher le bureau »). */
  | { type: "minimizeAll" }
  /** Dispose les fenêtres visibles en cascade, ou en mosaïque. */
  | { type: "cascade"; vp: Viewport }
  | { type: "tile"; vp: Viewport }
  /** Restaure une session enregistrée. */
  | { type: "restore"; windows: SavedWin[]; vp: Viewport };

/** Ce qu'on retient d'une fenêtre entre deux sessions. */
export interface SavedWin {
  appId: string;
  title: string;
  args: Record<string, string>;
  rect: WinRect;
  minimized: boolean;
  maximized: boolean;
}

export const saveWindows = (s: WinState): SavedWin[] =>
  [...s.windows].sort((a, b) => a.z - b.z).map(({ appId, title, args, rect, minimized, maximized }) => ({ appId, title, args, rect, minimized, maximized }));

function topVisible(ws: Win[]): string | null {
  const v = ws.filter((w) => !w.minimized).sort((a, b) => b.z - a.z);
  return v[0]?.id ?? null;
}

/**
 * Ordre du commutateur de tâches : la fenêtre au premier plan, puis les autres de la plus récente à la plus
 * ancienne (les réduites comprises, en dernier). On part de la deuxième : c'est vers elle qu'on bascule.
 */
export function ordreRecents(ws: Win[], focusedId: string | null): string[] {
  const rang = (w: Win) => (w.id === focusedId ? 2 : w.minimized ? 0 : 1);
  return [...ws].sort((a, b) => rang(b) - rang(a) || b.z - a.z).map((w) => w.id);
}

export function winReducer(s: WinState, a: WinAction): WinState {
  switch (a.type) {
    case "open": {
      const args = a.args ?? {};
      if (a.single) {
        const existing = s.windows.find((w) => w.appId === a.appId);
        if (existing) {
          return {
            ...s,
            nextZ: s.nextZ + 1,
            focusedId: existing.id,
            windows: s.windows.map((w) => (w.id === existing.id ? { ...w, args: Object.keys(args).length ? args : w.args, minimized: false, z: s.nextZ } : w)),
          };
        }
      }
      const seq = s.seq + 1;
      const offset = (s.windows.length % 6) * 22;
      const small = a.vp.poche ?? a.vp.w < 700;
      const rect = small
        ? { x: 0, y: 0, w: a.vp.w, h: a.vp.h - a.vp.bottom }
        : constrain(
            {
              x: Math.max(4, Math.round((a.vp.w - a.size.w) / 2) - 60 + offset),
              y: Math.max(4, Math.round((a.vp.h - a.vp.bottom - a.size.h) / 2) - 50 + offset),
              w: a.size.w,
              h: a.size.h,
            },
            a.vp,
          );
      const win: Win = { id: `w${seq}`, appId: a.appId, title: a.title, args, rect, z: s.nextZ, minimized: false, maximized: small };
      return { windows: [...s.windows, win], focusedId: win.id, nextZ: s.nextZ + 1, seq };
    }
    case "close": {
      const windows = s.windows.filter((w) => w.id !== a.id);
      return { ...s, windows, focusedId: s.focusedId === a.id ? topVisible(windows) : s.focusedId };
    }
    case "focus": {
      if (!s.windows.some((w) => w.id === a.id)) return s;
      return { ...s, focusedId: a.id, nextZ: s.nextZ + 1, windows: s.windows.map((w) => (w.id === a.id ? { ...w, z: s.nextZ, minimized: false } : w)) };
    }
    case "minimize": {
      const windows = s.windows.map((w) => (w.id === a.id ? { ...w, minimized: true } : w));
      return { ...s, windows, focusedId: s.focusedId === a.id ? topVisible(windows) : s.focusedId };
    }
    case "toggleMaximize":
      return { ...s, windows: s.windows.map((w) => (w.id === a.id ? { ...w, maximized: !w.maximized } : w)) };
    case "move":
      return { ...s, windows: s.windows.map((w) => (w.id === a.id ? { ...w, rect: constrain({ ...w.rect, x: a.x, y: a.y }, a.vp) } : w)) };
    case "resize":
      return { ...s, windows: s.windows.map((w) => (w.id === a.id ? { ...w, rect: constrain({ ...w.rect, w: a.w, h: a.h }, a.vp) } : w)) };
    case "retitle":
      return { ...s, windows: s.windows.map((w) => (w.id === a.id ? { ...w, title: a.title } : w)) };
    case "closeAll":
      return { ...emptyWinState(), seq: s.seq };
    case "minimizeAll":
      return { ...s, focusedId: null, windows: s.windows.map((w) => ({ ...w, minimized: true })) };
    case "cascade": {
      const order = s.windows.filter((w) => !w.minimized).sort((a, b) => a.z - b.z);
      const pos = new Map(order.map((w, i) => [w.id, i]));
      return {
        ...s,
        windows: s.windows.map((w) => {
          const i = pos.get(w.id);
          if (i === undefined) return w;
          return { ...w, maximized: false, rect: constrain({ ...w.rect, x: 6 + i * 26, y: 6 + i * 26 }, a.vp) };
        }),
      };
    }
    case "tile": {
      const order = s.windows.filter((w) => !w.minimized).sort((a, b) => a.z - b.z);
      if (!order.length) return s;
      const cols = Math.ceil(Math.sqrt(order.length));
      const rows = Math.ceil(order.length / cols);
      const W = Math.floor(a.vp.w / cols);
      const H = Math.floor((a.vp.h - a.vp.bottom) / rows);
      const pos = new Map(order.map((w, i) => [w.id, i]));
      return {
        ...s,
        windows: s.windows.map((w) => {
          const i = pos.get(w.id);
          if (i === undefined) return w;
          return { ...w, maximized: false, rect: { x: (i % cols) * W, y: Math.floor(i / cols) * H, w: W, h: H } };
        }),
      };
    }
    case "restore": {
      let seq = s.seq;
      let z = s.nextZ;
      const windows: Win[] = a.windows.map((sw) => ({ ...sw, rect: constrain(sw.rect, a.vp), maximized: a.vp.poche || sw.maximized, id: `w${++seq}`, z: z++ }));
      const top = [...windows].reverse().find((w) => !w.minimized);
      return { windows: [...s.windows, ...windows], focusedId: top?.id ?? s.focusedId, nextZ: z, seq };
    }
  }
}
