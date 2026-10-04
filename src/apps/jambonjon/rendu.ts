/**
 * Rendu de Jambonjon : lanceur de rayons logiciel en basse résolution (224×168), murs, sol et plafond texturés,
 * brouillard de cave épais, monstres et objets en sprites, tramage ordonné et couleurs ramenées sur 15 bits
 * (l'aspect d'une console de salon du début des années 2000). Textures et sprites sont dessinés ici, en pixels.
 */
import { DESSINS_ENNEMIS } from "./ennemis-sprites";
import type { SpriteMonstre } from "@/content/types";
import { ESCALIER, MUR, type Partie } from "./logic";

export const LARGEUR = 224;
export const HAUTEUR = 168;
const T = 32; // côté des textures

type Tex = { w: number; h: number; px: Uint8ClampedArray };

/* ------------------------------ Dessin d'atelier ------------------------------ */

function toile(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  return { c, g };
}

/** Bruit déterministe pour les grains de pierre. */
const bruit = (x: number, y: number, s: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

function lire(g: CanvasRenderingContext2D, w: number, h: number): Tex {
  return { w, h, px: g.getImageData(0, 0, w, h).data };
}

/** Grain : chaque pixel varie un peu de luminosité. */
function grain(g: CanvasRenderingContext2D, w: number, h: number, force: number, s: number) {
  const im = g.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const k = 1 + (bruit(x, y, s) - 0.5) * force;
      im.data[i] = im.data[i]! * k;
      im.data[i + 1] = im.data[i + 1]! * k;
      im.data[i + 2] = im.data[i + 2]! * k;
    }
  g.putImageData(im, 0, 0);
}

function murPierre(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "#3b2e24";
  g.fillRect(0, 0, T, T);
  const rangs = 4;
  for (let r = 0; r < rangs; r++) {
    const y = r * 8;
    const decal = r % 2 ? 8 : 0;
    for (let k = -1; k < 3; k++) {
      const x = k * 16 + decal;
      const t = bruit(k + 3, r, s);
      g.fillStyle = t < 0.33 ? "#8a7056" : t < 0.66 ? "#7a6049" : "#94795d";
      g.fillRect(x + 1, y + 1, 14, 6);
      g.fillStyle = "#a88c6c";
      g.fillRect(x + 1, y + 1, 14, 1);
      g.fillStyle = "#5c4734";
      g.fillRect(x + 1, y + 6, 14, 1);
    }
  }
  grain(g, T, T, 0.35, s);
}

