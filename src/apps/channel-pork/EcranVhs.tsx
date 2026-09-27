"use client";
/**
 * Écran VHS de Channel Pork : rendu canvas 4:3 d'une cassette usée.
 * Chaîne de dégradation : image (Ken Burns) + habillage d'antenne → luminance nette, chrominance étalée et décalée,
 * écho du signal → ondulation des lignes, tracking, commutation des têtes, drop-outs, grain, noirs délavés →
 * affichage du magnétoscope (net, par-dessus). Aucune lecture de pixels : les images d'origine restent des liens.
 */
import { useEffect, useRef } from "react";
import { type Bulletin, dessinerBulletin } from "./meteoCanvas";
import { VHS, lineOffset, wrapText } from "./vhs";

export interface EcranVhsProps {
  image: string | null;
  video?: string;
  /** Avancement dans la diapositive courante (0–1), pour le zoom lent. */
  progression: number;
  cle: string;
  programme: string;
  lecture: boolean;
  chaine: string;
  /** Numéro de la chaîne, affiché par le téléviseur quand on zappe. */
  numero: number;
  /** Point de l'image à garder dans le cadre 4:3 (0–1). */
  cadrage?: [number, number];
  /** Image fixe, sans zoom lent (cartes météo). */
  fixe?: boolean;
  /** Bulletin météo dessiné sur la carte. */
  bulletin?: Bulletin | null;
  bandeau: { etiquette: string; texte: string } | null;
  mention?: string;
  soustitre: string | null;
}

const { w: W, h: H } = VHS;
const CW = Math.round(W / 8);

