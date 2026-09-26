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
  | { type: "closeAll" };

function topVisible(ws: Win[]): string | null {
  const v = ws.filter((w) => !w.minimized).sort((a, b) => b.z - a.z);
  return v[0]?.id ?? null;
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
      const offset = (s.windows.length % 8) * 28;
      const small = a.vp.w < 700;
      const rect = small
        ? { x: 0, y: 0, w: a.vp.w, h: a.vp.h - a.vp.bottom }
        : constrain({ x: Math.round((a.vp.w - a.size.w) / 2) - 120 + offset, y: 40 + offset, w: a.size.w, h: a.size.h }, a.vp);
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
  }
}
