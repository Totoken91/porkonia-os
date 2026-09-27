/**
 * Parcours de bout en bout sur l'export statique (out/) : démarrage → connexion → bureau → applis → mise à jour.
 * Usage : npm run build && npm run test:e2e   (captures dans $SHOTS si défini)
 */
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve("out");
const SHOTS = process.env.SHOTS;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain", ".ico": "image/x-icon" };

const server = createServer(async (req, res) => {
  let p = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try {
    if ((await stat(p)).isDirectory()) p = join(p, "index.html");
    res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
    res.end(await readFile(p));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

const errors = [];
const browser = await chromium.launch();

/**
 * Environnement à proxy sortant (conteneur) : Chromium n'y accède pas directement à Porkopédia.
 * Les images sont alors relayées par curl, qui connaît le proxy. Tests uniquement ; l'appli, elle, lie les images d'origine.
 */
const cache = new Map();
const relay = (url) => {
  if (!cache.has(url))
    cache.set(url, new Promise((ok) => execFile("curl", ["-sSfL", "--max-time", "20", url], { encoding: "buffer", maxBuffer: 1 << 26 }, (err, out) => ok(err ? null : out))));
  return cache.get(url);
};
const shot = async (page, name) => SHOTS && page.screenshot({ path: join(SHOTS, `${name}.png`) });
const step = (m) => console.log("✓", m);

try {
  for (const viewport of [{ width: 1366, height: 800 }, { width: 844, height: 390 }]) {
    const tag = viewport.height < 500 ? "mobile" : "bureau";
    const ctx = await browser.newContext({ viewport });
    if (process.env.HTTPS_PROXY)
      await ctx.route("https://porkopedia.totoken.chatgpt.site/**", async (route) => {
        const body = await relay(route.request().url());
        return body ? route.fulfill({ body, contentType: /\.png$/i.test(route.request().url()) ? "image/png" : "image/jpeg" }) : route.abort();
      });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(`${tag}: ${m.text()}`));

    await page.goto(base);
    await page.getByTestId("boot-bios").waitFor();
    if (tag === "bureau") {
      await page.waitForTimeout(2500);
      await shot(page, `${tag}-01-bios`);
      await page.getByTestId("boot-chargement").waitFor({ timeout: 8000 });
      await shot(page, `${tag}-02-chargement`);
    }
    await page.keyboard.press("Space");
    await page.getByTestId("login").waitFor();
    step(`${tag} : démarrage passé`);

    await page.getByTestId("login-submit").click();
    await page.getByTestId("login-message").waitFor();
    if (!(await page.getByTestId("login-message").textContent()).includes("silence")) throw new Error("mot de passe vide accepté");
    await page.getByTestId("login-password").fill("12");
    await page.getByTestId("login-submit").click();
    await page.getByText("patriotique").waitFor();
    await shot(page, `${tag}-03-connexion`);
    await page.getByTestId("start").waitFor({ timeout: 6000 });
    await page.getByTestId("window-bienvenue").waitFor();
    await page.waitForTimeout(800);
    await shot(page, `${tag}-04-bienvenue`);
    await page.locator("[data-testid=window-bienvenue] [data-testid=window-close]").click();
    await shot(page, `${tag}-04-bureau`);
    step(`${tag} : connexion et bureau`);

    const open = async (id) => (tag === "mobile" ? page.getByTestId(`icon-${id}`).tap?.() ?? page.getByTestId(`icon-${id}`).click() : page.getByTestId(`icon-${id}`).dblclick());
    const closeTop = () => page.locator(".pk-window.focused [data-testid=window-close]").click();

    // Navigateur → notice Douzi → lien interne
    await page.getByTestId("icon-d-nav").dblclick();
    await page.getByTestId("window-navigateur").waitFor();
    await page.getByTestId("nav-url").fill("porko://porkopedia/douzi");
    await page.getByTestId("nav-url").press("Enter");
    await page.locator(".notice h1", { hasText: "Sofiane Douzi" }).waitFor();
    await shot(page, `${tag}-05-pignet`);
    await page.getByTestId("nav-url").fill("https://google.com");
    await page.getByTestId("nav-url").press("Enter");
    await page.getByRole("heading", { name: "Internet étranger" }).waitFor();
    step(`${tag} : PigNet (notice, internet étranger)`);
    await closeTop();

    // Channel Pork
    await page.getByTestId("icon-d-tv").dblclick();
    await page.getByTestId("tv-screen").waitFor();
    await page.waitForTimeout(1500);
    await shot(page, `${tag}-06-channel-pork`);
    step(`${tag} : Channel Pork`);
    await closeTop();

    // Nappe Vide : premier service toujours sûr
    await page.getByTestId("icon-d-nappe").dblclick();
    await page.getByTestId("nappe-grille").waitFor();
    await page.locator(".nv").nth(40).click();
    if ((await page.locator(".nv.ouverte").count()) < 1) throw new Error("aucune case servie");
    await shot(page, `${tag}-07-nappe-vide`);
    step(`${tag} : Nappe Vide`);
    await closeTop();

    // Configuration : luminosité du Fondateur, puis mise à jour manuelle
    await page.getByTestId("icon-d-config").dblclick();
    await page.getByTestId("dialog").waitFor(); // dialogue de bienvenue
    await page.locator("[data-testid=dialog] .pk-btn").first().click();
    await page.getByTestId("config-luminosite").fill("40");
    await page.getByText("Erreur 1212", { exact: false }).waitFor();
    await shot(page, `${tag}-08-config-erreur`);
    await page.locator("[data-testid=dialog] .pk-btn").first().click();
    await page.getByRole("tab", { name: "Système" }).click();
    await page.getByTestId("config-maj").click();
    await page.getByTestId("update").waitFor();
    await page.waitForTimeout(2000);
    await shot(page, `${tag}-09-mise-a-jour`);
    await page.getByTestId("update-done").waitFor({ timeout: 10000 });
    await page.getByTestId("update-done").click();
    step(`${tag} : configuration et mise à jour obligatoire`);

    // Menu « Au programme » → arrêt → veille patriotique
    await page.getByTestId("start").click();
    await page.getByTestId("programme").waitFor();
    await page.getByTestId("menu-programmes").hover();
    await shot(page, `${tag}-10-programme`);
    await page.getByRole("button", { name: "Arrêter…" }).click();
    await page.getByRole("button", { name: "Veille patriotique" }).click();
    await page.getByTestId("veille").waitFor();
    await page.getByTestId("veille").click();
    await page.getByTestId("start").waitFor();
    step(`${tag} : veille patriotique`);

    if (tag === "bureau") {
      // La pause publicitaire arrive d'elle-même (~30 s après la connexion) ; sa croix se mérite.
      await page.getByTestId("ad").waitFor({ timeout: 90000 });
      if (!(await page.getByTestId("ad-close").isDisabled())) throw new Error("pub fermable immédiatement");
      await page.waitForTimeout(1200);
      await shot(page, `${tag}-11-pub`);
      await page.getByTestId("ad-close").click({ timeout: 10000 });
      await page.getByTestId("ad").waitFor({ state: "detached" });
      step(`${tag} : pause publicitaire`);
    }

    // Icônes : glisser vers une autre case de la grille, menu contextuel du bureau
    const icone = page.getByTestId("icon-d-tv");
    const avant = await icone.boundingBox();
    await icone.hover();
    await page.mouse.down();
    await page.mouse.move(avant.x + avant.width / 2 + 260, avant.y + avant.height / 2 + 40, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const apres = await icone.boundingBox();
    if (Math.abs(apres.x - avant.x) < 100) throw new Error("l'icône n'a pas bougé");
    const left = await icone.evaluate((el) => parseFloat(el.style.left));
    if ((left - 4 - 1) % 76 !== 0) throw new Error(`icône hors grille (left=${left})`);
    const zoneBox = await page.locator(".bureau-zone").boundingBox();
    await page.locator(".bureau-zone").click({ button: "right", position: { x: zoneBox.width * 0.75, y: zoneBox.height * 0.5 } });
    await page.getByTestId("menu-contexte").waitFor();
    await shot(page, `${tag}-12-menu-contexte`);
    await page.getByRole("menuitem", { name: "Réorganiser les icônes" }).click();
    step(`${tag} : icônes sur grille, glisser-déposer, clic droit`);

    // Exécuter…
    await page.getByTestId("start").click();
    await page.getByTestId("menu-executer").click();
    await page.getByTestId("executer-champ").fill("nappe");
    await page.getByTestId("executer-champ").press("Enter");
    await page.getByTestId("window-nappe-vide").waitFor();
    await closeTop();
    step(`${tag} : Exécuter…`);

    if (tag === "bureau") {
      // Arrêt brutal (rechargement) : ScanDisque au démarrage suivant
      await page.reload();
      await page.getByTestId("boot-scandisk").waitFor();
      await page.waitForTimeout(2500);
      await shot(page, `${tag}-13-scandisk`);
      await page.keyboard.press("Escape");
      await page.getByTestId("login-password").fill("douzi");
      await page.getByTestId("login-submit").click();
      await page.getByTestId("start").waitFor({ timeout: 8000 });
      step(`${tag} : ScanDisque après arrêt brutal`);
    }

    // Arrêt propre → « vous pouvez éteindre » → bouton d'alimentation → rallumage
    await page.getByTestId("start").click();
    await page.getByRole("button", { name: "Arrêter…" }).click();
    await page.getByRole("button", { name: "Arrêter", exact: true }).click();
    await page.getByTestId("fermeture").waitFor();
    await page.getByTestId("securite").waitFor({ timeout: 8000 });
    await shot(page, `${tag}-14-securite`);
    await page.getByTestId("power").click();
    await page.waitForTimeout(1200);
    await shot(page, `${tag}-15-eteint`);
    await page.getByTestId("power").click();
    await page.getByTestId("boot-bios").waitFor({ timeout: 5000 });
    step(`${tag} : arrêt, extinction et rallumage`);
    await ctx.close();
  }
  if (errors.length) throw new Error("Erreurs navigateur :\n" + errors.join("\n"));
  console.log("Parcours complet : OK");
} finally {
  await browser.close();
  server.close();
}