function texturesMurs(): Tex[] {
  const out: Tex[] = [];
  // 0 : pierre de cave
  {
    const { g } = toile(T, T);
    murPierre(g, 1);
    out.push(lire(g, T, T));
  }
  // 1 : jambons pendus au crochet
  {
    const { g } = toile(T, T);
    murPierre(g, 2);
    g.fillStyle = "#2a2018";
    g.fillRect(0, 3, T, 2);
    for (const x of [6, 20]) {
      g.fillStyle = "#9a9a9a";
      g.fillRect(x + 2, 4, 1, 4);
      g.fillStyle = "#e8dcc8";
      g.fillRect(x + 1, 8, 3, 3);
      g.fillStyle = "#8c3a2a";
      g.beginPath();
      g.ellipse(x + 2.5, 19, 5, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#b5523a";
      g.beginPath();
      g.ellipse(x + 1.5, 17, 3, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#f2c9a8";
      g.fillRect(x, 24, 5, 2);
    }
    grain(g, T, T, 0.2, 7);
    out.push(lire(g, T, T));
  }
  // 2 : casier à tonneaux
  {
    const { g } = toile(T, T);
    murPierre(g, 3);
    for (const [cx, cy] of [
      [8, 10],
      [24, 10],
      [16, 24],
    ] as const) {
      g.fillStyle = "#5a3418";
      g.beginPath();
      g.arc(cx, cy, 7, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#8a5a2c";
      g.beginPath();
      g.arc(cx, cy, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#6a6a6a";
      g.fillRect(cx - 7, cy - 1, 14, 1);
      g.fillStyle = "#2a1a0c";
      g.fillRect(cx - 1, cy - 1, 2, 2);
    }
    grain(g, T, T, 0.2, 9);
    out.push(lire(g, T, T));
  }
  return out;
}

function textureSol(): Tex {
  const { g } = toile(T, T);
  g.fillStyle = "#2a2219";
  g.fillRect(0, 0, T, T);
  for (const [x, y, w, h] of [
    [1, 1, 14, 14],
    [17, 1, 14, 9],
    [17, 11, 14, 20],
    [1, 17, 14, 14],
  ] as const) {
    g.fillStyle = bruit(x, y, 3) < 0.5 ? "#5e5040" : "#544637";
    g.fillRect(x, y, w, h);
    g.fillStyle = "#6c5c48";
    g.fillRect(x, y, w, 1);
  }
  grain(g, T, T, 0.4, 11);
  return lire(g, T, T);
}

function texturePlafond(): Tex {
  const { g } = toile(T, T);
  g.fillStyle = "#1c150f";
  g.fillRect(0, 0, T, T);
  for (let x = 0; x < T; x += 8) {
    g.fillStyle = "#3e2a1a";
    g.fillRect(x + 1, 0, 6, T);
    g.fillStyle = "#4e3622";
    g.fillRect(x + 1, 0, 1, T);
  }
  grain(g, T, T, 0.5, 13);
  return lire(g, T, T);
}

function textureTrappe(): Tex {
  const { g } = toile(T, T);
  g.drawImage(toileDepuis(textureSol()), 0, 0);
  g.fillStyle = "#0a0806";
  g.fillRect(5, 5, 22, 22);
  g.fillStyle = "#6a4a2a";
  for (let y = 7; y < 27; y += 5) g.fillRect(9, y, 14, 2);
  g.fillRect(8, 5, 2, 22);
  g.fillRect(22, 5, 2, 22);
  g.fillStyle = "#c98a1c";
  g.fillRect(4, 4, 24, 1);
  g.fillRect(4, 27, 24, 1);
  g.fillRect(4, 4, 1, 24);
  g.fillRect(27, 4, 1, 24);
  return lire(g, T, T);
}

function toileDepuis(t: Tex) {
  const { c, g } = toile(t.w, t.h);
  g.putImageData(new ImageData(new Uint8ClampedArray(t.px), t.w, t.h), 0, 0);
  return c;
}

/* --------------------------------- Sprites --------------------------------- */

const S = 40; // côté des sprites

/** Rend les bords nets (alpha tout ou rien) et ajoute un contour sombre, comme un sprite d'époque. */
function finirSprite(g: CanvasRenderingContext2D, transparence = 1): Tex {
  const im = g.getImageData(0, 0, S, S);
  const d = im.data;
  const plein = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) plein[i] = d[i * 4 + 3]! > 110 ? 1 : 0;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if (plein[i]) {
        d[i * 4 + 3] = Math.round(255 * transparence);
        continue;
      }
      const voisin = (x > 0 && plein[i - 1]) || (x < S - 1 && plein[i + 1]) || (y > 0 && plein[i - S]) || (y < S - 1 && plein[i + S]);
      if (voisin) {
        d[i * 4] = 12;
        d[i * 4 + 1] = 8;
        d[i * 4 + 2] = 6;
        d[i * 4 + 3] = Math.round(255 * transparence);
      } else d[i * 4 + 3] = 0;
    }
  return { w: S, h: S, px: d };
}

function ell(g: CanvasRenderingContext2D, c: string, x: number, y: number, rx: number, ry: number) {
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}
function rect(g: CanvasRenderingContext2D, c: string, x: number, y: number, w: number, h: number) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}


const DESSINS_MONSTRES: Record<SpriteMonstre, (g: CanvasRenderingContext2D) => number> = {
  ...DESSINS_ENNEMIS,
  inspecteur: (g) => {
    // Pixel art à coordonnées entières : silhouette asymétrique, palette limitée,
    // grandes masses lisibles de loin, visage et procès-verbal lisibles de près.
    const p = { nuit: "#25232d", ombre: "#393744", tissu: "#555463", pli: "#787986",
      peau: "#c28b71", chair: "#e4b593", clair: "#f3d2aa", rouge: "#922e3b",
      or: "#ceaa62", papier: "#e9ddbc", encre: "#696678" };
    const r = (c: string, x: number, y: number, w: number, h: number) => rect(g, c, x, y, w, h);
    // Bottines, jambes séparées et bas du manteau.
    r(p.nuit, 12, 32, 6, 6); r(p.nuit, 22, 32, 5, 6);
    r(p.pli, 13, 33, 2, 3); r(p.tissu, 23, 33, 1, 3);
    r(p.nuit, 10, 37, 8, 2); r(p.nuit, 22, 37, 8, 2);
    r(p.ombre, 10, 37, 4, 1); r(p.ombre, 26, 37, 3, 1);
    r(p.ombre, 11, 17, 16, 17); r(p.tissu, 12, 18, 13, 14);
    r(p.pli, 12, 19, 2, 11); r(p.nuit, 20, 25, 1, 8);
    r(p.ombre, 15, 30, 4, 2); r(p.nuit, 11, 33, 8, 1); r(p.nuit, 22, 32, 5, 2);
    // Épaules tombantes, bras au tampon et bras tenant la planche.
    r(p.ombre, 8, 19, 4, 9); r(p.tissu, 8, 20, 2, 6);
    r(p.nuit, 7, 27, 5, 2); r(p.peau, 7, 29, 4, 3); r(p.chair, 7, 29, 2, 2);
    r(p.ombre, 26, 18, 4, 10); r(p.pli, 27, 19, 2, 3);
    r(p.papier, 16, 17, 7, 5); r(p.clair, 17, 17, 4, 2);
    r(p.rouge, 19, 19, 2, 7); r(p.rouge, 18, 24, 3, 2);
    r(p.nuit, 14, 18, 2, 3); r(p.nuit, 15, 21, 3, 1);
    r(p.pli, 14, 19, 1, 2); r(p.nuit, 23, 18, 2, 3); r(p.nuit, 22, 21, 2, 1);
    r(p.or, 14, 24, 2, 2); r(p.or, 21, 28, 1, 1);
    // Joues creuses, arcade menaçante, nez et moustache stricte.
    r(p.peau, 15, 8, 10, 8); r(p.chair, 16, 9, 7, 6);
    r(p.clair, 16, 9, 3, 2); r(p.peau, 15, 11, 2, 3); r(p.peau, 23, 10, 2, 5);
    r(p.nuit, 16, 10, 3, 1); r(p.nuit, 21, 10, 3, 1);
    r(p.nuit, 17, 11, 1, 1); r(p.nuit, 22, 11, 1, 1);
    r(p.clair, 19, 11, 2, 3); r(p.peau, 21, 13, 1, 1);
    r(p.peau, 17, 14, 6, 1); r(p.peau, 18, 15, 4, 1);
    r(p.peau, 18, 16, 4, 1);
    // Casquette d'État, visière épaisse et insigne doré.
    r(p.nuit, 14, 3, 12, 5); r(p.tissu, 15, 3, 9, 2);
    r(p.pli, 16, 3, 6, 1); r(p.ombre, 13, 5, 14, 2);
    r(p.or, 18, 5, 4, 2); r(p.clair, 19, 5, 1, 1);
    r(p.nuit, 12, 7, 16, 2); r(p.tissu, 13, 7, 5, 1);
    // Procès-verbal : bord épais, pince métallique, lignes et sceau rouge.
    r(p.nuit, 27, 20, 9, 14); r(p.or, 28, 20, 7, 13);
    r(p.papier, 29, 22, 5, 10); r(p.clair, 29, 22, 1, 9);
    r(p.pli, 30, 20, 3, 2); r(p.nuit, 31, 20, 1, 1);
    r(p.encre, 30, 24, 3, 1); r(p.encre, 30, 26, 3, 1); r(p.encre, 30, 28, 2, 1);
    r(p.rouge, 32, 30, 2, 2); r(p.peau, 26, 28, 3, 3); r(p.chair, 26, 28, 2, 1);
    // Tampon serré dans la main gauche.
    r(p.rouge, 8, 31, 2, 3); r(p.nuit, 6, 34, 6, 2); r(p.or, 7, 34, 4, 1);
    return 0.86;
  },

};

type Objet3D = "jambon" | "biere" | "tonneau" | "sac";
const DESSINS_OBJETS: Record<Objet3D, (g: CanvasRenderingContext2D) => number> = {
  jambon: (g) => {
    ell(g, "#8c3a2a", 22, 30, 12, 7);
    ell(g, "#c0604a", 20, 28, 9, 4);
    rect(g, "#f2e4d0", 6, 26, 8, 3);
    ell(g, "#f2e4d0", 6, 26, 3, 3);
    return 0.35;
  },
  biere: (g) => {
    rect(g, "#d8a020", 13, 18, 14, 18);
    rect(g, "#f0c040", 15, 20, 4, 14);
    ell(g, "#fffaf0", 20, 17, 9, 4);
    ell(g, "#fffaf0", 15, 16, 4, 3);
    g.strokeStyle = "#c8c0a8";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(29, 26, 5, -Math.PI / 2, Math.PI / 2);
    g.stroke();
    return 0.4;
  },
  tonneau: (g) => {
    ell(g, "#6a3e1a", 20, 27, 11, 12);
    for (let x = 11; x < 30; x += 4) rect(g, "#8a5a2c", x, 16, 2, 22);
    rect(g, "#a8a8a8", 9, 19, 22, 2);
    rect(g, "#a8a8a8", 9, 33, 22, 2);
    rect(g, "#c98a1c", 18, 24, 4, 4);
    return 0.5;
  },
  sac: (g) => {
    ell(g, "#8a7048", 20, 30, 11, 8);
    ell(g, "#a08458", 20, 22, 6, 5);
    rect(g, "#5a4024", 15, 20, 10, 2);
    rect(g, "#c98a1c", 18, 28, 4, 4);
    return 0.38;
  },
};

/* ------------------------------- Préparation ------------------------------- */

export interface Atelier {
  murs: Tex[];
  sol: Tex;
  plafond: Tex;
  trappe: Tex;
  monstres: Record<SpriteMonstre, { tex: Tex; taille: number }>;
  objets: Record<Objet3D, { tex: Tex; taille: number }>;
}

let atelier: Atelier | null = null;

/** Textures et sprites, dessinés une fois. */
export function preparer(): Atelier {
  if (atelier) return atelier;
  const monstres = {} as Atelier["monstres"];
  for (const k of Object.keys(DESSINS_MONSTRES) as SpriteMonstre[]) {
    const { g } = toile(S, S);
    const taille = DESSINS_MONSTRES[k](g);
    monstres[k] = { tex: finirSprite(g, k === "fantome" ? 0.75 : 1), taille };
  }
  const objets = {} as Atelier["objets"];
  for (const k of Object.keys(DESSINS_OBJETS) as Objet3D[]) {
    const { g } = toile(S, S);
    const taille = DESSINS_OBJETS[k](g);
    objets[k] = { tex: finirSprite(g), taille };
  }
  atelier = { murs: texturesMurs(), sol: textureSol(), plafond: texturePlafond(), trappe: textureTrappe(), monstres, objets };
  return atelier;
}

/* --------------------------------- Caméra ---------------------------------- */

export interface Camera {
  x: number;
  y: number;
  /** Angle en radians : 0 = est, −π/2 = nord. */
  angle: number;
  /** Balancement de la marche, secousse quand on est touché. */
  bob: number;
  secousse: number;
}

export const angleDe = (dir: number) => (dir * Math.PI) / 2 - Math.PI / 2;

/* ---------------------------------- Rendu ----------------------------------- */

const BROUILLARD = [66, 58, 50]; // couleur du brouillard : fumée de cave
const DENSITE = 0.88;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v / 16 - 0.5) * 9);

