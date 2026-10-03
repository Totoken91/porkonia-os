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
      st.textContent = ".bulles, .bulles * { pointer-events: none !important; }";
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

    // Navigateur → notice Douzi → lien interne
    await open("d-nav");
    await page.getByTestId("window-navigateur").waitFor();
    // Portail : une du jour, sondage (le vote est compté, ceux des voisins aussi), rubrique → index
    await page.getByTestId("portail-une").waitFor();
    await page.getByTestId("portail-voter").click();
    await page.getByTestId("portail-resultats").waitFor();
    await page.locator("[data-testid=portail-compteur] .chiffres i").first().waitFor();
    await page.locator(".portail .rubriques .lien").first().click();
    await page.locator(".notice.index h1").waitFor();
    await page.getByTestId("nav-url").fill("porko://porkopedia/douzi");
    await page.getByTestId("nav-url").press("Enter");
    await page.locator(".notice h1", { hasText: "Sofiane Douzi" }).waitFor();
    await shot(page, `${tag}-05-pignet`);
    await page.getByTestId("nav-url").fill("https://google.com");
    await page.getByTestId("nav-url").press("Enter");
    await page.getByRole("heading", { name: "Internet étranger" }).waitFor();
    // Barre de menus : Favoris › Le Grand Banquet, puis ? › À propos
    await page.locator("[data-testid=window-navigateur] [data-testid=menubar-v]").click();
    if (tag === "bureau") await shot(page, `${tag}-05b-menus`);
    await page.getByRole("menuitem", { name: "Le Grand Banquet" }).click();
    await page.locator(".notice h1", { hasText: "Le Grand Banquet" }).waitFor();
    await page.locator("[data-testid=window-navigateur] [data-testid='menubar-?']").click();
    await page.getByRole("menuitem", { name: /propos de PigNet/ }).click();
    await page.getByTestId("dialog").waitFor();
    await page.locator("[data-testid=dialog] .pk-btn").first().click();
    // Raccourci clavier : Alt+← revient à la page précédente
    await page.keyboard.press("Alt+ArrowLeft");
    await page.getByRole("heading", { name: "Internet étranger" }).waitFor();
    step(`${tag} : PigNet (notice, internet étranger, menus, raccourcis)`);
    await closeTop();

    // Channel Pork
    await open("d-tv");
    await page.getByTestId("tv-screen").waitFor();
    // Direct : on tombe en cours d'émission ; musique tout de suite, une voix off dans les secondes qui suivent
    // (ou la bande complète du jeu télévisé).
    await page.waitForFunction(() => /channel-pork\/(ftg-ep\d|pub-brasswagen|pub-judas|eric-saucissignal|reportage-fatbass|pub-repulsif|pub-mangez-gras|dossiers-alvarez|fred-sans-mentir|cauchemar-taverne|allo-stephane|initial-p-ep\d)\.mp3/.test(window.__lectures.join(" ")) || /(quiet-morning-vhs|brume-nappe)\.mp3/.test(window.__lectures.join(" ")) && /channel-pork\/[a-z-]+-\d\.mp3/.test(window.__lectures.join(" ")), null, { timeout: 12000 }).catch(async () => {
      throw new Error(`Channel Pork muet : ${await page.evaluate(() => window.__lectures.join(" "))}`);
    });
    await page.waitForTimeout(600);
    await shot(page, `${tag}-06-channel-pork`);
    const avantZap = await page.evaluate(() => window.__lectures.length);
    await page.getByTestId("tv-zapper").click();
    await page.locator(".tv-numero", { hasText: "02" }).waitFor();
    // Après le zapping, une voix de la nouvelle chaîne doit partir (régression : seules celles de Canal 1 jouaient).
    await page.waitForFunction((n) => window.__lectures.slice(n).some((s) => /channel-pork\/(?!quiet|brume-nappe)[a-z0-9-]+\.mp3/.test(s)), avantZap, { timeout: 15000 }).catch(async () => {
      throw new Error(`Aucune voix après le zapping : ${await page.evaluate((n) => window.__lectures.slice(n).join(" "), avantZap)}`);
    });
    // Attente image par image : le navigateur sans écran ne produit sinon pas toujours de nouvelles images.
    await page.waitForFunction((t0) => performance.now() - t0 > 1500, await page.evaluate(() => performance.now()), { polling: "raf" });
    await shot(page, `${tag}-06b-channel-pork-zap`);
    step(`${tag} : Channel Pork (direct, musique, voix off, zapping)`);
    // Plein écran : l'image seule couvre tout l'appareil ; la télécommande zappe ; on en sort.
    await page.getByTestId("tv-plein-ecran").click();
    await page.locator(".tuner-image.plein").waitFor();
    await page.waitForFunction(() => {
      const r = document.querySelector(".tuner-image.plein").getBoundingClientRect();
      return r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1;
    });
    await page.getByTestId("tv-image").click({ position: { x: 20, y: 20 } });
    await page.getByTestId("tv-plein-zapper").click();
    await page.locator(".tv-numero", { hasText: "03" }).waitFor();
    await shot(page, `${tag}-06d-tv-plein-ecran`);
    await page.getByTestId("tv-plein-sortir").click();
    await page.locator(".tuner-image.plein").waitFor({ state: "detached" });
    step(`${tag} : PorkTV en plein écran (télécommande, sortie)`);
    // PorkTexte : sommaire, lien vers les programmes, page absente, retour à l'image
    await page.getByTestId("tv-txt").click();
    await page.locator(".ttx-titre", { hasText: "SOMMAIRE" }).waitFor();
    await page.getByTestId("tv-teletexte").locator(".ttx-lien").first().click();
    await page.locator(".ttx-titre", { hasText: "PROGRAMMES" }).waitFor();
    await page.getByTestId("tv-teletexte").getByText("EN COURS").first().waitFor();
    if (tag === "bureau") {
      await page.waitForTimeout(400);
      await shot(page, `${tag}-06c-teletexte`);
      for (const k of "123") await page.keyboard.press(k);
      await page.getByTestId("tv-teletexte").getByText("Page non diffusée.").waitFor({ timeout: 4000 });
    }
    await page.getByTestId("tv-txt").click();
    await page.getByTestId("tv-teletexte").waitFor({ state: "detached" });
    step(`${tag} : PorkTexte (sommaire, programmes, page absente)`);
    // Magnétoscope : la vidéothèque lance n'importe quelle émission depuis son début ; zapper revient au direct.
    await page.getByTestId("tv-k7").click();
    await page.getByTestId("tv-videotheque").waitFor();
    if (tag === "bureau" || tag === "poche-portrait") await shot(page, `${tag}-11b-videotheque`);
    await page.getByTestId("vtq-ftg-2").click();
    await page.getByTestId("tv-videotheque").waitFor({ state: "detached" });
    await page.locator(".tuner-lcd-chaine", { hasText: "MAGNÉTOSCOPE" }).waitFor();
    await page.waitForFunction(() => /ftg-ep2\.mp3/.test(window.__lectures.join(" ")), null, { timeout: 8000 }).catch(() => {});
    await page.getByTestId("tv-zapper").click();
    await page.locator(".tuner-lcd-chaine", { hasText: "MAGNÉTOSCOPE" }).waitFor({ state: "detached" });
    step(`${tag} : magnétoscope (vidéothèque, lecture à la demande, retour au direct)`);
    await closeTop();

    // Nappe Vide : premier service toujours sûr
    await open("d-nappe");
    await page.getByTestId("nappe-grille").waitFor();
    await page.locator(".nv").nth(40).click();
    if ((await page.locator(".nv.ouverte").count()) < 1) throw new Error("aucune case servie");
    await shot(page, `${tag}-07-nappe-vide`);
    step(`${tag} : Nappe Vide`);
    await closeTop();

    // Configuration : luminosité du Fondateur, puis mise à jour manuelle
    await open("d-config");
    await page.getByTestId("dialog").waitFor(); // dialogue de bienvenue
    await page.locator("[data-testid=dialog] .pk-btn").first().click();
    await page.getByTestId("config-luminosite").fill("40");
    await page.getByText("Erreur 1212", { exact: false }).waitFor();
    await shot(page, `${tag}-08-config-erreur`);
    await page.locator("[data-testid=dialog] .pk-btn").first().click();
    // Fond d'écran en image (Images d'État) : le bureau le prend aussitôt.
    await page.getByTestId("fond-lac").click();
    await page.waitForFunction(() => /\/fonds\/lac\.jpg/.test(document.querySelector(".fond.fond-image")?.getAttribute("style") ?? ""), null, { timeout: 4000 });
    step(`${tag} : fond d'écran en image`);
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
      for (let t = 0; !pubVue; t += 500) {
        if (t > 160000) throw new Error("aucune pause publicitaire");
        await page.waitForTimeout(500);
        if (await page.getByTestId("ad").count()) await page.getByTestId("start").hover().catch(() => {});
        // Un utilisateur qui attend bouge la souris : l'économiseur (qui suspend les pubs) ne se lance pas.
        else if (t % 10000 === 0) await page.mouse.move(400 + (t % 20000 ? 7 : 0), 300);
      }
      if (pubVue.fermableTout2Suite) throw new Error("pub fermable immédiatement");
      await page.getByTestId("ad").waitFor({ state: "detached" });
      step(`${tag} : pause publicitaire`);
    }

    if (!poche) {
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
    } else {
      // Poche : lanceur au doigt, bouton Retour (programme précédent), Accueil, panneau des programmes ouverts.
      await open("d-docs");
      await page.getByTestId("window-fichiers").waitFor();
      await open("d-mail");
      await page.getByTestId("window-mail").waitFor();
      await page.getByTestId("retour").click();
      await page.locator(".pk-window.focused[data-testid=window-fichiers]").waitFor();
      await page.getByTestId("afficher-bureau").click();
      await page.getByTestId("window-fichiers").waitFor({ state: "hidden" });
      await page.getByTestId("taches-bouton").click();
      await page.getByTestId("taches").waitFor();
      await shot(page, `${tag}-12-taches`);
      await page.locator("[data-testid=taches] .tache", { hasText: "Courrier" }).click();
      await page.getByTestId("window-mail").waitFor();
      // Croix directionnelle : gauche bascule entre les deux derniers programmes, droite tourne vers le plus ancien.
      await croix("gauche");
      await page.locator(".pk-window.focused[data-testid=window-fichiers]").waitFor();
      await croix("gauche");
      await page.locator(".pk-window.focused[data-testid=window-mail]").waitFor();
      await croix("droite");
      await page.waitForFunction(() => !document.querySelector(".pk-window.focused[data-testid=window-mail]"));
      await page.getByTestId("taches-bouton").click();
      await page.getByRole("button", { name: "Tout fermer" }).click();
      await page.getByTestId("window-mail").waitFor({ state: "detached" });
      // Bas de la croix : fait défiler le lanceur quand il déborde ; bouton Courrier de la façade.
      const lanceur = page.locator(".lanceur");
      if (await lanceur.evaluate((el) => el.scrollHeight > el.clientHeight + 4)) {
        await croix("bas");
        await page.waitForFunction(() => document.querySelector(".lanceur").scrollTop > 20);
        await croix("haut");
      }
      await page.getByTestId("raccourci-courrier").click();
      await page.getByTestId("window-mail").waitFor();
      await shot(page, `${tag}-12b-facade`);
      await closeTop();
      step(`${tag} : lanceur, Retour, Accueil, croix et programmes ouverts`);
    }

    // Exécuter…
    await viaDemarrer(() => page.getByTestId("menu-executer"));
    await page.getByTestId("executer-champ").fill("nappe");
    await page.getByTestId("executer-champ").press("Enter");
    await page.getByTestId("window-nappe-vide").waitFor();
    await closeTop();
    step(`${tag} : Exécuter…`);

    // Exécuter « format c: » : écran d'exception fatale, une touche pour revenir
    await viaDemarrer(() => page.getByTestId("menu-executer"));
    await page.getByTestId("executer-champ").fill("format c:");
    await page.getByTestId("executer-champ").press("Enter");
    await page.getByTestId("fatal").waitFor();
    if (tag === "bureau") await shot(page, `${tag}-17-fatal`);
    // L'écran ignore les touches pendant sa première demi-seconde : on insiste tant qu'il est là.
    for (let k = 0; k < 10 && (await page.getByTestId("fatal").count()); k++) {
      await page.waitForTimeout(600);
      await page.keyboard.press("Space");
    }
    await page.getByTestId("fatal").waitFor({ state: "detached" });
    step(`${tag} : exception fatale`);

    // Curseur : jamais le curseur de texte sur l'interface (régression)
    if (!poche) {
      const curseur = await page.locator(".tb-start").evaluate((el) => getComputedStyle(el).cursor);
      if (!curseur.startsWith("url(")) throw new Error(`curseur d'interface invalide : ${curseur}`);
    }

    // Courrier d'État : lire un message, répondre, retrouver l'envoi
    await open("d-mail");
    await page.getByTestId("window-mail").waitFor();
    await page.getByTestId("courrier-message-m4").click();
    await page.getByTestId("courrier-apercu").getByText("sourire non conforme", { exact: false }).waitFor();
    if (tag === "bureau") await shot(page, `${tag}-16-courrier`);
    await page.getByTestId("courrier-repondre").click();
    await page.getByTestId("courrier-objet").waitFor();
    if ((await page.getByTestId("courrier-objet").inputValue()) !== "RE: Pork ID : photographie refusée") throw new Error("objet de réponse inattendu");
    await page.getByTestId("courrier-envoyer").click();
    await page.getByTestId("courrier-dossier-envoyes").waitFor();
    await page.locator("[data-testid=courrier-liste] tbody tr", { hasText: "RE: Pork ID" }).waitFor();
    step(`${tag} : Courrier d'État (lecture, réponse, envoi)`);
    // Écrire à une personnalité (carnet d'adresses) : elle répond en personnage ; sans relais (export statique), sa lettre de secours.
    await page.getByTestId("courrier-nouveau").click();
    await page.getByTestId("courrier-a").fill("marcel.cochonnet@pignet.pork");
    await page.getByTestId("courrier-objet").fill("Une chaise");
    await page.locator(".courrier-texte").fill("Tonton, faut-il apporter une chaise jeudi ?");
    await page.getByTestId("courrier-envoyer").click();
    await page.getByTestId("courrier-dossier-reception").click();
    await page.locator("[data-testid=courrier-liste] tbody tr", { hasText: "RE: Une chaise" }).waitFor({ timeout: 15000 });
    await closeTop();
    step(`${tag} : courrier à une personnalité (réponse en personnage ou de secours)`);

    // PorkAmp : lecture d'un morceau, le temps avance, arrêt
    await open("d-porkamp");
    await page.getByTestId("window-porkamp").waitFor();
    await page.getByTestId("amp-lecture").click();
    await page.waitForFunction(() => window.__lectures.some((s) => /viteau-merci-copain\.mp3/.test(s)), null, { timeout: 8000 }).catch(async () => {
      throw new Error(`PorkAmp muet : ${await page.evaluate(() => window.__lectures.join(" "))}`);
    });
    await page.locator("[data-testid=amp-temps]", { hasNotText: "0:00" }).waitFor({ timeout: 8000 });
    if (tag === "bureau") await shot(page, `${tag}-20-porkamp`);
    await page.getByTestId("amp-suivante").click();
    await page.getByTestId("amp-titre").getByText("Sous la neige", { exact: false }).waitFor();
    await page.getByTestId("amp-stop").click();
    await closeTop();
    step(`${tag} : PorkAmp (lecture, piste suivante, arrêt)`);

    // Mes décorations : la connexion et le courrier envoyé ont été décorés, et le restent
    await open("d-decorations");
    await page.getByTestId("window-distinctions").waitFor();
    for (const id of ["connexion", "courrier"]) await page.locator(`[data-testid=decor-${id}].obtenue`).waitFor({ timeout: 8000 });
    if ((await page.locator("[data-testid=decor-liste] li.obtenue").count()) < 2) throw new Error("distinctions non décernées");
    if (tag === "bureau") await shot(page, `${tag}-19-decorations`);
    await closeTop();
    step(`${tag} : Mes décorations (connexion, courrier)`);

    if (tag === "bureau") {
      // Arrêt brutal (rechargement) : ScanDisque au démarrage suivant
      await page.reload();
      await page.getByTestId("power").click();
      await page.getByTestId("boot-scandisk").waitFor();
      await page.waitForTimeout(2500);
      await shot(page, `${tag}-13-scandisk`);
      await page.keyboard.press("Escape");
      await page.getByTestId("login-password").fill("douzi");
      await page.getByTestId("login-submit").click();
      await page.getByTestId("start").waitFor({ timeout: 8000 });
      step(`${tag} : ScanDisque après arrêt brutal`);
    }

    if (tag === "bureau") {
      // Fichiers : nouveau dossier renommé, glisser vers le bureau, puis vers la Poubelle, restaurer, modifier, enregistrer
      const fermer = (app) => page.locator(`[data-testid=window-${app}]:visible [data-testid=window-close]`).first().click();
      // L'écran de bienvenue s'ouvre peu après la connexion : on l'attend et on le ferme, il couvrirait la Poubelle.
      await page.getByTestId("window-bienvenue").waitFor({ timeout: 5000 }).then(() => fermer("bienvenue"), () => {});
      await page.getByTestId("afficher-bureau").click();
      await open("d-docs");
      await page.getByTestId("window-fichiers").waitFor();
      await page.getByTestId("fichier-Documents officiels").dblclick();
      await page.getByTestId("fichier-Lettre de bienvenue.txt").waitFor();
      await page.getByTestId("fichiers-nouveau-dossier").click();
      await page.getByTestId("renommage").fill("Jambons");
      await page.keyboard.press("Enter");
      await page.getByTestId("fichier-Jambons").waitFor();
      const fenetre = await page.getByTestId("window-fichiers").boundingBox();
      const bureau = await page.getByTestId("bureau").boundingBox();
      // Point du bureau le plus éloigné de la fenêtre (coin bas-droit ou haut-droit, loin des icônes).
      const coins = [{ x: bureau.width - 50, y: bureau.height - 50 }, { x: bureau.width - 50, y: 50 }, { x: bureau.width / 2, y: bureau.height - 50 }];
      const dedans = (c) => bureau.x + c.x >= fenetre.x && bureau.x + c.x <= fenetre.x + fenetre.width && bureau.y + c.y >= fenetre.y && bureau.y + c.y <= fenetre.y + fenetre.height;
      await page.getByTestId("fichier-Lettre de bienvenue.txt").dragTo(page.getByTestId("bureau"), { targetPosition: coins.find((c) => !dedans(c)) ?? coins[0] });
      const icone = page.getByTestId("icon-f:Lettre de bienvenue.txt");
      await icone.waitFor();
      if (await page.getByTestId("fichier-Lettre de bienvenue.txt").count()) throw new Error("fichier resté dans Documents officiels");
      await shot(page, `${tag}-21-fichiers`);
      await fermer("fichiers");
      // Icône du bureau lâchée sur la Poubelle d'État
      // Geste repris si une pub ou une bulle surgit pendant le glisser (elle recouvre alors la Poubelle).
      for (let essai = 0; ; essai++) {
        const a = await icone.boundingBox();
        const b = await page.getByTestId("icon-d-poubelle").boundingBox();
        await page.mouse.move(a.x + a.width / 2, a.y + 16);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y + 20, { steps: 12 });
        await page.mouse.up();
        try {
          await icone.waitFor({ state: "detached", timeout: 4000 });
          break;
        } catch (e) {
          // Une pub fermée entre-temps a pu consommer l'attente alors que le dépôt avait réussi.
          if (!(await icone.count())) break;
          if (essai >= 2) throw e;
        }
      }
      await open("d-poubelle");
      await page.getByTestId("jete-Lettre de bienvenue.txt").click();
      await page.getByTestId("poubelle-restaurer").click();
      await icone.waitFor();
      await fermer("fichiers");
      // Le document restauré s'ouvre, se modifie et s'enregistre vraiment
      await icone.dblclick();
      await page.getByTestId("texte-zone").waitFor();
      await page.getByTestId("texte-zone").fill("Citoyen, tout va bien.");
      await page.getByTestId("texte-enregistrer").click();
      await page.getByText("Enregistré dans", { exact: false }).waitFor();
      await fermer("texte");
      await icone.dblclick();
      if ((await page.getByTestId("texte-zone").inputValue()) !== "Citoyen, tout va bien.") throw new Error("document non enregistré");
      await fermer("texte");
      step(`${tag} : fichiers (dossier, glisser vers le bureau, Poubelle, restaurer, enregistrer)`);

      // Commutateur de tâches (Alt+²) : deux fenêtres, on bascule vers la précédente
      await open("d-docs");
      await page.getByTestId("window-fichiers").waitFor();
      await open("d-mail");
      await page.getByTestId("window-mail").waitFor();
      await page.keyboard.down("Alt");
      await page.keyboard.press("Backquote");
      await page.getByTestId("commutateur").waitFor();
      if (!/Mes documents/.test(await page.getByTestId("commutateur-titre").textContent())) throw new Error("le commutateur ne propose pas la fenêtre précédente");
      await shot(page, `${tag}-22-commutateur`);
      await page.keyboard.up("Alt");
      await page.getByTestId("commutateur").waitFor({ state: "detached" });
      await page.locator(".pk-window.focused[data-testid=window-fichiers]").waitFor();
      await fermer("fichiers");
      await fermer("mail");
      // Date et heure : calendrier et horloge à aiguilles au clic sur l'heure
      await page.getByTestId("horloge").click();
      await page.getByTestId("calendrier").waitFor();
      const mois = await page.getByTestId("calendrier-mois").textContent();
      await page.getByRole("button", { name: "Mois suivant" }).click();
      if ((await page.getByTestId("calendrier-mois").textContent()) === mois) throw new Error("le calendrier ne change pas de mois");
      await shot(page, `${tag}-23-calendrier`);
      await page.keyboard.press("Escape");
      await page.getByTestId("calendrier").waitFor({ state: "detached" });
      step(`${tag} : commutateur de tâches et calendrier`);

      // Commande secrète « douze », annuaire PigNet, page perso de Marcel et son livre d'or
      await viaDemarrer(() => page.getByTestId("menu-executer"));
      await page.getByTestId("executer-champ").fill("douze");
      await page.getByTestId("executer-champ").press("Enter");
      await page.getByTestId("site-douze-douze").waitFor();
      await page.getByTestId("nav-url").fill("porko://annuaire");
      await page.getByTestId("nav-url").press("Enter");
      await page.getByTestId("annuaire-tonton-marcel").click();
      await page.getByTestId("site-tonton-marcel").waitFor();
      await page.getByTestId("site-anneau").waitFor();
      await shot(page, `${tag}-24-page-perso`);
      await page.getByTestId("nav-url").fill("porko://tonton-marcel/livre-d-or");
      await page.getByTestId("nav-url").press("Enter");
      const avant = await page.locator(".site-livre-message").count();
      await page.getByTestId("site-livre-message").fill("C'est la perspective.");
      await page.getByTestId("site-livre-signer").click();
      await page.locator(".site-livre-message").nth(avant).waitFor();
      await fermer("navigateur");
      step(`${tag} : PigNet (commande secrète, annuaire, page perso, livre d'or)`);

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
      const journal = await page.getByTestId("jbj-journal").textContent();
      for (const k of ["e", "z", "e", "z", "a", "z"]) {
        await page.keyboard.press(k);
        await page.waitForTimeout(220);
      }
      if ((await page.getByTestId("jbj-journal").textContent()) === journal) throw new Error("Jambonjon ne réagit pas au clavier");
      await shot(page, `${tag}-26-jambonjon`);
      await fermer("jambonjon");
      await page.getByTestId("icon-f:Jambonjon").waitFor();
      await fermer("navigateur");
      step(`${tag} : partagiciel téléchargé, installé et lancé (Jambonjon)`);
    }

    // Menu système d'une fenêtre, « Afficher le bureau », clic droit sur un bouton de tâche
    await open("d-docs");
    await page.getByTestId("window-fichiers").waitFor();
    for (let essai = 0; ; essai++) {
      await page.locator("[data-testid=window-fichiers] [data-testid=menu-systeme]").click();
      try {
        await page.getByTestId("menu-contexte").waitFor({ timeout: 5000 });
        break;
      } catch (e) {
        if (essai >= 2) throw e;
      }
    }
    if (tag === "bureau") await shot(page, `${tag}-18-menu-systeme`);
    await page.keyboard.press("Escape");
    await page.getByTestId("afficher-bureau").click();
    await page.getByTestId("window-fichiers").waitFor({ state: "hidden" });
    // Une pub surprise peut refermer le menu entre son ouverture et le clic : on le rouvre alors.
    for (let essai = 0; ; essai++) {
      try {
        if (poche) {
          await page.getByTestId("taches-bouton").click();
          await page.locator("[data-testid=taches] .tache", { hasText: "Mes documents" }).click({ timeout: 5000 });
        } else {
          await page.locator(".tb-task", { hasText: "Mes documents" }).click({ button: "right" });
          await page.getByRole("menuitem", { name: "Restaurer" }).click({ timeout: 5000 });
        }
        break;
      } catch (e) {
        if (essai >= 2) throw e;
      }
    }
    await page.getByTestId("window-fichiers").waitFor();
    step(`${tag} : menu système, afficher le bureau, menu des tâches`);

    // Arrêt propre → « vous pouvez éteindre » → bouton d'alimentation → rallumage
    await viaDemarrer(() => page.getByRole("button", { name: "Arrêter…" }));
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

    // Après un arrêt propre, la session rouvre les fenêtres laissées ouvertes
    await page.keyboard.press("Escape");
    await page.getByTestId("login-password").fill("12");
    await page.getByTestId("login-submit").click();
    await page.getByTestId("window-fichiers").waitFor({ timeout: 10000 });
    step(`${tag} : fenêtres restaurées après un arrêt propre`);
    await ctx.close();
  }
  if (errors.length) throw new Error("Erreurs navigateur :\n" + errors.join("\n"));
  console.log("Parcours complet : OK");
} catch (e) {
  // Affichée avant la fermeture du navigateur, qui ferait échouer bruyamment les gestionnaires de pubs en cours.
  console.error("ÉCHEC :", e);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
