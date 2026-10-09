import {creerProfil} from "./comptes-helper.mjs";
/**
 * Régressions Course de Grosses : téléchargement et installation, ouverture du compte en banque en ligne, allocation,
 * courtage en bourse, pari, course, buvette et ivresse de l'écran, sur bureau et Poche paysage / portrait.
 * Usage : npm run build && npm run test:e2e:grosses (SHOTS facultatif).
 */
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
    res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
    res.end(await readFile(p));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;
const errors = [];
const browser = await chromium.launch();
const shot = async (page, name) => SHOTS && page.screenshot({ path: join(SHOTS, `${name}.png`) });
const step = (m) => console.log("✓", m);
const verifierBanque=async(page,tag,vue)=>{
  const erreur=await page.getByTestId('banque').evaluate(root=>{
    const b=root.getBoundingClientRect();
    const tropLarge=[...root.querySelectorAll('.bq-principal,.banque-table,.banque-form')].some(e=>e.getBoundingClientRect().right>b.right+1||e.scrollWidth>e.clientWidth+1);
    return root.scrollWidth>root.clientWidth+1||tropLarge||getComputedStyle(root).fontSize!=='16px';
  });
  if(erreur)throw Error(`${tag}: banque deborde ou police hors taille native (${vue})`);
  if(SHOTS)await page.screenshot({path:join(SHOTS,`${tag}-banque-retro-${vue}.png`),style:'.gruik,.bulles{visibility:hidden!important}'});
};

