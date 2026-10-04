/** Inspect native guardian grids and their actual renderer at identical camera distances. */
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
const racine=resolve('.'),inter=join(racine,'.next/apercu-gardiens'),sortie=resolve(process.argv[2]);
await mkdir(inter,{recursive:true});await mkdir(sortie,{recursive:true});
await build({stdin:{contents:`export {rendre,preparer} from './rendu';export {nouvellePartie,jouer} from './logic';export {porkosPack} from '../../content/packs/porkos';export {PIXELS_GARDIENS,PALETTE_GARDIENS} from './gardiens-pixels';`,resolveDir:join(racine,'src/apps/jambonjon'),loader:'ts'},bundle:true,format:'esm',platform:'browser',tsconfig:join(racine,'tsconfig.json'),outfile:join(inter,'jeu.js')});
const serveur=createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('content-type','text/html; charset=utf-8');res.end('<body style="margin:0;background:#201b14;color:#e8d9b5;font:16px monospace"><main id="plans" style="display:flex;gap:16px;padding:16px"></main>');return;}
 res.setHeader('content-type','application/javascript');res.end(await readFile(join(inter,'jeu.js')));
}).listen(0,'127.0.0.1');await new Promise(ok=>serveur.once('listening',ok));
const navigateur=await chromium.launch();try{
 const page=await navigateur.newPage({viewport:{width:1040,height:1060}});await page.goto(`http://127.0.0.1:${serveur.address().port}`);
 const rapports=await page.evaluate(async()=>{
  const r=await import('/jeu.js'),jeu=r.porkosPack.jambonjon,rapports=[];window.exportsSprites={};
  const anciens=['inspecteur','tonneau','fantome'];
  for(const [idx,etage] of [3,6,9].entries()){
   let p=r.nouvellePartie(jeu,42,'ysee');
   while(p.etage<etage){const i=p.carte.cases.indexOf(2);p.joueur.x=i%p.carte.w;p.joueur.y=Math.floor(i/p.carte.w);p.monstres=[];p=r.jouer(p,jeu,{type:'agir'});}
   const boss=p.monstres.find(m=>m.boss),def=jeu.bossIntermediaires.find(b=>b.id===boss.type);p.monstres=[boss];p.sol=[];
   const rows=r.PIXELS_GARDIENS[def.sprite],n=rows.length;
   if(rows.some(row=>row.length!==n||[...row].some(v=>v!=='.'&&!r.PALETTE_GARDIENS[v])))throw Error(`Invalid grid: ${def.sprite}`);
   const section=document.createElement('section');section.style.width='320px';section.id=def.sprite;
   const titre=document.createElement('h2');titre.style.cssText='font-size:16px;margin:0 0 10px';titre.textContent=`${etage} · ${def.nom}`;section.append(titre);
   const tex=r.preparer().monstres[def.sprite].tex,c=document.createElement('canvas');c.width=n;c.height=n;
   c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(tex.px),n,n),0,0);window.exportsSprites[def.sprite]=c.toDataURL('image/png');
   const native=document.createElement('div');native.style.cssText=`height:${n*4+12}px;display:flex;align-items:center;justify-content:center;gap:16px;background:#29251e`;
   const petit=c.cloneNode();petit.getContext('2d').drawImage(c,0,0);c.style.cssText=`width:${n*4}px;height:${n*4}px;image-rendering:pixelated`;native.append(c,petit);section.append(native);
   const gris=document.createElement('canvas');gris.width=n*2;gris.height=n;const gc=gris.getContext('2d'),im=gc.createImageData(n*2,n);
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){let j=(y*n+x)*4,k=(y*n*2+x)*4,gray=Math.round(.2126*tex.px[j]+.7152*tex.px[j+1]+.0722*tex.px[j+2]);im.data.set([gray,gray,gray,tex.px[j+3]],k);im.data.set([214,204,177,tex.px[j+3]],k+n*4);}
   gc.putImageData(im,0,0);gris.style.cssText=`width:${n*4}px;height:${n*2}px;image-rendering:pixelated;display:block;margin:8px auto`;section.append(gris);
   for(const [libelle,sprite,distance] of [['Avant · 2 cases',anciens[idx],2],['Après · 2 cases',def.sprite,2],['Après · 4 cases',def.sprite,4]]){
    const label=document.createElement('p');label.style.cssText='margin:8px 0 4px;font-size:13px';label.textContent=libelle;section.append(label);
    const vue=document.createElement('canvas');vue.width=320;vue.height=180;vue.style.imageRendering='pixelated';const g=vue.getContext('2d'),img=g.createImageData(320,180);
    p.joueur.x=boss.x;p.joueur.y=boss.y+distance;p.joueur.dir=0;
    r.rendre(img,p,{x:p.joueur.x+.5,y:p.joueur.y+.5,angle:-Math.PI/2,bob:0,secousse:0},{temps:1000,touches:new Set(),eclair:0,eclairCouleur:[0,0,0],spriteDe:()=>sprite});g.putImageData(img,0,0);section.append(vue);
   }
   document.getElementById('plans').append(section);
   const alpha=new Set();for(let i=3;i<tex.px.length;i+=4)alpha.add(tex.px[i]);
   rapports.push({sprite:def.sprite,dimensions:[tex.w,tex.h],couleurs:new Set(rows.join('').replaceAll('.','')).size,alpha:[...alpha],taille:r.preparer().monstres[def.sprite].taille});
  }
  return rapports;
 });
 await page.screenshot({path:join(sortie,'comparaison-gardiens.png')});
 for(const id of ['prevot','pressoir','spectre'])await page.locator(`#${id}`).screenshot({path:join(sortie,`${id}-controle.png`)});
 for(const [id,data] of Object.entries(await page.evaluate(()=>window.exportsSprites)))await writeFile(join(sortie,`${id}-runtime-natif.png`),Buffer.from(data.split(',')[1],'base64'));
 await writeFile(join(sortie,'controle-grille.json'),JSON.stringify(rapports,null,2));
}finally{await navigateur.close();serveur.close();}
