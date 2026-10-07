import {creerProfil} from "./comptes-helper.mjs";
/**
 * Parcours PigNet Y2K : bannières, liens, installation de Donjonbon et investissement Saucissignal, sur bureau et Poche paysage / portrait.
 * Usage : npm run build && node tests/e2e/pignet.mjs (SHOTS facultatif).
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

    await open("d-nav");
    await page.getByTestId('portail-acces-salle-arcade').waitFor();
    const visiter=async url=>{await page.getByTestId('nav-url').fill(url);await page.getByTestId('nav-url').press('Enter');};
    const imageOk=async root=>root.locator('img').evaluateAll(async images=>{await Promise.all(images.map(async img=>{img.loading='eager';await img.decode();if(!img.naturalWidth)throw Error('Image absente : '+img.src);}));});
    const largeur=async()=>{const bad=await page.getByTestId('nav-page').evaluate(e=>e.scrollWidth>e.clientWidth+1);if(bad){await capture('debordement');console.log(await page.getByTestId('nav-page').evaluate(e=>[...e.querySelectorAll('*')].filter(x=>x.getBoundingClientRect().right>e.getBoundingClientRect().right+1).slice(0,15).map(x=>[x.className,x.tagName,x.textContent.slice(0,30),x.getBoundingClientRect().width])));throw Error(`${tag}: page trop large`);}};
    const capture=async nom=>{if(SHOTS)await page.screenshot({path:join(SHOTS,`${tag}-${nom}.png`),style:'.bulles,.gruik{visibility:hidden!important}'});};
    await imageOk(page.locator('.portail-bannieres'));
    await largeur();
    await capture('portail');
    await page.getByTestId('portail-acces-salle-arcade').click();
    await page.getByTestId('site-salle-arcade').waitFor();
    await page.getByTestId('site-jouer-jambonjon').waitFor();
    await page.getByTestId('site-salle-arcade').getByRole('button',{name:'Jouer à Nappe Vide'}).click();
    await page.getByTestId('window-nappe-vide').waitFor();
    await fermer('nappe-vide');
    await visiter('porko://accueil');
    await page.getByTestId('pub-donjonbon').click();
    await page.getByTestId('site-donjonbon').waitFor();
    await imageOk(page.getByTestId('site-donjonbon'));await largeur();
    await capture('donjonbon');
    await page.getByRole('button',{name:'Les 12 chevaliers',exact:true}).click();
    if(await page.locator('.site-chevaliers article').count()!==12)throw Error('Chevaliers manquants');
    await imageOk(page.locator('.site-chevaliers'));await largeur();
    await capture('chevaliers');
    await page.getByRole('button',{name:'Guide de survie',exact:true}).click();
    await page.getByText('1. BOUGER SANS S’EMMÊLER',{exact:true}).waitFor();await largeur();
    await page.getByRole('button',{name:'Téléchargement',exact:true}).click();
    await page.getByTestId('telecharger-jambonjon').click();
    await page.getByTestId('dl-enregistrer').waitFor();await fermer('telechargement');
    await page.getByTestId('site-jouer-jambonjon').click();
    await page.getByTestId('installeur').waitFor();
    await page.getByTestId('inst-suivant').click();
    await page.getByTestId('inst-accepte').check();
    for(let i=0;i<5;i++)await page.getByTestId('inst-suivant').click();
    await page.getByTestId('inst-fin').waitFor({timeout:20000});
    await page.getByTestId('inst-suivant').click();
    await page.getByTestId('window-jambonjon').waitFor();
    {
      await page.getByTestId('jbj-nouvelle').click();
      await page.getByTestId('jbj-classe-tank').click();await page.getByTestId('jbj-chevalier-berthe').click();await page.getByTestId('jbj-partir').click();
      await page.getByTestId('jbj-vue').waitFor();await page.waitForTimeout(400);
      if(SHOTS&&tag==='bureau')await page.getByTestId('jbj-vue').screenshot({path:join(SHOTS,'donjonbon-capture.png')});
    }
    await fermer('jambonjon');
    if(!await page.getByTestId('site-jouer-jambonjon').innerText().then(t=>t.includes('Jouer')&&!t.includes('Installer')))throw Error('Accès Jouer non actualisé');
    await page.getByTestId('site-jouer-jambonjon').click();await page.getByTestId('window-jambonjon').waitFor();await fermer('jambonjon');
    step(`${tag}: arcade, Donjonbon, 12 blasons, guide, téléchargement, installation et relance valides`);
    for(const [id,hote] of [['douzi','douzi-ambree'],['saucissignal','saucissignal'],['viteau','club-viteau']]){
      await visiter('porko://accueil');await page.getByTestId(`pub-${id}`).click();
      await page.getByTestId(`site-${hote}`).waitFor();await largeur();await imageOk(page.locator('.pignet-site-entete'));
      await capture(hote);
      if(id==='douzi'){
        await page.getByRole('button',{name:'La livraison',exact:true}).click();
        await page.getByRole('button',{name:'Ouvrir la boutique',exact:true}).click();await page.getByTestId('porkomazon').waitFor();
      }else if(id==='saucissignal'){
        await page.getByRole('button',{name:'Investir',exact:true}).click();
        if(!await page.getByTestId('saucissignal-don-5').isDisabled())throw Error('Versement autorisé sans compte');
        await visiter('porko://banque-porc');await page.getByTestId('banque-rub-compte').click();
        await page.getByTestId('banque-code').fill('1234');await page.getByTestId('banque-ouvrir').click();await page.getByTestId('banque-solde').waitFor();
        await visiter('porko://saucissignal/investir');
        await page.getByTestId('saucissignal-don-12').click();
        const c=await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.banque.citoyen')));
        if(c.solde!==88||!c.historique.some(o=>o.libelle==='Saucissignal : versement personnel à Éric'))throw Error('Versement à Éric non enregistré');
        if(!(await page.getByTestId('saucissignal-recu').innerText()).includes('Parts attribuées : 0'))throw Error('Gag du reçu absent');
        for(let i=0;i<3;i++)await page.getByTestId('saucissignal-don-25').click();
        await page.getByTestId('saucissignal-don-25').click();
        const reste=await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.banque.citoyen')).solde);
        if(reste!==13)throw Error('Versement supérieur au solde accepté');
        await largeur();await capture('saucissignal-investir');
        await visiter('porko://saucissignal');
        await page.getByRole('button',{name:'Contacter le fondateur ▸',exact:true}).click();await page.getByTestId('window-mail').waitFor();await fermer('mail');
      }else{
        await page.getByRole('button',{name:'Écouter dans PorkAmp ▸',exact:true}).click();await page.getByTestId('window-porkamp').waitFor();await fermer('porkamp');
      }
    }
    step(`${tag}: bannières cliquables, boutique, courrier et musique valides`);
    await visiter('porko://accueil');
    const nouvelles=page.getByTestId('nouvelles-locales');
    await nouvelles.getByText(/étage 1/).waitFor();
    await nouvelles.getByText(/versement personnel à Éric/).waitFor();
    await page.getByTestId('rubrique-petites-annonces').click();await largeur();
    await page.getByTestId('vie-texte').fill('Échange un modem contre un silence de qualité.');
    await page.getByRole('button',{name:'Publier mon annonce',exact:true}).click();
    await page.getByText('Échange un modem contre un silence de qualité.',{exact:true}).waitFor();
    await visiter('porko://accueil');await page.getByTestId('rubrique-petites-annonces').click();
    const annonce=page.locator('.vie-publication').filter({hasText:'Échange un modem contre un silence de qualité.'});
    await annonce.getByRole('button',{name:'Répondre',exact:true}).click();
    await page.getByTestId('courrier-objet').waitFor();
    if(await page.getByTestId('courrier-objet').inputValue()!=='À propos de votre annonce')throw Error('Brouillon non ouvert');
    await fermer('mail');await capture('annonces');
    await annonce.getByRole('button',{name:'Retirer mon annonce'}).click();
    if(await annonce.count())throw Error('Annonce non retirée');
    await visiter('porko://horoscope-porcin');await largeur();
    await page.getByTestId('vie-horoscope').locator('select').selectOption('6');
    await page.getByRole('button',{name:'Garder cette prédiction'}).click();
    await visiter('porko://courrier-lecteurs');await largeur();
    await page.getByTestId('vie-texte').fill('Ma chaise est jalouse de mon ordinateur.');
    await page.getByRole('button',{name:'Écrire à la rédaction'}).click();
    await page.locator('.vie-publication').filter({hasText:'Ma chaise est jalouse de mon ordinateur.'}).locator('blockquote').waitFor();
    await capture('courrier-lecteurs');
    await visiter('porko://horoscope-porcin');await page.getByText('Votre carnet astral',{exact:true}).waitFor();await capture('horoscope');
    await visiter('porko://accueil');
    if(await page.getByRole('button',{name:/Webcam/}).count())throw Error('Webcam toujours présente');
    await page.getByRole('button',{name:'Prise de diagnostic du portail'}).click();await page.getByTestId('site-modem-libre').waitFor();await largeur();
    await page.getByRole('button',{name:'Le forum du modem',exact:true}).click();
    await page.getByTestId('site-livre-message').fill('Le central fonctionne encore !');await page.getByTestId('site-livre-signer').click();
    await page.getByText('Le central fonctionne encore !',{exact:true}).waitFor();
    await page.getByRole('button',{name:'La page perso de l’administrateur'}).click();await page.getByTestId('site-chez-rat').waitFor();await largeur();await capture('secret');
    await visiter('porko://porkomazon');await page.getByTestId('pkz-commander').click();
    await visiter('porko://accueil');await nouvelles.getByText(/colis en livraison/).waitFor();await largeur();
    await page.getByRole('button',{name:'Prise de diagnostic du portail'}).click();await page.getByTestId('site-modem-libre').waitFor();
    step(`${tag}: publications, brouillon, horoscope conservé, secrets et nouvelles réelles valides`);
    await ctx.close();
  }
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
  server.close();
}