export interface EffetsRendu {
  temps: number;
  /** Monstres touchés à l'instant (clignotent en rouge). */
  touches: Set<number>;
  /** Éclair rouge plein écran (dégâts reçus) ou doré (niveau), 0–1. */
  eclair: number;
  eclairCouleur: [number, number, number];
  spriteDe: (type: string) => SpriteMonstre;
}

const zbuf = new Float32Array(LARGEUR);

/** Échantillon filtré (bilinéaire, comme les consoles de salon de l'an 2000), coordonnées en texels, bouclé. */
const ech = [0, 0, 0];
function bilin(t: Tex, u: number, v: number) {
  const u0 = Math.floor(u - 0.5);
  const v0 = Math.floor(v - 0.5);
  const fu = u - 0.5 - u0;
  const fv = v - 0.5 - v0;
  const m = t.w - 1;
  const x0 = u0 & m;
  const x1 = (u0 + 1) & m;
  const y0 = (v0 & m) * t.w;
  const y1 = ((v0 + 1) & m) * t.w;
  const a = (y0 + x0) * 4;
  const b = (y0 + x1) * 4;
  const c = (y1 + x0) * 4;
  const d = (y1 + x1) * 4;
  const p = t.px;
  for (let k = 0; k < 3; k++) {
    const h = p[a + k]! + (p[b + k]! - p[a + k]!) * fu;
    const l = p[c + k]! + (p[d + k]! - p[c + k]!) * fu;
    ech[k] = h + (l - h) * fv;
  }
}

