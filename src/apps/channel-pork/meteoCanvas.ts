/**
 * Habillage du bulletin météo de Canal 1 Météo, dessiné sur la carte avant la dégradation VHS :
 * pictogrammes animés (soleil, nuages, pluie, neige, brouillard, confettis, mousse, vent),
 * températures en pavés colorés, nom des lieux, titre du bulletin.
 */
import type { IconeMeteo } from "@/content/types";

export interface PointMeteo {
  x: number;
  y: number;
  nom: string;
  icone?: IconeMeteo;
  temp?: number;
  texte?: string;
  /** Direction du vent (degrés, 0 = vers le nord) et force (Beaufort). */
  vent?: { dir: number; force: number };
}
export interface Bulletin {
  titre: string;
  points: PointMeteo[];
}

const POLICE = '"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif';

function contour(g: CanvasRenderingContext2D, remplir: string, trait = "#1b2230", l = 1.4) {
  g.fillStyle = remplir;
  g.fill();
  g.lineWidth = l;
  g.strokeStyle = trait;
  g.stroke();
}

function soleil(g: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  g.save();
  g.translate(x, y);
  g.rotate(t * 0.6);
  for (let i = 0; i < 8; i++) {
    g.rotate(Math.PI / 4);
    g.beginPath();
    g.moveTo(-r * 0.28, -r * 1.05);
    g.lineTo(0, -r * 1.6);
    g.lineTo(r * 0.28, -r * 1.05);
    g.closePath();
    contour(g, "#ffb000", "#6a3a00", 1);
  }
  g.restore();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  contour(g, "#ffd81a", "#6a3a00");
}

function nuage(g: CanvasRenderingContext2D, x: number, y: number, r: number, teinte = "#f4f6fa") {
  g.beginPath();
  g.arc(x - r * 0.75, y + r * 0.15, r * 0.62, Math.PI * 0.5, Math.PI * 1.5);
  g.arc(x - r * 0.2, y - r * 0.35, r * 0.72, Math.PI, Math.PI * 1.85);
  g.arc(x + r * 0.55, y - r * 0.05, r * 0.6, Math.PI * 1.3, Math.PI * 0.5);
  g.closePath();
  contour(g, teinte);
}