function toile(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function bruit(): HTMLCanvasElement {
  const c = toile(W, H);
  const g = c.getContext("2d")!;
  const img = g.createImageData(W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function EcranVhs(props: EcranVhsProps) {
  const cadre = useRef<HTMLDivElement>(null);
  const sortie = useRef<HTMLCanvasElement>(null);
  const courant = useRef(props);
  courant.current = props;

  // Garder l'écran exactement en 4:3 dans l'espace disponible.
  useEffect(() => {
    const el = cadre.current;
    const c = sortie.current;
    if (!el || !c) return;
    const ajuster = () => {
      const r = el.getBoundingClientRect();
      const k = el.offsetWidth ? r.width / el.offsetWidth : 1;
      const w = r.width / k - 12;
      const h = r.height / k - 12;
      const largeur = Math.max(80, Math.min(w, (h * 4) / 3));
      c.style.width = `${Math.floor(largeur)}px`;
      c.style.height = `${Math.floor((largeur * 3) / 4)}px`;
    };
    ajuster();
    const ro = new ResizeObserver(ajuster);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const out = sortie.current!;
    const o = out.getContext("2d")!;
    const base = toile(W, H);
    const b = base.getContext("2d")!;
    const luma = toile(W, H);
    const l = luma.getContext("2d")!;
    const chroma = toile(CW, H);
    const c = chroma.getContext("2d")!;
    const trame = toile(W, H);
    const f = trame.getContext("2d")!;
    const bruits = [bruit(), bruit(), bruit(), bruit()];
    const images = new Map<string, HTMLImageElement>();
    let video: HTMLVideoElement | null = null;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const racine = getComputedStyle(document.documentElement);
    const police = (racine.getPropertyValue("--font-terminal").trim() || "monospace").replace(/;$/, "");
    const affichage = '"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif';

    let dernier = 0;
    let n = 0;
    let cle = "";
    let programme = "";
    let numero = -1;
    let glitchJusqua = 0;
    let osdJusqua = 0;
    let tracking: { debut: number; duree: number; force: number } | null = null;
    let prochainTracking = performance.now() + 6000 + Math.random() * 8000;
    let vague: { debut: number; duree: number } | null = null;
    let prochaineVague = performance.now() + 12000 + Math.random() * 15000;
    let raf = 0;

    const image = (src: string) => {
      let img = images.get(src);
      if (!img) {
        img = new Image();
        img.referrerPolicy = "no-referrer";
        img.decoding = "async";
        img.src = src;
        images.set(src, img);
      }
      return img.complete && img.naturalWidth ? img : null;
    };

    /** Habillage d'antenne : dessiné dans l'image, il subit donc toute la dégradation de la cassette. */
    const habillage = (p: EcranVhsProps) => {
      b.textBaseline = "top";
      // logo de chaîne
      b.font = `bold 17px ${affichage}`;
      b.fillStyle = "rgba(255,255,255,0.82)";
      b.textAlign = "right";
      const logo = p.chaine.toUpperCase();
      const lw = b.measureText(logo).width;
      if (lw > 120) b.font = `bold ${Math.max(10, Math.floor((17 * 120) / lw))}px ${affichage}`;
      b.fillText(logo, W - 14, 12);
      b.fillStyle = "#c01018";
      b.fillRect(W - 58, 31, 44, 11);
      b.font = `bold 9px ${affichage}`;
      b.fillStyle = "#fff";
      b.fillText("DIRECT", W - 18, 32);
      b.textAlign = "left";
      if (p.mention) {
        b.font = `10px ${affichage}`;
        const lignes = wrapText(p.mention, 200, (s) => b.measureText(s).width);
        b.fillStyle = "rgba(0,0,0,0.55)";
        b.fillRect(10, 10, 208, lignes.length * 12 + 6);
        b.fillStyle = "#efe3c6";
        lignes.forEach((ln, i) => b.fillText(ln, 14, 13 + i * 12));
      }
      if (p.bandeau) {
        const y = Math.round(H * 0.7);
        b.font = `bold 15px ${affichage}`;
        const etq = p.bandeau.etiquette.toUpperCase();
        const le = b.measureText(etq).width + 16;
        b.fillStyle = "#c01018";
        b.fillRect(0, y, le, 22);
        b.fillStyle = "#efe3c6";
        b.fillRect(le, y, W - le, 22);
        b.fillStyle = "#fff";
        b.fillText(etq, 8, y + 4);
        b.fillStyle = "#15110d";
        let texte = p.bandeau.texte.toUpperCase();
        while (b.measureText(texte).width > W - le - 16 && texte.length > 4) texte = `${texte.slice(0, -2)}…`;
        b.fillText(texte, le + 8, y + 4);
      }
      if (p.soustitre) {
        // Sous-titres télétexte : caractères jaunes sur pavés noirs.
        b.font = `18px ${police}`;
        const lignes = wrapText(p.soustitre, W - 60, (s) => b.measureText(s).width).slice(-3);
        lignes.forEach((ln, i) => {
          const wl = b.measureText(ln).width;
          const x = Math.round((W - wl) / 2);
          const yy = H - 14 - (lignes.length - i) * 18;
          b.fillStyle = "#000";
          b.fillRect(x - 4, yy - 1, wl + 8, 18);
          b.fillStyle = "#ffe74a";
          b.fillText(ln, x, yy);
        });
      }
    };

    const dessiner = (ts: number) => {
      raf = requestAnimationFrame(dessiner);
      if (ts - dernier < 40 || !out.isConnected || out.offsetParent === null) return; // 25 images/s
      dernier = ts;
      n++;
      const p = courant.current;
      const t = ts / 1000;

      if (p.cle !== cle) {
        if (cle) glitchJusqua = ts + 260;
        cle = p.cle;
      }
      if (p.numero !== numero) {
        // Changement de chaîne : neige franche, puis l'image s'accroche.
        if (numero !== -1) {
          glitchJusqua = ts + 480;
          tracking = { debut: ts + 480, duree: 1100, force: 1 };
        }
        osdJusqua = ts + 3200;
        numero = p.numero;
        programme = p.programme;
      }
      if (p.programme !== programme) {
        if (programme) {
          glitchJusqua = ts + 520;
          tracking = { debut: ts, duree: 900, force: 1 };
        }
        osdJusqua = ts + 3200;
        programme = p.programme;
      }
      if (!reduit && !tracking && ts > prochainTracking) {
        tracking = { debut: ts, duree: 1400 + Math.random() * 1400, force: 0.35 + Math.random() * 0.5 };
        prochainTracking = ts + 9000 + Math.random() * 14000;
      }
      if (!reduit && !vague && ts > prochaineVague) {
        vague = { debut: ts, duree: 700 + Math.random() * 600 };
        prochaineVague = ts + 15000 + Math.random() * 20000;
      }
      const glitch = ts < glitchJusqua;

      // 1. Source (figée en pause : on garde la dernière image)
      if (p.lecture || n < 3) {
        b.globalCompositeOperation = "source-over";
        b.fillStyle = "#000";
        b.fillRect(0, 0, W, H);
        let src: CanvasImageSource | null = null;
        let sw = 0;
        let sh = 0;
        if (p.video) {
          if (!video) {
            video = document.createElement("video");
            video.src = p.video;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            void video.play().catch(() => {});
          }
          if (video.readyState >= 2) {
            src = video;
            sw = video.videoWidth;
            sh = video.videoHeight;
          }
        } else if (p.image) {
          const img = image(p.image);
          if (img) {
            src = img;
            sw = img.naturalWidth;
            sh = img.naturalHeight;
          }
        }
        if (src && !glitch) {
          // Recadrage 4:3 et zoom lent (Ken Burns)
          const lent = !reduit && !p.fixe;
          const zoom = p.fixe ? 1 : 1.04 + 0.09 * (lent ? p.progression : 0);
          const cible = W / H;
          let cw = sw;
          let ch = sw / cible;
          if (ch > sh) {
            ch = sh;
            cw = sh * cible;
          }
          cw /= zoom;
          ch /= zoom;
          const [fx, fy] = p.cadrage ?? [0.5, 0.35];
          const borne = (x: number) => Math.max(0, Math.min(1, x));
          const sx = (sw - cw) * borne(fx + 0.12 * (lent ? p.progression - 0.5 : 0));
          const sy = (sh - ch) * borne(fy);
          b.filter = "saturate(1.3) contrast(1.06) sepia(0.14)";
          b.drawImage(src, sx, sy, cw, ch, 0, 0, W, H);
          b.filter = "none";
          if (p.bulletin) dessinerBulletin(b, p.bulletin, W, H, reduit ? 0 : t);
        } else {
          // Pas de signal : neige
          b.drawImage(bruits[n % 4]!, 0, 0);
        }
        habillage(p);
      }

      // 2. Luminance nette, chrominance étalée et décalée, écho du signal
      l.filter = "grayscale(1) contrast(1.18) brightness(1.08) blur(0.75px)";
      l.drawImage(base, 0, 0);
      l.filter = "none";
      c.filter = "saturate(1.6) blur(0.8px)";
      c.drawImage(base, 0, 0, CW, H);
      c.filter = "none";
      f.globalCompositeOperation = "copy";
      f.drawImage(luma, 0, 0);
      f.globalCompositeOperation = "color";
      f.drawImage(chroma, 0, 0, CW, H, 5, 0, W, H);
      // bavure rouge qui déborde à droite des aplats
      f.globalCompositeOperation = "screen";
      f.globalAlpha = 0.16;
      f.drawImage(chroma, 0, 0, CW, H, 11, 1, W, H);
      // accentuation des contours du magnétoscope : halo clair juste après les bords
      f.globalCompositeOperation = "overlay";
      f.globalAlpha = 0.3;
      f.drawImage(luma, 2, 0);
      // écho du signal (image fantôme décalée)
      f.globalCompositeOperation = "lighter";
      f.globalAlpha = 0.09;
      f.drawImage(luma, 10, 0);
      f.globalAlpha = 0.05;
      f.drawImage(luma, 21, 0);
      // dominante chaude des cassettes fatiguées
      f.globalCompositeOperation = "soft-light";
      f.globalAlpha = 1;
      f.fillStyle = "rgba(255, 130, 70, 0.22)";
      f.fillRect(0, 0, W, H);
      f.globalAlpha = 1;
      f.globalCompositeOperation = "source-over";

      // 3. Lignes : ondulation, tracking, commutation des têtes, saut vertical
      o.globalCompositeOperation = "source-over";
      o.globalAlpha = 1;
      o.fillStyle = "#050308";
      o.fillRect(0, 0, W, H);
      let bande: number | null = null;
      let force = 0;
      if (tracking) {
        const k = (ts - tracking.debut) / tracking.duree;
        if (k >= 1) tracking = null;
        else {
          bande = H + 20 - k * (H + 40);
          force = tracking.force;
        }
      }
      const pause = !p.lecture;
      const saut = glitch ? Math.round((Math.random() - 0.5) * 14) : pause ? (n % 2) - 0.5 : 0;
      const kv = vague ? (ts - vague.debut) / vague.duree : -1;
      if (kv >= 1) vague = null;
      for (let y = 0; y < H; y += 2) {
        const ondule = kv >= 0 && kv < 1 ? Math.sin(y * 0.08 + ts * 0.02) * 7 * Math.sin(Math.PI * kv) : 0;
        const dx = reduit
          ? 0
          : ondule + lineOffset(y, H, { t, tracking: bande, force, alea: Math.random() }) + (pause && (Math.abs(y - H * 0.34) < 5 || Math.abs(y - H * 0.72) < 4) ? (Math.random() - 0.5) * 30 : 0);
        o.drawImage(trame, 0, y, W, 2, dx, y + saut, W, 2);
      }

      // 4. Bruits : bande de tracking, commutation des têtes, barres de pause, drop-outs, grain
      o.globalCompositeOperation = "screen";
      const bandeBruit = (y: number, h: number, a: number) => {
        o.globalAlpha = a;
        o.drawImage(bruits[(n + 1) % 4]!, Math.floor(Math.random() * 40), Math.floor(Math.random() * H), W, h, 0, y, W, h);
      };
      if (bande !== null) bandeBruit(Math.round(bande - 5), 10, 0.55 * force + 0.15);
      bandeBruit(H - 7, 7, 0.45);
      if (pause) {
        bandeBruit(Math.round(H * 0.34 - 3 + (n % 3)), 6, 0.6);
        bandeBruit(Math.round(H * 0.72 - 2 - (n % 2)), 4, 0.5);
      }
      if (glitch) bandeBruit(0, H, 0.35);
      o.globalAlpha = 1;
      if (!reduit && Math.random() < 0.45) {
        o.fillStyle = "rgba(255,255,255,0.8)";
        for (let i = 0, k = 1 + Math.floor(Math.random() * 4); i < k; i++) o.fillRect(Math.random() * W, Math.random() * H, 6 + Math.random() * 90, 1);
      }
      if (!reduit && Math.random() < 0.08) bandeBruit(Math.floor(Math.random() * H), 2 + Math.floor(Math.random() * 3), 0.5);
      o.globalCompositeOperation = "overlay";
      o.globalAlpha = 0.26;
      o.drawImage(bruits[n % 4]!, reduit ? 0 : -Math.floor(Math.random() * 20), reduit ? 0 : -Math.floor(Math.random() * 20));
      // noirs délavés, légèrement violacés ; lignes de la trame
      o.globalAlpha = 1;
      o.globalCompositeOperation = "screen";
      o.fillStyle = "rgba(34, 20, 46, 0.14)";
      o.fillRect(0, 0, W, H);
      o.globalCompositeOperation = "source-over";
      o.fillStyle = "rgba(0,0,0,0.16)";
      for (let y = 1; y < H; y += 2) o.fillRect(0, y, W, 1);
      // bombé du tube de télévision
      const v = o.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.55)");
      o.fillStyle = v;
      o.fillRect(0, 0, W, H);

      // 5. Affichage du magnétoscope (net, par-dessus la cassette)
      o.font = `20px ${police}`;
      o.textBaseline = "top";
      const osd = (texte: string, x: number, y: number, align: CanvasTextAlign = "left") => {
        o.textAlign = align;
        o.fillStyle = "rgba(0,0,0,0.6)";
        o.fillText(texte, x + 1, y + 1);
        o.fillStyle = "#f2f2f2";
        o.fillText(texte, x, y);
      };
      if (pause) {
        if (Math.floor(t * 2) % 2 === 0) osd("PAUSE ▮▮", 16, 14);
      } else if (ts < osdJusqua) {
        // Numéro de chaîne du téléviseur, vert, comme sur les vieux postes.
        o.font = `28px ${police}`;
        o.textAlign = "left";
        o.fillStyle = "rgba(0,0,0,0.6)";
        o.fillText(String(p.numero).padStart(2, "0"), 17, 13);
        o.fillStyle = "#5dff72";
        o.fillText(String(p.numero).padStart(2, "0"), 16, 12);
        o.font = `20px ${police}`;
        osd(p.chaine.toUpperCase(), 56, 18);
      }
      o.textAlign = "left";
    };
    raf = requestAnimationFrame(dessiner);
    return () => {
      cancelAnimationFrame(raf);
      if (video) {
        video.pause();
        video.src = "";
      }
    };
  }, []);

  return (
    <div className="tv-ecran" ref={cadre} data-testid="tv-screen">
      <canvas ref={sortie} className="tv-canvas" width={W} height={H} aria-label={props.soustitre ?? props.chaine} />
    </div>
  );
}
