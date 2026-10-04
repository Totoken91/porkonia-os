/** Compare l'ancien et le nouveau moteur avec la même carte et la même caméra. */
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';

const racine=resolve('.'), inter=join(racine,'.next/apercu-donjon'), sortie=resolve(process.argv[2]);
await mkdir(inter,{recursive:true});await mkdir(sortie,{recursive:true});
const avant=execFileSync('git',['show','2e19a19:src/apps/jambonjon/rendu.ts'],{encoding:'utf8'});
await build({stdin:{contents:avant,resolveDir:join(racine,'src/apps/jambonjon'),loader:'ts'},bundle:true,format:'esm',platform:'browser',tsconfig:join(racine,'tsconfig.json'),outfile:join(inter,'avant.js')});
await build({entryPoints:[join(racine,'src/apps/jambonjon/rendu.ts')],bundle:true,format:'esm',platform:'browser',outfile:join(inter,'apres.js')});
const serveur=createServer(async(req,res)=>{
  if(req.url==='/') {res.setHeader('content-type','text/html');res.end('<html><body style="margin:0;background:#202720;color:#ead9ae;font:16px monospace"><div id="vues" style="display:flex;gap:16px;padding:16px;align-items:start"></div></body></html>');return;}
  try {res.setHeader('content-type','application/javascript');res.end(await readFile(join(inter,req.url.slice(1))));}catch{res.writeHead(404).end();}
}).listen(0,'127.0.0.1');
await new Promise(ok=>serveur.once('listening',ok));
const navigateur=await chromium.launch();
try {
  const page=await navigateur.newPage({viewport:{width:1136,height:432}});
  await page.goto(`http://127.0.0.1:${serveur.address().port}`);
  for(const [nom,cy]of [['salle',10],['couloir',7]]) {
    const mesures=await page.evaluate(async cy=>{
      const modules=[await import('/avant.js'),await import('/apres.js')];
      const w=11,h=13,cases=Array(w*h).fill(1);
      for(let y=2;y<=11;y++)cases[y*w+5]=0;
      for(const y0 of [3,9])for(let y=y0;y<y0+3;y++)for(let x=2;x<=8;x++)cases[y*w+x]=0;
      for(const [x,y]of [[3,4],[7,4],[3,10],[7,10]])cases[y*w+x]=1;
      const p={carte:{w,h,cases,vu:Array(w*h).fill(true),decor:cases.map((_,i)=>i%11===2?1:i%11===8?2:0)},joueur:{x:5,y:cy,dir:0},monstres:[{uid:990,type:'inspecteur',x:5,y:4,boss:false,elite:false}],sol:[{x:4,y:9,butin:{type:'biere'}},{x:6,y:9,butin:{type:'jambon'}}]};
      document.getElementById('vues').replaceChildren();
      return modules.map((r,i)=>{
        const cadre=document.createElement('div'),titre=document.createElement('p'),c=document.createElement('canvas');
        titre.textContent=i?'Après · 85° · 320 × 180':'Avant · 70° · 224 × 168';titre.style.margin='0 0 12px';
        c.id=i?'apres':'avant';c.width=r.LARGEUR;c.height=r.HAUTEUR;c.style.width=`${c.width*2}px`;c.style.height=`${c.height*2}px`;c.style.imageRendering='pixelated';
        cadre.append(titre,c);document.getElementById('vues').append(cadre);
        const g=c.getContext('2d'),im=g.createImageData(c.width,c.height),cam={x:5.5,y:cy+.5,angle:-Math.PI/2,bob:0,secousse:0},fx={temps:1000,touches:new Set(),eclair:0,eclairCouleur:[0,0,0],spriteDe:()=> 'inspecteur'};
        r.rendre(im,p,cam,fx);g.putImageData(im,0,0);
        const debut=performance.now();for(let n=0;n<30;n++)r.rendre(im,p,cam,fx);
        return {version:i?'apres':'avant',msParImage:(performance.now()-debut)/30};
      });
    },cy);
    await page.screenshot({path:join(sortie,`comparatif-${nom}.png`)});
    await page.locator('#apres').screenshot({path:join(sortie,`rendu-${nom}.png`)});
    console.log(nom,JSON.stringify(mesures));
  }
} finally {await navigateur.close();serveur.close();}