function icone(g: CanvasRenderingContext2D, i: IconeMeteo, x: number, y: number, t: number) {
  const r = 9;
  switch (i) {
    case "soleil":
      return soleil(g, x, y, r, t);
    case "eclaircies":
      soleil(g, x + 5, y - 5, r * 0.8, t);
      return nuage(g, x - 2, y + 3, r);
    case "nuages":
      nuage(g, x + 5, y - 4, r * 0.8, "#c9ced8");
      return nuage(g, x - 2, y + 2, r);
    case "pluie":
    case "neige":
    case "confettis": {
      const couleurs = ["#ff3b3b", "#ffd81a", "#3bd16f", "#3b8cff", "#ff5fd2"];
      for (let k = 0; k < 4; k++) {
        const px = x - 8 + k * 5;
        const ph = ((t * (i === "pluie" ? 18 : 9) + k * 5) % 12) + y + 6;
        if (i === "pluie") {
          g.strokeStyle = "#2f7bff";
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(px, ph);
          g.lineTo(px - 2, ph + 5);
          g.stroke();
        } else if (i === "neige") {
          g.fillStyle = "#fff";
          g.strokeStyle = "#5a6a86";
          g.lineWidth = 0.8;
          g.beginPath();
          g.arc(px, ph, 1.8, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        } else {
          g.fillStyle = couleurs[(k + Math.floor(t * 3)) % couleurs.length]!;
          g.fillRect(px - 1.5, ph, 3, 3);
        }
      }
      return nuage(g, x, y, r, i === "pluie" ? "#b9c0cc" : "#f4f6fa");
    }
    case "brouillard":
      for (let k = 0; k < 3; k++) {
        const dx = Math.sin(t * 1.3 + k) * 2;
        g.beginPath();
        g.roundRect(x - 11 + dx, y - 7 + k * 6, 22, 4, 2);
        contour(g, "#dfe3ea", "#4c5566", 1);
      }
      return;
    case "mousse": {
      // Chope ambrée à mousse débordante : l'indice de mousse national.
      g.beginPath();
      g.roundRect(x - 7, y - 4, 13, 14, 2);
      contour(g, "#e59a18", "#4a2a00");
      g.beginPath();
      g.arc(x + 9, y + 3, 4, -Math.PI / 2, Math.PI / 2);
      g.lineWidth = 2;
      g.strokeStyle = "#4a2a00";
      g.stroke();
      const gonfle = 1 + 0.12 * Math.sin(t * 2);
      g.beginPath();
      g.arc(x - 4, y - 5, 4 * gonfle, 0, Math.PI * 2);
      g.arc(x + 1, y - 7, 4.5 * gonfle, 0, Math.PI * 2);
      g.arc(x + 5, y - 5, 3.5 * gonfle, 0, Math.PI * 2);
      contour(g, "#fffbef", "#6a5a40", 1);
      return;
    }
    case "vent":
      return;
  }
}

function fleche(g: CanvasRenderingContext2D, x: number, y: number, dir: number, force: number, t: number) {
  g.save();
  g.translate(x, y);
  g.rotate((dir * Math.PI) / 180);
  const souffle = Math.sin(t * 4) * 1.5;
  g.beginPath();
  g.moveTo(-5, 12 + souffle);
  g.lineTo(-5, -4);
  g.lineTo(-10, -4);
  g.lineTo(0, -16 - souffle);
  g.lineTo(10, -4);
  g.lineTo(5, -4);
  g.lineTo(5, 12 + souffle);
  g.closePath();
  contour(g, "#f2f5ff", "#0b1f4a", 1.4);
  g.rotate((-dir * Math.PI) / 180);
  g.font = `bold 11px ${POLICE}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#0b1f4a";
  g.fillText(String(force), 0, 0);
  g.restore();
}

function pave(g: CanvasRenderingContext2D, x: number, y: number, temp: number) {
  const fond = temp <= 0 ? "#3b7bff" : temp < 10 ? "#39b6e0" : temp < 20 ? "#ffb000" : "#ff5a1f";
  const texte = `${temp}°`;
  g.font = `bold 15px ${POLICE}`;
  const w = Math.max(24, g.measureText(texte).width + 8);
  g.beginPath();
  g.rect(x - w / 2, y - 9, w, 18);
  contour(g, fond, "#101418", 1.5);
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 2.5;
  g.strokeStyle = "#101418";
  g.strokeText(texte, x, y + 1);
  g.fillText(texte, x, y + 1);
}

function etiquette(g: CanvasRenderingContext2D, texte: string, x: number, y: number, taille = 10, couleur = "#fff") {
  g.font = `bold ${taille}px ${POLICE}`;
  g.textAlign = "center";
  g.textBaseline = "top";
  g.lineWidth = 2.5;
  g.strokeStyle = "rgba(10,16,30,0.9)";
  g.strokeText(texte, x, y);
  g.fillStyle = couleur;
  g.fillText(texte, x, y);
}

/** Dessine le bulletin sur la carte (coordonnées 0–1 → pixels de la cassette). */
export function dessinerBulletin(g: CanvasRenderingContext2D, b: Bulletin, W: number, H: number, t: number) {
  g.save();
  for (const p of b.points) {
    const x = p.x * W;
    const y = p.y * H;
    if (p.vent) fleche(g, x, y, p.vent.dir, p.vent.force, t);
    else {
      if (!p.nom.startsWith("Mer") && !p.nom.startsWith("Baie") && !p.nom.startsWith("Côte") && !p.nom.startsWith("Monts")) {
        g.beginPath();
        g.arc(x, y, 2.2, 0, Math.PI * 2);
        contour(g, "#fff", "#101418", 1);
      }
      if (p.icone) icone(g, p.icone, x, y - 13, t);
      if (p.temp !== undefined) pave(g, x, p.icone ? y + 8 : y - 12, p.temp);
    }
    etiquette(g, p.nom.toUpperCase(), x, y + (p.temp !== undefined && p.icone ? 18 : p.vent ? 17 : 3), 9);
    if (p.texte) etiquette(g, p.texte.toUpperCase(), x, y + (p.vent ? 27 : 13), 10, "#ffe74a");
  }
  // Titre du bulletin : bandeau incliné façon années 90
  const titre = b.titre.toUpperCase();
  // Le titre s'arrête avant le logo de la chaîne (coin supérieur droit).
  let taille = 20;
  g.font = `italic bold ${taille}px ${POLICE}`;
  while (g.measureText(titre).width > W - 190 && taille > 12) g.font = `italic bold ${--taille}px ${POLICE}`;
  const w = g.measureText(titre).width + 26;
  g.save();
  g.translate(12, 14);
  g.transform(1, 0, -0.18, 1, 0, 0);
  g.fillStyle = "#0a2a8a";
  g.fillRect(6, 0, w, 27);
  g.fillStyle = "#ffd81a";
  g.fillRect(6, 27, w, 3);
  g.restore();
  g.textAlign = "left";
  g.textBaseline = "top";
  g.fillStyle = "#ffffff";
  g.fillText(titre, 26, 18);
  g.restore();
}
