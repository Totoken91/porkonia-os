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
const OBJECTIF=process.env.OBJECTIF?JSON.parse(await readFile(process.env.OBJECTIF,'utf8')):null;
const ELITE=process.env.ELITE?JSON.parse(await readFile(process.env.ELITE,'utf8')):null;
const COMPORTEMENTS=process.env.COMPORTEMENTS?JSON.parse(await readFile(process.env.COMPORTEMENTS,'utf8')):[];
const EQUIPEMENT=process.env.EQUIPEMENT?JSON.parse(await readFile(process.env.EQUIPEMENT,'utf8')):null;
const GUIDAGE=process.env.GUIDAGE==='1';
const REFUGES=process.env.REFUGES?JSON.parse(await readFile(process.env.REFUGES,"utf8")):[];
const BOSSES=process.env.BOSSES?JSON.parse(await readFile(process.env.BOSSES,'utf8')):[];
const FINALE=process.env.FINALE?JSON.parse(await readFile(process.env.FINALE,'utf8')):null;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain", ".ico": "image/x-icon", ".mp3": "audio/mpeg" };

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
    { tag: "poche-compact", viewport: { width: 360, height: 780 }, mobile: true },
  ];
  for (const { tag, viewport, mobile } of formats) {
    if (process.env.FORMATS && !process.env.FORMATS.split(",").includes(tag)) continue;
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
    // Le contrôle du jeu et ses captures restent lisibles après le contrôle de l'assistant.
    await page.addStyleTag({content: ".gruik,.bulles{display:none!important}"});
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

    const fermer = async (app) => { const bouton=page.locator(`[data-testid=window-${app}]:visible [data-testid=window-close]`).first();if(await bouton.count())await bouton.click(); };
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
      if(GUIDAGE){
        if(!(await page.getByTestId('jbj-mission').textContent()).includes('douze étages'))throw new Error(`${tag}: objectif absent`);
        if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-mission-titre.png`)});
      }
      await page.getByTestId("jbj-nouvelle").click();
      await page.getByTestId("jbj-chevaliers").waitFor();
      for (const classe of ["tank", "dps", "jambonmancien"]) {
        await page.getByTestId(`jbj-classe-${classe}`).click();
        if(await page.locator('.jbj-chevalier').count()!==4)throw new Error(`${tag}: quatre chevaliers attendus pour ${classe}`);
        await page.locator('.jbj-blason').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
        if(SHOTS)await page.getByTestId('jbj-chevaliers').screenshot({path:join(SHOTS,`${tag}-blasons-${classe}.png`)});
      }
      await page.getByTestId("jbj-chevalier-ysee").click();
      if(SHOTS)await page.getByTestId("jbj-chevaliers").screenshot({path:join(SHOTS,`${tag}-choix-chevalier.png`)});
      await page.getByTestId("jbj-partir").click();
      await page.getByTestId("jbj-vue").waitFor();
      const entreeCampagne=await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.jambonjon.partie')));
      if(GUIDAGE){
        if(!entreeCampagne.guide?.actif||!entreeCampagne.guide.vus.includes('mission'))throw new Error(`${tag}: guide de depart absent`);
        await page.keyboard.press('F1');await page.getByTestId('jbj-aide-panneau').waitFor();
        await page.getByTestId('jbj-conseils').click();
        const muet=await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.jambonjon.partie')));
        if(muet.guide.actif||muet.tour!==entreeCampagne.tour||muet.alea!==entreeCampagne.alea)throw new Error(`${tag}: masquer les conseils modifie le jeu`);
        const aide=page.getByTestId('jbj-aide-panneau');
        const dimensions=await aide.evaluate(e=>[e.scrollWidth,e.clientWidth]);if(dimensions[0]>dimensions[1]+1)throw new Error(`${tag}: aide trop large`);
        if(SHOTS){await aide.evaluate(e=>{e.scrollTop=0;});await aide.screenshot({path:join(SHOTS,`${tag}-aide-mission.png`)});}
        await page.keyboard.press('Escape');await fermer('jambonjon');await fermer('navigateur');await open('f:L’Ordre Cochon');
        await page.getByTestId('jbj-continuer').click();await page.keyboard.press('F1');
        if(await page.getByTestId('jbj-conseils').getAttribute('aria-pressed')!=='false')throw new Error(`${tag}: preference perdue a la reprise`);
        await page.keyboard.press('Escape');await page.keyboard.press('F2');await page.getByTestId('jbj-classe-jambonmancien').click();await page.getByTestId('jbj-chevalier-ysee').click();await page.getByTestId('jbj-partir').click();
        const nouvelle=await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.jambonjon.partie')));
        if(nouvelle.guide.actif||nouvelle.journal.some(m=>m.cle.startsWith('jbj.guide.')))throw new Error(`${tag}: nouvelle partie ignore la preference`);
        await page.keyboard.press('F1');await page.getByTestId('jbj-conseils').click();await page.keyboard.press('Escape');
        step(`${tag}: mission, conseils gratuits, preference et nouvelle partie valides`);
      }
      if(entreeCampagne.carte.w!==23||entreeCampagne.carte.h!==19||entreeCampagne.joueur.x!==4||entreeCampagne.joueur.y!==14||!entreeCampagne.carte.zones||entreeCampagne.monstres.length!==6)throw new Error(`${tag}: premier étage conçu non chargé`);
      if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-entree-campagne.png`)});

    // Vues fixes : une salle à piliers reliée à une seconde salle par un couloir étroit.
    if(SHOTS) {
      await fermer('jambonjon');
      await fermer('navigateur');
      for(const [nom,cy] of [['salle',10],['couloir',7]]) {
        await page.evaluate(cy=>{
          const p=JSON.parse(localStorage.getItem('porkos.jambonjon.partie'));
          const w=11,h=13,cases=Array(w*h).fill(1);
          for(let y=2;y<=11;y++)cases[y*w+5]=0;
          for(const y0 of [3,9])for(let y=y0;y<y0+3;y++)for(let x=2;x<=8;x++)cases[y*w+x]=0;
          for(const [x,y]of [[3,4],[7,4],[3,10],[7,10]])cases[y*w+x]=1;
          p.carte={w,h,cases,vu:Array(w*h).fill(true),decor:cases.map((_,i)=>i%11===2?1:i%11===8?2:0)};
          p.joueur.x=5;p.joueur.y=cy;p.joueur.dir=0;p.joueur.ivresse=0;p.fin=null;
          p.monstres=[{uid:990,type:'inspecteur',niveau:1,elite:false,boss:false,x:5,y:4,pv:23,pvMax:23,att:6,def:1,xp:10,eveille:false,sonne:0}];
          p.sol=[{x:4,y:9,butin:{type:'biere'}},{x:6,y:9,butin:{type:'jambon'}}];
          localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p));
        },cy);
        await fermer('jambonjon');await open('f:L’Ordre Cochon');await page.getByTestId('jbj-continuer').click();
        await page.waitForTimeout(300);
        await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-donjon-${nom}.png`)});
        await page.getByTestId('jbj-vue').screenshot({path:join(SHOTS,`${tag}-vue-${nom}.png`)});
      }
      // Isoler le cadre : l'inspecteur de la capture s'approche sinon dans le passage.
      await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('porkos.jambonjon.partie'));p.monstres=[];localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p));});
      await fermer('jambonjon');await open('f:L’Ordre Cochon');await page.getByTestId('jbj-continuer').click();
      await page.keyboard.press('z');await page.keyboard.press('z');await page.waitForTimeout(700);
      const passage=await page.evaluate(()=>{const j=JSON.parse(localStorage.getItem('porkos.jambonjon.partie')).joueur;return [j.x,j.y];});
      if(JSON.stringify(passage)!=='[5,5]')throw new Error(`${tag}: l'encadrement bloque le passage : ${passage}`);
    }

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
    await page.locator(".jbj-sprite-objet").evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    await page.keyboard.press("z");
    await page.waitForTimeout(300);
    if (JSON.stringify(await position())!==JSON.stringify(avant)) throw new Error(`${tag}: marche pendant l’inventaire`);
    await page.keyboard.press("Escape");
    await page.keyboard.press("e");
    await page.keyboard.press("z");
    await page.keyboard.press("F2");
    await page.getByTestId("jbj-chevaliers").waitFor();
    await page.getByTestId("jbj-partir").click();
    await page.waitForTimeout(600);
    const debut = await position();
    await page.waitForTimeout(500);
    if (JSON.stringify(await position())!==JSON.stringify(debut)) throw new Error(`${tag}: une ancienne commande survit à Nouvelle partie`);
    await shot(page, `${tag}-ordre-cochon`);
    // Inventaire déterministe : échanges, retrait, sol, provisions et reprise de sauvegarde.
    await page.evaluate(() => {
      const p=JSON.parse(localStorage.getItem("porkos.jambonjon.partie"));
      p.monstres=[];p.sol=[];p.joueur.pv=7;p.joueur.faim=50;p.joueur.mousse=0;p.joueur.jambons=1;p.joueur.bieres=1;
      const o=(uid,base,att,def,pv,mousse)=>({uid,base,niveau:1,rarete:"etat",att,def,pv,mousse});
      p.joueur.sac=[o(901,"couteau",6,0,0,0),o(902,"gilet",0,4,8,0),o(903,"charlotte",0,1,0,10)];
      localStorage.setItem("porkos.jambonjon.partie",JSON.stringify(p));
    });
    const lire=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("porkos.jambonjon.partie")));
    const reprendre=async()=>{
      await fermer("jambonjon");await open("f:L’Ordre Cochon");await page.getByTestId("jbj-continuer").click();
    };
    await reprendre();await page.getByTestId("jbj-ouvrir-sac").click();
    await page.getByTestId("jbj-sac").waitFor();
    if(await page.locator(".jbj-inv-case").count()!==12)throw new Error(`${tag}: grille du sac incorrecte`);
    const departInv=await lire();
    await page.getByTestId("jbj-equipe-arme").click();
    if((await lire()).joueur.equipe.arme.uid!==departInv.joueur.equipe.arme.uid)throw new Error(`${tag}: sélectionner retire l’arme`);
    await page.getByTestId("jbj-objet-901").click();
    if(!(await page.getByTestId("jbj-objet-fiche").textContent()).includes("Comparaison avec"))throw new Error(`${tag}: comparaison absente`);
    await page.getByTestId("jbj-equiper").click();
    if((await lire()).joueur.equipe.arme.uid!==901)throw new Error(`${tag}: équipement non appliqué`);
    await page.getByTestId("jbj-equipe-arme").click();await page.getByTestId("jbj-retirer").click();
    if((await lire()).joueur.equipe.arme)throw new Error(`${tag}: retrait non appliqué`);
    await page.getByTestId("jbj-objet-901").click();await page.getByTestId("jbj-equiper").click();
    await page.getByTestId("jbj-objet-902").click();await page.getByTestId("jbj-equiper").click();
    await page.getByTestId("jbj-objet-903").click();await page.getByTestId("jbj-jeter").click();
    if((await lire()).joueur.sac.some(o=>o.uid===903))throw new Error(`${tag}: objet posé encore dans le sac`);
    await page.getByTestId("jbj-ramasser").click();
    if(!(await lire()).joueur.sac.some(o=>o.uid===903))throw new Error(`${tag}: récupération sur place impossible`);
    if((await lire()).tour!==departInv.tour)throw new Error(`${tag}: gestion de l’équipement prend un tour`);
    await page.getByTestId("jbj-sac-manger").click();await page.getByTestId("jbj-sac-boire").click();
    const consomme=await lire();
    if(consomme.joueur.jambons!==0||consomme.joueur.bieres!==0||consomme.tour!==departInv.tour+2)throw new Error(`${tag}: provisions ou coût en tours incorrect`);
    await page.getByTestId("jbj-sac-fermer").click();await reprendre();await page.getByTestId("jbj-ouvrir-sac").click();
    const recharge=await lire();
    if(recharge.joueur.equipe.arme.uid!==901||recharge.joueur.equipe.armure.uid!==902)throw new Error(`${tag}: sauvegarde d’équipement perdue`);
    await page.getByTestId("jbj-objet-903").click();
    await page.locator(".jbj-inv-corps").evaluate(e=>{e.scrollTop=0;});
    const dimensions=await page.locator(".jbj-inv-corps").evaluate(e=>[e.scrollWidth,e.clientWidth]);
    if(dimensions[0]>dimensions[1]+1)throw new Error(`${tag}: inventaire déborde horizontalement`);
    const cadre=await page.getByTestId("jbj-sac").boundingBox();
    const fermerSac=await page.getByTestId("jbj-sac-fermer").boundingBox();
    if(!cadre||!fermerSac||fermerSac.y<cadre.y||fermerSac.y+fermerSac.height>cadre.y+cadre.height)throw new Error(`${tag}: entête d’inventaire déplacée hors du panneau`);
    await shot(page,`${tag}-inventaire`);
    if(SHOTS)await page.getByTestId("jbj-sac").screenshot({path:join(SHOTS,`${tag}-inventaire-detail.png`)});
    await page.getByTestId("jbj-sac-fermer").click();
    await page.evaluate(()=>{
      const p=JSON.parse(localStorage.getItem("porkos.jambonjon.partie"));
      p.joueur.sac=Array.from({length:12},(_,i)=>({uid:1000+i,base:"tablier",niveau:1,rarete:"etat",att:0,def:2,pv:0,mousse:0}));
      localStorage.setItem("porkos.jambonjon.partie",JSON.stringify(p));
    });
    await reprendre();await page.getByTestId("jbj-ouvrir-sac").click();await page.getByTestId("jbj-equipe-arme").click();
    if(!(await page.getByTestId("jbj-retirer").isDisabled()))throw new Error(`${tag}: retrait permis dans un sac plein`);
    await page.getByTestId("jbj-objet-1000").click();await page.getByTestId("jbj-equiper").click();
    const plein=await lire();
    if(plein.joueur.sac.length!==12||plein.joueur.equipe.armure.uid!==1000||!plein.joueur.sac.some(o=>o.uid===902))throw new Error(`${tag}: échange dans un sac plein perd un objet`);
    await page.getByTestId("jbj-sac-fermer").click();
    step(`${tag}: inventaire, comparaison, échange, retrait, sol, provisions et sauvegarde validés`);
    step(`${tag}: déplacements rapides, rotations, murs, ivresse, inventaire et nouvelle partie validés`);
    // Mage de niveau 10 : points réels, aucun tour pour apprendre ; lancement en un clic.
    await page.evaluate(()=>{
      const p=JSON.parse(localStorage.getItem('porkos.jambonjon.partie'));
      p.joueur.x=4;p.joueur.y=4;p.joueur.dir=0;p.joueur.niveau=10;p.joueur.xp=0;p.joueur.pv=80;p.joueur.mousse=60;p.joueur.ivresse=0;
      p.joueur.rpg={chevalier:'ysee',classe:'jambonmancien',rangs:[2,1,1,3,0,0],points:3,delais:[0,0,0],protection:0,riposte:0,bouclier:0,perce:false,saigne:-1,encore:false,reduction:0,utilisee:-1};
      const w=9;p.carte={w,h:w,cases:Array.from({length:w*w},(_,i)=>i%w===0||i%w===w-1||i<w||i>=w*(w-1)?1:0),vu:Array(w*w).fill(true),decor:Array(w*w).fill(0)};
      p.joueur.equipe.arme={uid:4000,base:'tranchoir',niveau:6,rarete:'commun',att:5,def:0,pv:0,mousse:0};
      p.monstres=[{uid:5000,type:'inspecteur',niveau:10,elite:true,boss:false,x:4,y:3,pv:180,pvMax:180,att:10,def:3,xp:1,eveille:true,sonne:0}];
      p.sol=[];p.fin=null;localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p));
    });
    await reprendre();await page.getByTestId('jbj-ouvrir-competences').click();
    await page.getByTestId('jbj-competences').waitFor();
    const avantPoints=await lire();
    await page.getByTestId('jbj-apprendre-0').click();
    const apresPoints=await lire();
    if(apresPoints.tour!==avantPoints.tour||apresPoints.joueur.rpg.points!==2||apresPoints.joueur.rpg.rangs[0]!==3)throw new Error(`${tag}: amélioration des compétences incorrecte`);
    const corps=page.locator('.jbj-rpg-panel-corps');
    const taille=await corps.evaluate(e=>[e.scrollWidth,e.clientWidth]);
    if(taille[0]>taille[1]+1)throw new Error(`${tag}: compétences débordent horizontalement`);
    if(SHOTS)await page.getByTestId('jbj-competences').screenshot({path:join(SHOTS,`${tag}-competences.png`)});
    await page.getByTestId('jbj-fermer-competences').click();
    const avantSort=await lire();await page.getByTestId('jbj-actif-0').click();
    if(await page.getByTestId('jbj-confirmer-competence').count())throw new Error(`${tag}: confirmation redondante encore présente`);
    if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-effet-sel.png`)});
    const apresSort=await lire();
    if(apresSort.tour!==avantSort.tour+1||apresSort.joueur.mousse!==avantSort.joueur.mousse-5||!apresSort.monstres[0].rpg.malediction)throw new Error(`${tag}: sort, coût ou malédiction incorrect`);
    if(!apresSort.monstres[0].rpg.annonce)throw new Error(`${tag}: attaque lourde non annoncée`);
    await page.getByTestId('jbj-menace').waitFor();
    await page.getByTestId('jbj-actif-2').click();
    if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-combat-rpg.png`)});
    const apresExplosion=await lire();
    if(apresExplosion.monstres[0].rpg.malediction!==0||apresExplosion.monstres[0].pv>=apresSort.monstres[0].pv)throw new Error(`${tag}: explosion ou consommation de malédiction incorrecte`);
    await reprendre();if((await lire()).joueur.rpg.chevalier!=='ysee')throw new Error(`${tag}: chevalier perdu à la reprise`);
    // Le clavier lance directement ; la mort franchit un niveau et affiche les gains.
    await page.evaluate(()=>{
      const p=JSON.parse(localStorage.getItem('porkos.jambonjon.partie'));
      p.joueur.rpg.delais=[0,0,0];p.joueur.mousse=60;
      p.monstres=[{uid:5100,type:'inspecteur',niveau:1,elite:false,boss:false,x:4,y:3,pv:1,pvMax:23,att:1,def:0,xp:10000,eveille:true,sonne:0}];
      localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p));
    });
    await reprendre();const avantNiveau=await lire();await page.keyboard.press('1');
    await page.getByTestId('jbj-promotion').waitFor();const apresNiveau=await lire();
    if(apresNiveau.tour!==avantNiveau.tour+1||apresNiveau.joueur.niveau<=avantNiveau.joueur.niveau)throw new Error(`${tag}: raccourci direct ou montée de niveau incorrect`);
    const bandeau=page.getByTestId('jbj-promotion'),tailleBandeau=await bandeau.evaluate(e=>[e.scrollWidth,e.clientWidth]);
    if(tailleBandeau[0]>tailleBandeau[1]+1)throw new Error(`${tag}: annonce de niveau déborde`);
    if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-niveau.png`)});
    await bandeau.getByRole('button',{name:'Améliorer mes compétences'}).click();
    await page.getByTestId('jbj-competences').waitFor();await page.getByTestId('jbj-fermer-competences').click();
    await page.evaluate(()=>{
      const p=JSON.parse(localStorage.getItem('porkos.jambonjon.partie'));
      p.joueur.niveau=7;p.joueur.x=4;p.joueur.y=4;p.joueur.dir=0;p.joueur.mousse=30;
      Object.assign(p.joueur.rpg,{chevalier:'colin',classe:'dps',rangs:[1,1,1,1,0,0],points:3,delais:[0,0,0]});
      p.monstres=[{uid:5200,type:'inspecteur',niveau:1,elite:false,boss:false,x:4,y:3,pv:100,pvMax:100,att:1,def:0,xp:1,eveille:true,sonne:0}];
      localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p));
    });
    await reprendre();const avantPas=await lire();await page.getByTestId('jbj-actif-1').click();
    await page.getByTestId('jbj-pas-droite').waitFor();
    if((await lire()).tour!==avantPas.tour)throw new Error(`${tag}: choix du côté consomme un tour`);
    await page.getByTestId('jbj-pas-droite').click();const apresPas=await lire();
    if(apresPas.joueur.x!==5||apresPas.tour!==avantPas.tour+1||apresPas.monstres[0].pv>=avantPas.monstres[0].pv)throw new Error(`${tag}: pas et frappe ne partent pas ensemble`);
    step(`${tag}: douze chevaliers, compétences, points, ciblage, mousse, explosion, menace et sauvegarde validés`);
    if(SHOTS){
      const bases=['couteau','os','tranchoir','crochet','louche','hachoir','tablier','gilet','couennes','manteau','charlotte','bob','casque','couronne','decapsuleur','pork-id','nappe','appeau','jambon','biere'];
      await page.evaluate(async bases=>{
        await Promise.all(bases.map(async base=>{const image=new Image();image.src=`/ordre-cochon/items/${base}.png`;await image.decode();}));
        const p=JSON.parse(localStorage.getItem('porkos.jambonjon.partie'));
        const objet=(base,uid)=>({base,uid,niveau:1,rarete:'etat',att:0,def:0,pv:0,mousse:0});
        p.joueur.sac=bases.slice(0,12).map((base,i)=>objet(base,2000+i));
        p.joueur.equipe={arme:objet('couteau',3000),armure:objet('gilet',3001),tete:objet('charlotte',3002),breloque:objet('decapsuleur',3003)};
        localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p));
      },bases);
      await reprendre();await page.getByTestId('jbj-ouvrir-sac').click();
      await page.locator('.jbj-sprite-objet').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      await page.getByTestId('jbj-objet-2002').click();await page.locator('.jbj-inv-corps').evaluate(e=>{e.scrollTop=0;});
      await page.getByTestId('jbj-sac').screenshot({path:join(SHOTS,`${tag}-items-inventaire.png`)});
    }
    if(EQUIPEMENT){
      await page.evaluate(p=>localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p)),EQUIPEMENT);
      await reprendre();await page.getByTestId('jbj-ouvrir-sac').click();
      const avant=await lire();
      for(const [uid,place,role] of [[881,'armure','PV'],[882,'tete','mousse']]){
        await page.getByTestId(`jbj-objet-${uid}`).click();
        const fiche=page.getByTestId('jbj-objet-fiche');
        if(!(await page.getByTestId('jbj-objet-usage').textContent()).includes(role))throw new Error(`${tag}: usage d’equipement absent`);
        const o=avant.joueur.sac.find(o=>o.uid===uid),porte=avant.joueur.equipe[place];
        if(!(await fiche.locator('.perte').allTextContents()).includes(String(o.def-porte.def)))throw new Error(`${tag}: perte de protection absente`);
        const stat=role==='PV'?'pv':'mousse';
        if(!(await fiche.locator('.gain').allTextContents()).includes(`+${o[stat]-porte[stat]}`))throw new Error(`${tag}: gain de reserve absent`);
        await page.locator('.jbj-sprite-objet').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
        if(SHOTS)await page.getByTestId('jbj-sac').screenshot({path:join(SHOTS,`${tag}-profil-${place}.png`)});
      }
      await page.getByTestId('jbj-objet-881').click();await page.getByTestId('jbj-equiper').click();
      const apres=await lire();
      if(apres.tour!==avant.tour||apres.joueur.pv!==avant.joueur.pv||apres.joueur.equipe.armure.uid!==881)throw new Error(`${tag}: echange d’equipement incorrect`);
      await page.getByTestId('jbj-sac-fermer').click();await reprendre();
      if(JSON.stringify((await lire()).joueur.equipe.armure)!==JSON.stringify(apres.joueur.equipe.armure))throw new Error(`${tag}: bonus recalcules apres reprise`);
      step(`${tag}: profils, compromis, echange sans soin et sauvegarde valides`);
    }
    if(ELITE){
      await page.evaluate(p=>localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p)),ELITE);
      await reprendre();await page.keyboard.press('Space');
      const q=await lire(),prix=q.sol.find(s=>s.butin.type==='objet');
      if(q.monstres.length||!prix||!['garde','cru','etat'].includes(prix.butin.objet.rarete))throw new Error(`${tag}: prix d’elite absent`);
      if(!q.journal.some(m=>m.cle==='jbj.msg.butinElite'))throw new Error(`${tag}: annonce de butin absente`);
      if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-butin-elite.png`)});
      await page.keyboard.press('ArrowUp');await page.getByTestId('jbj-ouvrir-sac').click();
      await page.getByTestId(`jbj-objet-${prix.butin.objet.uid}`).click();
      if(SHOTS)await page.getByTestId('jbj-sac').screenshot({path:join(SHOTS,`${tag}-prix-elite.png`)});
      await page.getByTestId('jbj-sac-fermer').click();await reprendre();
      if(!(await lire()).joueur.sac.some(o=>o.uid===prix.butin.objet.uid))throw new Error(`${tag}: prix perdu apres reprise`);
      step(`${tag}: elite, butin garanti, comparaison et sauvegarde valides`);
    }
    if(OBJECTIF){
      await page.evaluate(p=>localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p)),OBJECTIF);
      await reprendre();await page.keyboard.press('Space');await page.getByTestId('jbj-promotion').waitFor();
      const p=await lire();if(p.etage!==2||p.joueur.niveau!==2||p.joueur.rpg.points!==1)throw new Error(`${tag}: progression par objectif incorrecte`);
      if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-objectif-niveau.png`)});
      step(`${tag}: objectif d’etage, niveau et point de competence valides`);
    }
    for(const fixture of REFUGES){
      await page.evaluate(p=>localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p)),fixture);
      await reprendre();await page.getByTestId('jbj-refuge').waitFor();
      const largeur=await page.getByTestId('jbj-refuge').evaluate(e=>[e.scrollWidth,e.clientWidth]);
      if(largeur[0]>largeur[1]+1)throw new Error(`${tag}: refuge trop large`);
      if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-refuge-${fixture.etage}.png`)});
      const avant=await lire();await page.getByTestId('jbj-reposer').click();const apres=await lire();
      if(apres.tour!==avant.tour||apres.joueur.pv<=avant.joueur.pv||apres.joueur.faim!==100||!apres.refugesVisites.includes(fixture.etage))throw new Error(`${tag}: repos incorrect`);
      await reprendre();if(await page.getByTestId('jbj-reposer').isEnabled())throw new Error(`${tag}: repos repetable`);
      await page.getByTestId('jbj-refuge').getByRole('button',{name:/Comp.tences/}).click();await page.getByTestId('jbj-repartir').click();
      const reset=await lire();if(reset.joueur.rpg.points!==9||reset.joueur.rpg.rangs.join(',')!=='1,0,0,0,0,0')throw new Error(`${tag}: redistribution incorrecte`);
      await page.getByTestId('jbj-fermer-competences').click();await page.getByTestId('jbj-refuge-descendre').click();
      const suite=await lire();if(suite.etage!==fixture.etage+1||await page.getByTestId('jbj-refuge').count())throw new Error(`${tag}: sortie du refuge incorrecte`);
      step(`${tag}: refuge ${fixture.etage}, repos unique, points et descente valides`);
    }
    for(const fixture of COMPORTEMENTS){
      await page.evaluate(p=>localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p)),fixture);
      await reprendre();await page.getByTestId('jbj-menace').waitFor();
      const avant=await lire(),type=avant.monstres[0].type;
      if(!(await page.getByTestId('jbj-menace').textContent()).includes(type==='inspecteur'?'Verdict':'Écrasement'))throw new Error(`${tag}: alerte incorrecte pour ${type}`);
      if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-attaque-${type}.png`)});
      await page.keyboard.press('q');const esquive=await lire();
      if(esquive.joueur.pv!==avant.joueur.pv||esquive.monstres[0].rpg.annonce)throw new Error(`${tag}: esquive de ${type} echouee`);
      await reprendre();await page.keyboard.press('w');const reprise=await lire();
      if(reprise.tour!==esquive.tour+1||reprise.joueur.pv!==avant.joueur.pv||reprise.monstres[0].x!==avant.monstres[0].x||reprise.monstres[0].y!==avant.monstres[0].y)throw new Error(`${tag}: pause de ${type} absente apres sauvegarde`);
      step(`${tag}: ${type}, annonce, esquive et recuperation sauvegardee valides`);
    }
    for(const fixture of BOSSES){
      await page.evaluate(p=>localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p)),fixture);
      await reprendre();await page.getByTestId('jbj-menace').waitFor();
      const avant=await lire();
      if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-boss-${fixture.etage}.png`)});
      await page.keyboard.press(fixture.etage===6?'s':fixture.etage===9?'q':'d');
      const apres=await lire();
      if(apres.joueur.pv!==avant.joueur.pv||apres.monstres[0].rpg.annonce)throw new Error(`${tag}: esquive du boss ${fixture.etage} échouée`);
      await reprendre();if((await lire()).monstres[0].type!==fixture.monstres[0].type)throw new Error(`${tag}: boss perdu à la sauvegarde`);
      step(`${tag}: télégraphe et esquive du boss ${fixture.etage} validés`);
    }
    if(FINALE){
      await page.evaluate(p=>localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p)),FINALE);
      await reprendre();
      if(!(await page.getByTestId('jambonjon').innerText()).includes('Acte 4'))throw new Error(`${tag}: acte final absent du HUD`);
      if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-antre-final.png`)});
      await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('porkos.jambonjon.partie'));p.joueur.x=15;p.joueur.y=6;p.joueur.dir=0;p.monstres=p.monstres.filter(m=>m.boss);p.monstres[0].pv=1;localStorage.setItem('porkos.jambonjon.partie',JSON.stringify(p));});
      await reprendre();await page.keyboard.press('1');await page.getByTestId('jbj-fin').waitFor();
      if(await page.evaluate(()=>localStorage.getItem('porkos.jambonjon.partie'))!==null)throw new Error(`${tag}: victoire finale garde une sauvegarde active`);
      const bilan=await page.getByTestId('jbj-bilan-victoire').locator('dd').allTextContents();
      if(Number(bilan[0])!==12||Number(bilan[2])!==FINALE.tues+1||Number(bilan[3])!==FINALE.tour)throw new Error(`${tag}: bilan de victoire incorrect`);
      if(!(await page.getByTestId('jbj-vainqueur').innerText()).includes('Ysée'))throw new Error(`${tag}: chevalier vainqueur absent`);
      const fin=page.getByTestId('jbj-fin');
      if(await fin.evaluate(e=>e.scrollWidth>e.clientWidth+1))throw new Error(`${tag}: conclusion trop large`);
      if(tag==='poche-paysage'&&await fin.evaluate(e=>e.scrollHeight>e.clientHeight+1))throw new Error(`${tag}: conclusion nécessite de défiler en paysage`);
      if(SHOTS)await page.getByTestId('jambonjon').screenshot({path:join(SHOTS,`${tag}-conclusion.png`)});
      await page.getByTestId('jbj-rejouer').click();await page.getByTestId('jbj-chevaliers').waitFor();
      await page.getByTestId('jbj-classe-tank').click();await page.getByTestId('jbj-chevalier-berthe').click();await page.getByTestId('jbj-partir').click();
      const frais=await lire();
      if(frais.fin||frais.etage!==1||frais.tues!==0||frais.tour!==0||frais.joueur.rpg.chevalier!=='berthe')throw new Error(`${tag}: nouvelle expedition conserve la campagne terminee`);
      step(`${tag}: douzième étage, acte final et victoire validés`);
    }
    await ctx.close();
  }
  if(errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
  server.close();
}
