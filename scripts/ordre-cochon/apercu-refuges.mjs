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
  if(req.url==='/'){res.setHeader('content-type','text/html; charset=utf-8');res.end('<body style="margin:0;background:#201b14;color:#e8d9b5;font:16px monospace"><main id="plans" style="display:flex;gap:16px;padding:16px"></main>');return;}
  try{res.setHeader('content-type','application/javascript');res.end(await readFile(join(inter,'jeu.js')));}catch{res.writeHead(404).end();}
}).listen(0,'127.0.0.1');await new Promise(ok=>serveur.once('listening',ok));
const navigateur=await chromium.launch();try{
  const page=await navigateur.newPage({viewport:{width:1040,height:310}});await page.goto(`http://127.0.0.1:${serveur.address().port}`);
  await page.evaluate(async()=>{
    const r=await import('/jeu.js'),jeu=r.porkosPack.jambonjon;
    for(const etage of [3,6,9]){
      let p=r.nouvellePartie(jeu,42,'ysee');
      while(p.etage<etage){const i=p.carte.cases.indexOf(2);p.joueur.x=i%p.carte.w;p.joueur.y=Math.floor(i/p.carte.w);p.monstres=[];p=r.jouer(p,jeu,{type:'agir'});}
      const i=p.carte.cases.indexOf(2);p.monstres=[];p.sol=[];p.joueur.x=i%p.carte.w;p.joueur.y=Math.floor(i/p.carte.w);p.joueur.dir=0;
      const def={nom:'Refuge',description:'Couchette, foyer et coffre dans la carte du donjon.'};
      const section=document.createElement('section');section.style.width='320px';
      const titre=document.createElement('h2');titre.style.cssText='font-size:16px;margin:0 0 10px';titre.textContent=`Étage ${etage} · ${def.nom}`;section.append(titre);
      const vue=document.createElement('canvas');vue.width=320;vue.height=180;vue.style.imageRendering='pixelated';const g=vue.getContext('2d'),im=g.createImageData(320,180);
      r.rendre(im,p,{x:p.joueur.x+.5,y:p.joueur.y+.5,angle:-Math.PI/2,bob:0,secousse:0},{temps:1000,touches:new Set(),eclair:0,eclairCouleur:[0,0,0],spriteDe:()=> 'rat'});g.putImageData(im,0,0);section.append(vue);
      const description=document.createElement('p');description.style.cssText='font-size:13px;line-height:18px';description.textContent=def.description;section.append(description);document.getElementById('plans').append(section);
    }
  });
  await page.screenshot({path:join(sortie,'coins-repos.png')});
  await page.locator('canvas').first().screenshot({path:join(sortie,'coin-repos-natif.png')});
}finally{await navigateur.close();serveur.close();}
