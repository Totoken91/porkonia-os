/**
 * Aperçu autonome : un seul fichier HTML (JS, CSS et emblème intégrés) pour montrer PorkOS
 * dans un bac à sable qui n'accepte pas plusieurs fichiers. Prérequis : `npm run build` (pour le CSS).
 * Sortie : apercu/porkos-98.html. Les images de Porkopédia restent des liens d'origine.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";

mkdirSync("apercu", { recursive: true });
execFileSync("npx", ["esbuild", "scripts/apercu/entry.tsx", "--bundle", "--minify", "--format=iife", "--jsx=automatic", "--alias:@=./src", '--define:process.env.NODE_ENV="production"', "--outfile=apercu/app.js", "--log-level=warning"], { stdio: "inherit" });

const cssFiles = readdirSync("out/_next/static").flatMap((d) => {
  const p = `out/_next/static/${d}`;
  return statSync(p).isDirectory() ? readdirSync(p).filter((f) => f.endsWith(".css")).map((f) => `${p}/${f}`) : [];
});
let css = cssFiles.map((f) => readFileSync(f, "utf8")).join("\n").replace(/@font-face\{[^}]*\}/g, "");
let js = readFileSync("apercu/app.js", "utf8");
for (const n of [64, 128, 256]) {
  const uri = `data:image/png;base64,${readFileSync(`public/brand/embleme-${n}.png`).toString("base64")}`;
  js = js.split(`/brand/embleme-${n}.png`).join(uri);
  css = css.split(`/brand/embleme-${n}.png`).join(uri);
}
js = js.replace(/<\/script/gi, "<\\/script");
writeFileSync(
  "apercu/porkos-98.html",
  `<title>PorkOS 98</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=VT323&display=swap">
<style>
:root{--font-terminal:"VT323";color-scheme:dark}
html,body{background:#14110e}
${css}
</style>
<div id="porkos"></div>
<script>${js}</script>
`,
);
console.log("apercu/porkos-98.html prêt");
