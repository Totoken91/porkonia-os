/** Plans de conception et vues réelles des quatre actes. */
import {build} from 'esbuild';
import {mkdir,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
const racine=resolve('.'),inter=join(racine,'.next/apercu-campagne'),sortie=resolve(process.argv[2]);
await mkdir(inter,{recursive:true});await mkdir(sortie,{recursive:true});
await build({stdin:{contents:`export {rendre} from './rendu';export {nouvellePartie,jouer} from './logic';export {porkosPack} from '../../content/packs/porkos';`,resolveDir:join(racine,'src/apps/jambonjon'),loader:'ts'},bundle:true,format:'esm',platform:'browser',tsconfig:join(racine,'tsconfig.json'),outfile:join(inter,'jeu.js')});
const serveur=createServer(async(req,res)=>{
  if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<body style="margin:0;background:#201b14;color:#e8d9b5;font:16px monospace"><main id="plans" style="display:flex;gap:16px;padding:16px"></main>');return;}
  try{res.setHeader('content-type','application/javascript');res.end(await readFile(join(inter,'jeu.js')));}catch{res.writeHead(404).end();}
}).listen(0,'127.0.0.1');await new Promise(ok=>serveur.once('listening',ok));
const navigateur=await chromium.launch();
try{
  const page=await navigateur.newPage({viewport:{width:1040,height:636}});await page.goto(`http://127.0.0.1:${serveur.address().port}`);
  for(let acte=0;acte<4;acte++){
  await page.evaluate(async acte=>{
    const r=await import('/jeu.js'),jeu=r.porkosPack.jambonjon;let p=r.nouvellePartie(jeu,42,'ysee');
    document.getElementById('plans').replaceChildren();
    const descendre=()=>{const i=p.carte.cases.indexOf(2);p.joueur.x=i%p.carte.w;p.joueur.y=Math.floor(i/p.carte.w);p.monstres=[];p=r.jouer(p,jeu,{type:'agir'});};
    for(let n=0;n<acte*3;n++)descendre();
    const cameras=[{x:11.5,y:7.5},{x:19.5,y:7.5},{x:13.5,y:19.5},{x:13.5,y:20.5},{x:14.5,y:20.5},{x:14.5,y:17.5},{x:14.5,y:15.5},{x:12.5,y:21.5},{x:15.5,y:24.5},{x:15.5,y:7.5},{x:14.5,y:24.5},{x:15.5,y:8.5}];
    for(let n=acte*3;n<acte*3+3;n++){
      const c=p.carte,cadre=document.createElement('section');cadre.id=`etage-${n+1}`;cadre.style.width='320px';
      const titre=document.createElement('h2');titre.style.cssText='font-size:16px;min-height:40px;margin:0 0 8px';titre.textContent=`${n+1} · ${jeu.nomsEtages[n]}`;cadre.append(titre);
      const plan=document.createElement('canvas');plan.width=320;plan.height=290;
      const g=plan.getContext('2d'),taille=10,ox=Math.floor((320-c.w*taille)/2),oy=Math.floor((290-c.h*taille)/2);
      g.fillStyle='#13110d';g.fillRect(0,0,320,290);
      for(let y=0;y<c.h;y++)for(let x=0;x<c.w;x++){
        const i=y*c.w+x;if(c.cases[i]===1)continue;g.fillStyle=['#776649','#887344','#655c3b','#48563d','#746852'][c.zones?.[i]??0];
        g.fillRect(ox+x*taille,oy+y*taille,9,9);
        if(c.cases[i]===2){g.fillStyle='#e9bd54';g.fillRect(ox+x*taille+2,oy+y*taille+2,5,5);}
      }
      for(const m of p.monstres){g.fillStyle='#b35240';g.fillRect(ox+m.x*taille+2,oy+m.y*taille+2,5,5);}
      for(const s of p.sol){g.fillStyle=s.butin.type==='objet'?'#d0af78':'#a3b776';g.fillRect(ox+s.x*taille+3,oy+s.y*taille+3,3,3);}
      g.fillStyle='#d9dfc2';g.fillRect(ox+p.joueur.x*taille+2,oy+p.joueur.y*taille+2,5,5);cadre.append(plan);
      const infos=document.createElement('p');infos.style.cssText='font-size:12px;line-height:18px;height:36px;margin:8px 0';infos.textContent=`${p.monstres.length} rencontres · ${p.sol.filter(s=>s.butin.type==='objet').length} réserve(s) d’équipement\nBlanc : entrée · Or : sortie · Rouge : ennemis`;cadre.append(infos);
      const vue=document.createElement('canvas');vue.width=320;vue.height=180;vue.style.imageRendering='pixelated';const gv=vue.getContext('2d'),im=gv.createImageData(320,180);
      r.rendre(im,p,{...cameras[n],angle:-Math.PI/2,bob:0,secousse:0},{temps:1000,touches:new Set(),eclair:0,eclairCouleur:[0,0,0],spriteDe:type=>(type===jeu.boss.id?jeu.boss:jeu.monstres.find(m=>m.id===type)).sprite});
      gv.putImageData(im,0,0);cadre.append(vue);document.getElementById('plans').append(cadre);
      if(n<11)descendre();
    }
  },acte);
  await page.screenshot({path:join(sortie,`acte-${acte+1}.png`)});
  for(let n=acte*3+1;n<=acte*3+3;n++)await page.locator(`#etage-${n} canvas`).last().screenshot({path:join(sortie,`vue-etage-${n}.png`)});
  }
}finally{await navigateur.close();serveur.close();}
