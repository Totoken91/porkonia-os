/**
 * Régressions L’Ordre Cochon : installation, commandes rapides, collisions, ivresse,
 * inventaire et redémarrage de partie, sur bureau et Poche paysage / portrait.
 * Usage : npm run build && npm run test:e2e:ordre-cochon (SHOTS facultatif).
 */
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve("out");
const SHOTS = process.env.SHOTS;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain", ".ico": "image/x-icon", ".mp3": "audio/mpeg" };

const server = createServer(async (req, res) => {
  let p = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try {
    if ((await stat(p)).isDirectory()) p = join(p, "index.html");
    // Requêtes partielles, comme sur l'hébergement réel : sans elles, un lecteur audio ne peut pas se positionner.
    const buf = await readFile(p);
    const type = TYPES[extname(p)] ?? "application/octet-stream";
    const r = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (r) {
      const a = r[1] ? Number(r[1]) : 0;
      const b = r[2] ? Number(r[2]) : buf.length - 1;
      res.writeHead(206, { "content-type": type, "accept-ranges": "bytes", "content-range": `bytes ${a}-${b}/${buf.length}` });
      res.end(buf.subarray(a, b + 1));
    } else {
      res.writeHead(200, { "content-type": type, "accept-ranges": "bytes" });
      res.end(buf);
    }
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
  // Bureau (moniteur d'État), puis téléphone en paysage et en portrait (PorkOS Poche, au doigt).
  const formats = [
    { tag: "bureau", viewport: { width: 1366, height: 800 } },
    { tag: "poche-paysage", viewport: { width: 844, height: 390 }, mobile: true },
    { tag: "poche-portrait", viewport: { width: 390, height: 844 }, mobile: true },
  ];
  for (const { tag, viewport, mobile } of formats) {
    const poche = !!mobile;
    const ctx = await browser.newContext({ viewport, ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
    if (process.env.HTTPS_PROXY)
      await ctx.route("https://porkopedia.totoken.chatgpt.site/**", async (route) => {
        const body = await relay(route.request().url());
        return body ? route.fulfill({ body, contentType: /\.png$/i.test(route.request().url()) ? "image/png" : "image/jpeg" }) : route.abort();
      });
    // Journal des lectures audio (la voix off et la musique de Channel Pork doivent vraiment partir).
    await ctx.addInitScript(() => {
      window.__lectures = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        window.__lectures.push(this.src);
        return play.call(this).catch(() => undefined);
      };
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(`${tag}: ${m.text()}`));

    // Les pubs de PorkOS arrivent à heure aléatoire : hors de l'étape qui les teste, on les ferme dès qu'elles gênent.
    // La première est examinée au passage (croix d'abord inactive, capture) pour l'étape « pause publicitaire ».
    let pubVue = null;
    await page.addLocatorHandler(page.getByTestId("ad"), async () => {
      if (!pubVue) {
        pubVue = { fermableTout2Suite: !(await page.getByTestId("ad-close").isDisabled()) };
        await page.waitForTimeout(1200);
        await shot(page, `${tag}-11-pub`);
      }
      await page.getByTestId("ad-close").click({ timeout: 15000 });
    });
    // Idem pour les bulles de notification (distinctions, rappels) qui recouvrent le coin de l'écran.
    // Les bulles se succèdent (courriers, distinctions, rappels) et recouvrent le coin de l'écran : dans ce parcours,
    // elles laissent passer les clics (les fermer au passage refermerait aussi les menus ouverts).
    await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style");
      st.textContent = ".bulles, .bulles *, .gruik, .gruik * { pointer-events: none !important; }";
      document.head.appendChild(st);
    }));
    await page.goto(base);
    // La machine attend qu'on l'allume (ce clic libère aussi le son).
    await page.waitForTimeout(400);
    if (await page.getByTestId("boot-bios").count()) throw new Error("la machine s'allume toute seule");
    await shot(page, `${tag}-00-eteint`);
    await page.getByTestId("power").click();
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
    // Gruik, l'assistant, salue peu après la connexion.
    await page.getByTestId("gruik-bulle").waitFor({ timeout: 8000 });
    if (!(await page.getByTestId("gruik-bulle").textContent()).includes("Gruik")) throw new Error("Gruik ne se présente pas");
    await shot(page, `${tag}-05-gruik`);
    step(`${tag} : Gruik, l'assistant, salue`);

    if (tag === "bureau") {
      // Plein écran : le bouton de la façade bascule la page entière, puis la rend.
      await page.getByTestId("plein-ecran").click();
      await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { timeout: 4000 });
      await page.locator("[data-testid=plein-ecran][aria-pressed=true]").waitFor();
      await page.getByTestId("plein-ecran").click();
      await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 4000 });
      step(`${tag} : plein écran (aller-retour)`);
    }

    /** Ouvre le menu Démarrer puis clique `cible` ; si une pub surprise a refermé le menu entre-temps, on recommence. */
    const viaDemarrer = async (cible) => {
      for (let essai = 0; ; essai++) {
        await page.getByTestId("start").click();
        try {
          await cible().click({ timeout: 5000 });
          return;
        } catch (e) {
          if (essai >= 2) throw e;
        }
      }
    };
    // Sur le bureau, double clic sur l'icône ; sur le Poche, retour à l'accueil puis un appui sur la tuile du lanceur.
    const open = async (id) => {
      if (!poche) return page.getByTestId(`icon-${id}`).dblclick();
      await page.getByTestId("afficher-bureau").click();
      await page.getByTestId(`icon-${id}`).tap();
    };
    const closeTop = () => page.locator(".pk-window.focused [data-testid=window-close]").click();
    // Croix du Poche : on appuie près de la flèche (le centre géométrique de chaque pétale est le bouton Accueil).
    const croix = async (sens) => {
      const { width: w, height: h } = await page.locator(".croix").boundingBox();
      const pos = { haut: { x: w / 2, y: 6 }, bas: { x: w / 2, y: h - 6 }, gauche: { x: 6, y: h / 2 }, droite: { x: w - 6, y: h / 2 } }[sens];
      await page.getByTestId(`croix-${sens}`).click({ position: pos });
    };

    const fermer = (app) => page.locator(`[data-testid=window-${app}]:visible [data-testid=window-close]`).first().click();
      // Partagiciel : téléchargement sur PigNet, assistant d'installation, lancement du jeu.
      await open("d-nav");
      await page.getByTestId("nav-url").fill("porko://grenier-partagiciels");
      await page.getByTestId("nav-url").press("Enter");
      await page.getByTestId("telecharger-jambonjon").click();
      await page.getByTestId("dl-enregistrer").click();
      await page.getByTestId("dl-enregistrer-ici").click();
      await page.getByTestId("dl-ouvrir-fichier").waitFor({ timeout: 60000 });
      await shot(page, `${tag}-25-telechargement`);
      await page.getByTestId("dl-ouvrir-fichier").click();
      await page.getByTestId("installeur").waitFor();
      await page.getByTestId("inst-suivant").click();
      if (!(await page.getByTestId("inst-suivant").isDisabled())) throw new Error("licence non acceptée mais Suivant actif");
      await page.getByTestId("inst-accepte").check();
      for (let k = 0; k < 5; k++) await page.getByTestId("inst-suivant").click();
      await page.getByTestId("inst-fin").waitFor({ timeout: 20000 });
      await page.getByTestId("inst-suivant").click();
      await page.getByTestId("window-jambonjon").waitFor();
      await page.getByTestId("jbj-nouvelle").click();
      await page.getByTestId("jbj-vue").waitFor();

    // Salle de test : la caméra et les collisions doivent suivre exactement les commandes.
    await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem("porkos.jambonjon.partie"));
      const w = 9;
      p.carte = { w, h: w, cases: Array.from({length:w*w}, (_,i) => i%w===0 || i%w===w-1 || i<w || i>=w*(w-1) ? 1 : 0), vu: Array(w*w).fill(true), decor: Array(w*w).fill(0) };
      p.monstres=[]; p.sol=[]; p.joueur.x=4; p.joueur.y=6; p.joueur.dir=0; p.joueur.ivresse=100; p.fin=null;
      localStorage.setItem("porkos.jambonjon.partie",JSON.stringify(p));
    });
    await fermer("jambonjon");
    await fermer("navigateur");
    await open("f:L’Ordre Cochon");
    await page.getByTestId("jbj-continuer").click();
    const position = () => page.evaluate(() => { const j=JSON.parse(localStorage.getItem("porkos.jambonjon.partie")).joueur; return [j.x,j.y,j.dir]; });
    for (let n=0;n<7;n++) await page.keyboard.press("z");
    await page.waitForTimeout(1600);
    if (JSON.stringify(await position())!=="[4,1,0]") throw new Error(`${tag}: mur invisible ou déplacement dévié : ${await position()}`);
    for (const k of ["s","s","e","z","a","z"]) await page.keyboard.press(k);
    await page.waitForTimeout(1600);
    if (JSON.stringify(await position())!=="[5,2,0]") throw new Error(`${tag}: commandes mélangées : ${await position()}`);
    const avant = await position();
    await page.keyboard.press("i");
    await page.getByTestId("jbj-sac").waitFor();
    await page.keyboard.press("z");
    await page.waitForTimeout(300);
    if (JSON.stringify(await position())!==JSON.stringify(avant)) throw new Error(`${tag}: marche pendant l’inventaire`);
    await page.keyboard.press("Escape");
    await page.keyboard.press("e");
    await page.keyboard.press("z");
    await page.keyboard.press("F2");
    await page.waitForTimeout(600);
    const debut = await position();
    await page.waitForTimeout(500);
    if (JSON.stringify(await position())!==JSON.stringify(debut)) throw new Error(`${tag}: une ancienne commande survit à Nouvelle partie`);
    await shot(page, `${tag}-ordre-cochon`);
    step(`${tag}: déplacements rapides, rotations, murs, ivresse, inventaire et nouvelle partie validés`);
    await ctx.close();
  }
  if(errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
  server.close();
}
