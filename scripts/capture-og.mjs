// Carte de partage : après « npm run build », « node scripts/capture-og.mjs public/og.png », puis conversion en public/og.jpg.
// Scène sans image de Porkopédia (télétexte et PorkAmp) : rien du wiki n'est copié dans le dépôt.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
const ROOT = resolve("out");
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".mp3": "audio/mpeg", ".wav": "audio/wav" };
const server = createServer(async (req, res) => { let p = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)); try { if ((await stat(p)).isDirectory()) p = join(p, "index.html"); const buf = await readFile(p); res.writeHead(200, { "content-type": T[extname(p)] ?? "application/octet-stream" }); res.end(buf); } catch { res.writeHead(404).end(); } }).listen(0);
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await b.newPage({ viewport: { width: 1200, height: 630 } });
await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = "[data-testid=ad],[data-testid=toast],[data-testid=dialog]{display:none!important}"; document.head.appendChild(st); }));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.getByTestId("power").click(); await page.getByTestId("boot-bios").waitFor(); await page.keyboard.press("Space");
await page.getByTestId("login-password").fill("12"); await page.getByTestId("login-submit").click();
await page.getByTestId("window-bienvenue").waitFor(); await page.locator("[data-testid=window-bienvenue] [data-testid=window-close]").click();
await page.getByTestId("icon-d-porkamp").dblclick(); await page.getByTestId("window-porkamp").waitFor();
await page.getByTestId("amp-lecture").click();
await page.getByTestId("icon-d-tv").dblclick(); await page.getByTestId("tv-screen").waitFor();
await page.getByTestId("tv-txt").click(); await page.locator(".ttx-lien").first().click();
await page.locator(".ttx-titre", { hasText: "PROGRAMMES" }).waitFor();
const ecran = await page.locator(".ecran").boundingBox();
const k = ecran.width / 800;
const placer = async (fenetre, poignee, X, Y) => {
  const w = await page.locator(fenetre).boundingBox();
  const h = await page.locator(poignee).boundingBox();
  const px = h.x + 40, py = h.y + h.height / 2;
  await page.mouse.move(px, py); await page.mouse.down();
  await page.mouse.move(px + (ecran.x + X * k - w.x), py + (ecran.y + Y * k - w.y), { steps: 8 }); await page.mouse.up();
};
await placer("[data-testid=window-channel-pork]", ".tuner-titre", 92, 8);
await page.locator(".taskbar button, [data-testid^=task]", { hasText: "PorkAmp" }).first().click();
await page.waitForTimeout(400);
await placer("[data-testid=window-porkamp]", ".amp-pied", 468, 262);
await page.waitForTimeout(3500);
await page.waitForTimeout(800);
await page.screenshot({ path: process.argv[2] });
await b.close(); server.close();