export function rendre(out: ImageData, p: Partie, cam: Camera, fx: EffetsRendu) {
  const a = preparer();
  const W = LARGEUR;
  const H = HAUTEUR;
  const d = out.data;
  const c = p.carte;
  const dirX = Math.cos(cam.angle);
  const dirY = Math.sin(cam.angle);
  const k = 0.7;
  const plX = -dirY * k;
  const plY = dirX * k;
  const flamme = 0.93 + 0.07 * Math.sin(fx.temps * 0.011) * Math.sin(fx.temps * 0.0173 + 1);
  const horizon = H / 2 + cam.bob + cam.secousse;
  const lum = (dist: number) => Math.exp(-dist * DENSITE) * flamme;

  const ecrire = (i: number, r: number, g: number, b: number, f: number) => {
    d[i] = r * f + BROUILLARD[0]! * (1 - f);
    d[i + 1] = g * f + BROUILLARD[1]! * (1 - f);
    d[i + 2] = b * f + BROUILLARD[2]! * (1 - f);
    d[i + 3] = 255;
  };

  // Sol et plafond, ligne par ligne.
  for (let y = 0; y < H; y++) {
    const sol = y > horizon;
    const p0 = sol ? y - horizon : horizon - y;
    if (p0 < 0.5) {
      for (let x = 0; x < W; x++) ecrire((y * W + x) * 4, 0, 0, 0, 0);
      continue;
    }
    const dist = (0.5 * H) / p0;
    const f = lum(dist) * (sol ? 0.95 : 0.7);
    const rx0 = dirX - plX;
    const ry0 = dirY - plY;
    const pasX = (dist * 2 * plX) / W;
    const pasY = (dist * 2 * plY) / W;
    let fx0 = cam.x + dist * rx0;
    let fy0 = cam.y + dist * ry0;
    for (let x = 0; x < W; x++) {
      const cx = Math.floor(fx0);
      const cy = Math.floor(fy0);
      const tex = !sol ? a.plafond : cx >= 0 && cy >= 0 && cx < c.w && cy < c.h && c.cases[cy * c.w + cx] === ESCALIER ? a.trappe : a.sol;
      bilin(tex, (fx0 - cx) * T, (fy0 - cy) * T);
      ecrire((y * W + x) * 4, ech[0]!, ech[1]!, ech[2]!, f);
      fx0 += pasX;
      fy0 += pasY;
    }
  }

  // Murs, colonne par colonne (DDA).
  for (let x = 0; x < W; x++) {
    const cxr = (2 * x) / W - 1;
    const rx = dirX + plX * cxr;
    const ry = dirY + plY * cxr;
    let mx = Math.floor(cam.x);
    let my = Math.floor(cam.y);
    const ddx = Math.abs(1 / rx);
    const ddy = Math.abs(1 / ry);
    const sx = rx < 0 ? -1 : 1;
    const sy = ry < 0 ? -1 : 1;
    let sdx = rx < 0 ? (cam.x - mx) * ddx : (mx + 1 - cam.x) * ddx;
    let sdy = ry < 0 ? (cam.y - my) * ddy : (my + 1 - cam.y) * ddy;
    let cote = 0;
    let touche = false;
    for (let n = 0; n < 40; n++) {
      if (sdx < sdy) {
        sdx += ddx;
        mx += sx;
        cote = 0;
      } else {
        sdy += ddy;
        my += sy;
        cote = 1;
      }
      if (mx < 0 || my < 0 || mx >= c.w || my >= c.h || c.cases[my * c.w + mx] === MUR) {
        touche = true;
        break;
      }
    }
    const dist = cote === 0 ? sdx - ddx : sdy - ddy;
    zbuf[x] = touche ? dist : 1e9;
    if (!touche || dist > 9) continue;
    const hauteur = H / dist;
    const y0 = Math.floor(horizon - hauteur / 2);
    const y1 = Math.floor(horizon + hauteur / 2);
    let wx = cote === 0 ? cam.y + dist * ry : cam.x + dist * rx;
    wx -= Math.floor(wx);
    let tx = wx * T;
    if ((cote === 0 && rx > 0) || (cote === 1 && ry < 0)) tx = T - tx;
    const decor = mx >= 0 && my >= 0 && mx < c.w && my < c.h ? c.decor[my * c.w + mx]! : 0;
    const tex = a.murs[decor] ?? a.murs[0]!;
    const f = lum(dist) * (cote === 1 ? 0.78 : 1);
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) {
      bilin(tex, tx, ((y - y0) / (y1 - y0)) * T);
      ecrire((y * W + x) * 4, ech[0]!, ech[1]!, ech[2]!, f);
    }
  }

  // Sprites : monstres et objets au sol, du plus loin au plus proche.
  type Spr = { x: number; y: number; tex: Tex; taille: number; rouge: boolean; flotte: number };
  const sprites: Spr[] = [];
  for (const s of p.sol) {
    const o = s.tonneau ? a.objets.tonneau : s.butin.type === "jambon" ? a.objets.jambon : s.butin.type === "biere" ? a.objets.biere : a.objets.sac;
    sprites.push({ x: s.x + 0.5, y: s.y + 0.5, tex: o.tex, taille: o.taille, rouge: false, flotte: 0 });
  }
  for (const m of p.monstres) {
    const sp = a.monstres[fx.spriteDe(m.type)];
    const echelle = m.boss ? 1.25 : m.elite ? 1.12 : 1;
    sprites.push({ x: m.x + 0.5, y: m.y + 0.5, tex: sp.tex, taille: sp.taille * echelle, rouge: fx.touches.has(m.uid), flotte: Math.sin(fx.temps * 0.006 + m.uid) * 0.02 });
  }
  const inv = 1 / (plX * dirY - dirX * plY);
  const proj = sprites
    .map((s) => {
      const dx = s.x - cam.x;
      const dy = s.y - cam.y;
      return { s, tx: inv * (dirY * dx - dirX * dy), ty: inv * (-plY * dx + plX * dy) };
    })
    .filter((v) => v.ty > 0.01 && v.ty < 8)
    .map((v) => ({ ...v, ty: Math.max(0.12, v.ty) }))
    .sort((u, v) => v.ty - u.ty);
  for (const { s, tx, ty } of proj) {
    const ecranX = (W / 2) * (1 + tx / ty);
    const cote = (H / ty) * s.taille;
    const sol = horizon + H / ty / 2;
    const yb = sol - (s.flotte * H) / ty;
    const ya = yb - cote;
    const xa = ecranX - cote / 2;
    const f = lum(ty);
    for (let x = Math.max(0, Math.floor(xa)); x < Math.min(W, Math.ceil(xa + cote)); x++) {
      if (ty >= zbuf[x]!) continue;
      const u = Math.floor(((x - xa) / cote) * s.tex.w);
      if (u < 0 || u >= s.tex.w) continue;
      for (let y = Math.max(0, Math.floor(ya)); y < Math.min(H, Math.ceil(yb)); y++) {
        const v = Math.floor(((y - ya) / cote) * s.tex.h);
        if (v < 0 || v >= s.tex.h) continue;
        const ti = (v * s.tex.w + u) * 4;
        const al = s.tex.px[ti + 3]!;
        if (al < 10) continue;
        const i = (y * W + x) * 4;
        let r = s.tex.px[ti]!;
        let g = s.tex.px[ti + 1]!;
        let b = s.tex.px[ti + 2]!;
        if (s.rouge) {
          r = Math.min(255, r * 0.5 + 200);
          g *= 0.4;
          b *= 0.4;
        }
        if (al < 250) {
          const t = al / 255;
          const pr = d[i]!;
          const pg = d[i + 1]!;
          const pb = d[i + 2]!;
          ecrire(i, r, g, b, f);
          d[i] = d[i]! * t + pr * (1 - t);
          d[i + 1] = d[i + 1]! * t + pg * (1 - t);
          d[i + 2] = d[i + 2]! * t + pb * (1 - t);
        } else ecrire(i, r, g, b, f);
      }
    }
  }

  // Éclair, tramage ordonné, 15 bits, vignette.
  const [er, eg, eb] = fx.eclairCouleur;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const vx = (x / W - 0.5) * 2;
      const vy = (y / H - 0.5) * 2;
      const vig = 1 - 0.28 * (vx * vx + vy * vy);
      const t = BAYER[(y & 3) * 4 + (x & 3)]!;
      for (let k2 = 0; k2 < 3; k2++) {
        let v = d[i + k2]! * vig;
        if (fx.eclair > 0) v = v * (1 - fx.eclair) + [er, eg, eb][k2]! * fx.eclair;
        v = Math.max(0, Math.min(255, v + t));
        d[i + k2] = (v >> 3) << 3;
      }
    }
}

