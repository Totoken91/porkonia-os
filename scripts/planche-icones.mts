/** Planche de contrôle des icônes pixel (32 et 16 px, agrandies). Usage : npx tsx scripts/planche-icones.mts <dossier> [noms,séparés] */
import { iconGrid, gridPaths } from "../src/components/pixel.ts";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
const S = process.argv[2]!;
const noms = (process.argv[3] ?? "ordinateur,navigateur,tele,nappe,dossier,config,poubelle,texte,image,mail,carte,cadenas,executer").split(",");
const svg = (n: any, g: 32 | 16, px: number) => `<svg width="${px}" height="${px}" viewBox="0 0 ${g} ${g}" shape-rendering="crispEdges">${gridPaths(iconGrid(n, g)).map((p) => `<path d="${p.d}" fill="${p.color}"/>`).join("")}</svg>`;
const html = `<body style="margin:0;background:#2f5b4c;font:12px sans-serif;color:#fff"><div style="display:flex;flex-wrap:wrap;gap:18px;padding:14px">${noms
  .map((n) => `<div style="text-align:center;background:#2f5b4c">${svg(n, 32, 192)}<div style="display:flex;gap:10px;justify-content:center;align-items:end;margin-top:6px">${svg(n, 16, 96)}${svg(n, 32, 32)}${svg(n, 16, 16)}<span style="background:#efe6d2;padding:3px">${svg(n, 16, 16)}</span></div>${n}</div>`)
  .join("")}</div></body>`;
writeFileSync(`${S}/planche.html`, html);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 400 } });
await p.goto(`file://${S}/planche.html`);
await p.screenshot({ path: `${S}/planche.png`, fullPage: true });
await b.close();
