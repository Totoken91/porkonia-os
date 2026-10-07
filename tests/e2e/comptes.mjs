import {creerProfil} from "./comptes-helper.mjs";
/**
 * Comptes locaux : création, vrais mots de passe, isolation et migration des sauvegardes.
 * Usage : npm run build && node tests/e2e/comptes.mjs (SHOTS facultatif).
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
const browser=await chromium.launch();
const errors=[];
const assert=(ok,message)=>{if(!ok)throw Error(message);};
try{
  for(const [tag,viewport,mobile] of [
    ['bureau',{width:1366,height:800},false],
    ['paysage',{width:844,height:390},true],
    ['portrait',{width:390,height:844},true],
    ['compact',{width:360,height:780},true],
  ]){
    if(process.env.FORMATS&&!process.env.FORMATS.split(',').includes(tag))continue;
    const ctx=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
    const page=await ctx.newPage();
    page.on('pageerror',e=>errors.push(`${tag}: ${e.message}`));
    await page.addLocatorHandler(page.getByTestId('ad'),async()=>page.getByTestId('ad-close').click());
    await page.addLocatorHandler(page.getByTestId('window-bienvenue'),async()=>page.locator('[data-testid=window-bienvenue] [data-testid=window-close]').evaluate(b=>b.click()));
    await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{
      const s=document.createElement('style');s.textContent='.gruik,.gruik *,.bulles,.bulles *{pointer-events:none!important}';document.head.appendChild(s);
    }));
    const boot=async()=>{
      await page.getByTestId('power').click();await page.getByTestId('boot-bios').waitFor();await page.keyboard.press('Space');
      if(await page.getByTestId('boot-scandisk').count())await page.keyboard.press('Escape');
      await page.getByTestId('login').waitFor();
    };
    const shot=async name=>{if(SHOTS){await page.waitForTimeout(900);await page.screenshot({path:join(SHOTS,`${tag}-comptes-${name}.png`)});}};
    const layout=async()=>assert(await page.locator('.comptes-fenetre').evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().bottom<=innerHeight+1),`${tag}: formulaire hors écran`);
    const login=async pw=>{await page.getByTestId('login-password').fill(pw);await page.getByTestId('login-submit').click();};
    const bureau=async()=>{await page.getByTestId('start').waitFor();};
    const logout=async()=>{await page.getByTestId('start').click();await page.getByRole('button',{name:'Fermer la session…',exact:true}).click();await page.getByTestId('login').waitFor();};
    await page.goto(base);await page.waitForTimeout(400);await boot();await page.getByTestId('compte-nom').waitFor();
    await layout();await shot('creation');
    assert(!await page.getByText('Invité',{exact:true}).count(),'Invité encore proposé');
    await page.getByTestId('compte-nom').fill('Kenny');await page.getByTestId('login-password').fill('12');await page.getByTestId('compte-confirmation').fill('13');await page.getByTestId('compte-creer').click();
    await page.getByTestId('login-message').waitFor();assert(!await page.getByTestId('login-submit').count(),'Confirmation incorrecte acceptée');
    await creerProfil(page,'Kenny','12');await layout();await shot('profils');await login('faux');await page.getByTestId('login-message').waitFor();
    assert(await page.getByTestId('login-message').innerText().then(t=>t.includes('incorrect')),'Mauvais mot de passe accepté');
    await login('12');await bureau();
    // Ouvrir un véritable compte bancaire depuis le navigateur.
    if(mobile){await page.getByTestId('afficher-bureau').click();await page.getByTestId('icon-d-nav').tap();}else await page.getByTestId('icon-d-nav').dblclick();
    await page.getByTestId('nav-url').fill('porko://banque-porc');await page.getByTestId('nav-url').press('Enter');await page.getByTestId('banque').waitFor();
    await page.getByTestId('banque-rub-compte').click();await page.getByTestId('banque-code').fill('1234');await page.getByTestId('banque-ouvrir').click();await page.getByTestId('banque-solde').waitFor();
    await page.getByTestId('banque-allocation').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('porkos.banque.citoyen'))?.solde===125);
    if(!mobile){
      await page.getByTestId('nav-url').fill('porko://donjonbon');await page.getByTestId('nav-url').press('Enter');
      await page.getByTestId('site-jouer-jambonjon').click();await page.getByTestId('installeur').waitFor();
      await page.getByTestId('inst-suivant').click();await page.getByTestId('inst-accepte').check();
      for(let i=0;i<5;i++)await page.getByTestId('inst-suivant').click();
      await page.getByTestId('inst-fin').waitFor({timeout:20000});await page.getByTestId('inst-suivant').click();
      await page.getByTestId('jbj-nouvelle').click();await page.getByTestId('jbj-classe-tank').click();await page.getByTestId('jbj-chevalier-berthe').click();await page.getByTestId('jbj-partir').click();
      await page.getByTestId('jbj-vue').waitFor();await page.waitForFunction(()=>localStorage.getItem('porkos.jambonjon.partie.citoyen')!==null);
      await page.locator('[data-testid=window-jambonjon] [data-testid=window-close]').click();
    }
    await page.locator('[data-testid=window-navigateur] [data-testid=window-close]').click();
    // Simuler une livraison faite pendant l'absence ; les stores doivent changer sans rechargement.
    await page.evaluate(()=>localStorage.setItem('porkos.biere.citoyen',JSON.stringify({stock:2,enRoute:[],prochainId:1})));
    await logout();await page.getByTestId('compte-basculer').click();await creerProfil(page,'Berthe','34');
    const idB=await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.comptes.v1'))[1].id);
    await login('12');await page.getByTestId('login-message').waitFor();assert(await page.getByTestId('login').isVisible(),'Mot de passe du premier compte accepté pour le second');
    await login('34');await bureau();assert(!await page.getByTestId('choppe').count(),'Bière du premier profil visible chez le second');
    assert(await page.evaluate(id=>localStorage.getItem(`porkos.banque.${id}`)===null,idB),'Banque partagée');
    if(!mobile){
      assert(await page.evaluate(id=>localStorage.getItem(`porkos.jambonjon.partie.${id}`)===null,idB),'Progression Donjonbon partagée');
      assert(!await page.getByTestId('icon-f:L’Ordre Cochon').count(),'Logiciel du premier profil présent dans le second');
    }
    await logout();await page.getByTestId('login-profil-citoyen').click();await login('12');await bureau();await page.getByTestId('choppe').waitFor();
    assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.banque.citoyen')).solde===125),'Solde perdu après changement de profil');
    if(!mobile){
      await page.getByTestId('icon-f:L’Ordre Cochon').dblclick();await page.getByTestId('jbj-continuer').click();await page.getByTestId('jbj-vue').waitFor();
      assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.jambonjon.partie.citoyen')).joueur!==undefined),'Partie perdue après changement de profil');
      await page.locator('[data-testid=window-jambonjon] [data-testid=window-close]').click();
    }
    await page.getByTestId('choppe').click({force:true});
    assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.biere.citoyen')).stock===1),'Stock du bon compte non enregistré');
    await logout();await page.getByTestId(`login-profil-${idB}`).click();await login('34');await bureau();assert(!await page.getByTestId('choppe').count(),'Stock hérité après deuxième changement');
    await logout();await page.getByTestId('login-profil-citoyen').click();await shot('selection');
    await page.evaluate(()=>localStorage.removeItem('porkos.en-marche'));await page.reload();await page.waitForTimeout(400);await boot();
    assert(await page.getByTestId('login-profil-citoyen').getAttribute('aria-pressed')==='true','Profil choisi oublié au rechargement');
    await login('12');await bureau();await page.getByTestId('choppe').waitFor();
    console.log(`✓ ${tag}: création, mot de passe, profils, banque, stocks, sauvegarde après rechargement`);
    await ctx.close();
  }
  // Navigateur déjà utilisé avant les comptes : récupération proposée et visible en session.
  const ctx=await browser.newContext({viewport:{width:1366,height:800}}),page=await ctx.newPage();
  await page.goto(base);
  await page.evaluate(()=>localStorage.setItem('porkos.biere',JSON.stringify({stock:3,enRoute:[],prochainId:7})));
  await page.getByTestId('power').click();await page.getByTestId('boot-bios').waitFor();await page.keyboard.press('Space');
  await page.getByTestId('compte-heritage').waitFor();assert(await page.getByTestId('compte-heritage').isChecked(),'Récupération non proposée');
  await creerProfil(page,'Ancien joueur','12');await page.getByTestId('login-password').fill('12');await page.getByTestId('login-submit').click();await page.getByTestId('start').waitFor();await page.getByTestId('choppe').waitFor();
  assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('porkos.biere.citoyen')).stock===3),'Ancien stock perdu');
  await ctx.close();console.log('✓ récupération de la sauvegarde antérieure proposée et appliquée');
  assert(!errors.length,errors.join('\n'));
}finally{await browser.close();server.close();}