/* --------------------------------- Carte 2D --------------------------------- */

/** Carte automatique : cases vues, escalier, citoyen et sa direction. */
export function dessinerCarte(g: CanvasRenderingContext2D, p: Partie, taille: number) {
  const c = p.carte;
  const cell = Math.max(2, Math.floor(taille / Math.max(c.w, c.h)));
  const ox = Math.floor((taille - cell * c.w) / 2);
  const oy = Math.floor((taille - cell * c.h) / 2);
  g.fillStyle = "#15110d";
  g.fillRect(0, 0, taille, taille);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const i = y * c.w + x;
      if (!c.vu[i]) continue;
      const v = c.cases[i];
      g.fillStyle = v === MUR ? "#6d5f45" : v === ESCALIER ? "#c98a1c" : "#2f2820";
      g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  for (const m of p.monstres)
    if (c.vu[m.y * c.w + m.x] && Math.abs(m.x - p.joueur.x) + Math.abs(m.y - p.joueur.y) <= 3) {
      g.fillStyle = "#e04030";
      g.fillRect(ox + m.x * cell + 1, oy + m.y * cell + 1, Math.max(1, cell - 2), Math.max(1, cell - 2));
    }
  const j = p.joueur;
  const px = ox + j.x * cell + cell / 2;
  const py = oy + j.y * cell + cell / 2;
  g.fillStyle = "#f8f2e4";
  g.beginPath();
  const a = angleDe(j.dir);
  const r = Math.max(2.5, cell * 0.8);
  g.moveTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
  g.lineTo(px + Math.cos(a + 2.5) * r, py + Math.sin(a + 2.5) * r);
  g.lineTo(px + Math.cos(a - 2.5) * r, py + Math.sin(a - 2.5) * r);
  g.fill();
}