try {
  const formats = [
    { tag: "bureau", viewport: { width: 1366, height: 800 } },
    { tag: "poche-paysage", viewport: { width: 844, height: 390 }, mobile: true },
    { tag: "poche-portrait", viewport: { width: 390, height: 844 }, mobile: true },
    { tag: "poche-compact", viewport: { width: 360, height: 780 }, mobile: true },
  ];
  for (const { tag, viewport, mobile } of formats) {
    if(process.env.FORMATS&&!process.env.FORMATS.split(",").includes(tag))continue;
    const poche = !!mobile;
    const ctx = await browser.newContext({ viewport, ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(`${tag}: ${m.text()}`));
    await page.addLocatorHandler(page.getByTestId("ad"), async () => page.getByTestId("ad-close").click({ timeout: 15000 }));
    await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style");
      st.textContent = ".bulles, .bulles *, .gruik, .gruik * { pointer-events: none !important; }";
      document.head.appendChild(st);
    }));
    await page.goto(base);
    await page.waitForTimeout(400);
    await page.getByTestId("power").click();
    await page.getByTestId("boot-bios").waitFor();
    await page.keyboard.press("Space");
    await page.getByTestId("login").waitFor();
    await creerProfil(page);
    await page.getByTestId("login-password").fill("12");
    await page.getByTestId("login-submit").click();
    await page.getByTestId("start").waitFor({ timeout: 8000 });
    await page.getByTestId("window-bienvenue").waitFor();
    await page.locator("[data-testid=window-bienvenue] [data-testid=window-close]").click();
    step(`${tag} : bureau`);

    const open = async (id) => {
      if (!poche) return page.getByTestId(`icon-${id}`).dblclick();
      await page.getByTestId("afficher-bureau").click();
      await page.getByTestId(`icon-${id}`).tap();
    };
    const fermer = (app) => page.locator(`[data-testid=window-${app}]:visible [data-testid=window-close]`).first().click();

    // Téléchargement et installation depuis le Grenier à Partagiciels.
    await open("d-nav");
    await page.getByTestId("nav-url").fill("porko://grenier-partagiciels");
    await page.getByTestId("nav-url").press("Enter");
    await page.getByTestId("telecharger-grosses").click();
    await page.getByTestId("dl-enregistrer").click();
    await page.getByTestId("dl-enregistrer-ici").click();
    await page.getByTestId("dl-ouvrir-fichier").waitFor({ timeout: 60000 });
    await page.getByTestId("dl-ouvrir-fichier").click();
    await page.getByTestId("installeur").waitFor();
    await page.getByTestId("inst-suivant").click();
    await page.getByTestId("inst-accepte").check();
    for (let k = 0; k < 5; k++) await page.getByTestId("inst-suivant").click();
    await page.getByTestId("inst-fin").waitFor({ timeout: 20000 });
    await page.getByTestId("inst-suivant").click();
    await page.getByTestId("window-grosses").waitFor();
    step(`${tag} : Course de Grosses téléchargée et installée`);

    // Sans compte, le jeu renvoie vers la banque.
    await page.getByTestId("grosses-banque").click();
    await page.getByTestId("banque").waitFor();
    await verifierBanque(page,tag,"accueil");
    await shot(page, `${tag}-banque-accueil`);
    await page.getByTestId("banque-rub-compte").click();
    if ((await page.getByTestId("banque-numero").inputValue()).trim() === "") throw new Error(`${tag}: numéro de compte non prérempli`);
    await page.getByTestId("banque-code").fill("12");
    await page.getByTestId("banque-ouvrir").click();
    if (await page.getByTestId("banque-solde").count()) throw new Error(`${tag}: compte ouvert avec un code trop court`);
    await page.getByTestId("banque-code").fill("1234");
    await page.getByTestId("banque-ouvrir").click();
    await page.getByTestId("banque-solde").waitFor();
    if (!(await page.getByTestId("banque-solde").textContent()).includes("100")) throw new Error(`${tag}: prime de bienvenue absente`);
    await verifierBanque(page,tag,"compte");
    await page.getByTestId("banque-allocation").click();
    await page.waitForFunction(() => document.querySelector("[data-testid=banque-solde]")?.textContent?.includes("125"));
    if (!(await page.getByTestId("banque-allocation").isDisabled())) throw new Error(`${tag}: allocation versée deux fois`);
    step(`${tag} : compte ouvert, prime, allocation quotidienne`);

    // Courtage : un titre à bas prix (cornichon), achat puis vente.
    await page.getByTestId("banque-rub-bourse").click();
    await verifierBanque(page,tag,"bourse");
    await page.getByTestId("banque-achat-4").click();
    await page.getByTestId("banque-message").waitFor();
    const apres = await page.evaluate(() => JSON.parse(localStorage.getItem("porkos.banque.citoyen")));
    if (!apres.portefeuille["Cornichon"] || apres.solde >= 125) throw new Error(`${tag}: achat de titre non enregistré`);
    await shot(page, `${tag}-bourse`);
    await page.getByTestId("banque-vente-4").click();
    const vendu = await page.evaluate(() => JSON.parse(localStorage.getItem("porkos.banque.citoyen")));
    if (vendu.portefeuille["Cornichon"]) throw new Error(`${tag}: vente non enregistrée`);
    await page.getByTestId("banque-rub-compte").click();
    await page.getByTestId("banque-deconnexion").click();
    await page.getByTestId("banque-connexion").waitFor();
    await page.getByTestId("banque-code").fill("0000");
    await page.getByTestId("banque-connexion").click();
    if (await page.getByTestId("banque-solde").count()) throw new Error(`${tag}: mauvais code accepté`);
    step(`${tag} : courtage en bourse, code refusé`);
    while (await page.locator("[data-testid=window-navigateur]").count()) await page.locator("[data-testid=window-navigateur] [data-testid=window-close]").last().evaluate((b) => b.click());

    // Le jeu : pari, course, résultat, buvette.
    await page.getByTestId("grosses-paddock").waitFor();
    await page.getByTestId("grosses-parier").click();
    await page.getByTestId("grosses-pari-pris").waitFor();
    await shot(page, `${tag}-paris`);
    await page.getByTestId("grosses-speaker").waitFor();
    if (!(await page.getByTestId("grosses-speaker").textContent()).includes("Départ")) throw new Error(`${tag}: pas de décompte après le pari`);
    await page.getByTestId("grosses-resultat").waitFor({ timeout: 60000 });
    await shot(page, `${tag}-resultat`);
    await page.getByTestId("grosses-suivante").click();
    step(`${tag} : pari, course et résultat`);

    if (await page.locator(".tube.ivre").count()) throw new Error(`${tag}: écran penché avant d'avoir bu`);
    if (await page.getByTestId("choppe").count()) throw new Error(`${tag}: choppe sans bière livrée`);
    if (await page.getByTestId("grosses-biere").count()) throw new Error(`${tag}: la bière est encore un bouton du jeu`);
    // La bière se commande sur Porkomazon, par drone (10 s), puis une choppe apparaît devant l'écran.
    await page.getByTestId("grosses-porkomazon").click();
    await page.getByTestId("porkomazon").waitFor();
    const deborde=await page.getByTestId('porkomazon').evaluate(e=>e.scrollWidth>e.clientWidth+1);
    if(deborde)throw Error(`${tag}: catalogue deborde horizontalement`);
    await page.getByTestId('porkomazon').locator('h1').scrollIntoViewIfNeeded();
    await shot(page,`${tag}-catalogue-retro`);
    await page.getByTestId("pkz-livraison-drone").check();
    await page.getByTestId("pkz-commander").click();
    await page.getByTestId("pkz-colis").waitFor();
    if (await page.getByTestId("choppe").count()) throw new Error(`${tag}: choppe avant la livraison`);
    await page.getByTestId("pkz-produit-saucissons3").check();
    await page.getByTestId("pkz-commander").click();
    if(await page.getByTestId("saucisson-table").count())throw Error(`${tag}: saucisson avant livraison`);
    const suivi=await page.getByTestId("pkz-colis").innerText();
    if(!suivi.includes('saucisson')||!suivi.includes('bière'))throw Error(`${tag}: commandes mixtes confondues : ${suivi}`);
    const op = await page.evaluate(() => JSON.parse(localStorage.getItem("porkos.banque.citoyen")).historique.some((o) => o.libelle.includes("Porkomazon")));
    if (!op) throw new Error(`${tag}: commande non débitée`);
    await page.getByTestId("choppe").waitFor({ timeout: 20000 });
    await page.getByTestId("saucisson-table").waitFor({timeout:20000});
    await page.getByTestId("saucisson-table").locator('img').evaluate(async image=>{await image.decode();if(!image.naturalWidth)throw Error('image saucisson absente');});
    await shot(page, `${tag}-biere-saucisson`);
    const chevauche=await page.evaluate(()=>{const a=document.querySelector('[data-testid=choppe]').getBoundingClientRect(),b=document.querySelector('[data-testid=saucisson-table]').getBoundingClientRect();return a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;});
    if(chevauche)throw Error(`${tag}: bouteille et saucisson se chevauchent`);
    for(let i=0;i<3;i++){
      await page.getByTestId("saucisson-table").click({force:true});
      const stock=await page.evaluate(()=>({s:JSON.parse(localStorage.getItem('porkos.saucisson.citoyen')).stock,b:JSON.parse(localStorage.getItem('porkos.biere.citoyen')).stock}));
      if(stock.s!==2-i||stock.b!==1)throw Error(`${tag}: mauvais stock consommé`);
      await page.waitForTimeout(750);
    }
    if(await page.getByTestId('saucisson-table').count())throw Error(`${tag}: planche encore présente sans saucisson`);
    if(await page.locator('.tube.ivre').count())throw Error(`${tag}: le saucisson rend ivre`);
    step(`${tag}: livraison de saucissons, stocks distincts, planche et consommation valides`);
    await shot(page, `${tag}-choppe`);
    await page.getByTestId("choppe").click({ force: true });
    await page.locator(".tube.ivre").waitFor();
    const ivresse = await page.evaluate(() => JSON.parse(localStorage.getItem("porkos.ivresse.citoyen")).v);
    if (ivresse < 0.8) throw new Error(`${tag}: ivresse non enregistrée (${ivresse})`);
    if (await page.getByTestId("choppe").count()) throw new Error(`${tag}: choppe encore là sans bière`);
    await page.waitForTimeout(500);
    await shot(page, `${tag}-ivre`);
    step(`${tag} : Porkomazon, livraison, choppe, l'écran tangue`);

    // Économie : prix indexés, saucisson qui éponge, abonnement Saucissignal à la levée de fonds.
    if (!(await page.locator(".pkz-indexe").first().innerText()).includes("indexé")) throw new Error(`${tag}: prix non indexés`);
    await page.getByTestId("pkz-produit-saucisson").check({ force: true });
    await page.getByTestId("pkz-commander").click({ force: true });
    await page.getByTestId("saucisson-table").waitFor({ timeout: 20000 });
    const avant = await page.evaluate(() => JSON.parse(localStorage.getItem("porkos.ivresse.citoyen")).v);
    await page.getByTestId("saucisson-table").click({ force: true });
    await page.waitForFunction((v) => (JSON.parse(localStorage.getItem("porkos.ivresse.citoyen"))?.v ?? 0) < v - 0.5, avant);
    await page.locator(".tube.ivre").waitFor({ state: "detached", timeout: 5000 });
    step(`${tag} : le saucisson éponge la bière, l'écran se redresse`);
    const url = page.locator("[data-testid=window-navigateur] [data-testid=nav-url]").last();
    await url.fill("porko://saucissignal/investir");
    await url.press("Enter");
    await page.getByTestId("saucissignal-don-5").click({ force: true });
    await page.waitForFunction(() => Boolean(JSON.parse(localStorage.getItem("porkos.banque.citoyen")).abonnements?.saucissignal));
    await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith("porkos.courrier.") && localStorage.getItem(k).includes("sauc-bienvenue")));
    step(`${tag} : Saucissignal abonne l'investisseur et Éric lui écrit`);
    await ctx.close();
  }
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
  server.close();
}
