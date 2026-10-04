/** Inspecte les textures natives et leur grille dans le rendu réel du donjon. */
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, join } from 'node:path';
import { chromium } from 'playwright';
const root=resolve('.'),dest=resolve(process.argv[2]),inter=join(root,'.next/controle-pixels');
await mkdir(dest,{recursive:true});await mkdir(inter,{recursive:true});
await build({stdin:{contents:`export {rendre,preparer} from './rendu';export {focale} from './ambiance';export {nouvellePartie} from './logic';export {porkosPack} from '../../content/packs/porkos';export * from './grille-pixels';export {PIXELS_GARDIENS} from './gardiens-pixels';export {PIXELS_OBJETS_SOL} from './objets-sol-pixels';`,resolveDir:join(root,'src/apps/jambonjon'),loader:'ts'},bundle:true,format:'esm',platform:'browser',tsconfig:join(root,'tsconfig.json'),outfile:join(inter,'jeu.js')});
const server=createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('content-type','text/html; charset=utf-8');res.end('<body style="margin:0;background:#25211b;color:#e8d9b5;font:16px monospace"><main id="monstres" class="board"></main><main id="objets" class="board"></main><main id="natifs" class="board"></main><style>.board{display:grid;grid-template-columns:repeat(3,320px);gap:12px;padding:12px}canvas{display:block;image-rendering:pixelated}section>div{margin-bottom:4px}</style>');}
 else{res.setHeader('content-type','application/javascript');res.end(await readFile(join(inter,'jeu.js')));}
}).listen(0,'127.0.0.1');await new Promise(ok=>server.once('listening',ok));
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1008,height:842}});
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 const reports=await page.evaluate(async()=>{
  const r=await import('/jeu.js'),a=r.preparer(),reports=[];
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const section=(board,titre)=>{const s=document.createElement('section'),label=document.createElement('div');label.textContent=titre;s.append(label);document.getElementById(board).append(s);return s;};
  const fixtures=()=>{
   const p=r.nouvellePartie(r.porkosPack.jambonjon,42,'berthe');
   p.carte={w:9,h:9,cases:Array.from({length:81},(_,i)=>i<9||i>=72||i%9===0||i%9===8?1:0),vu:Array(81).fill(true),decor:Array(81).fill(0)};
   p.joueur.x=4;p.joueur.y=5;p.joueur.dir=0;p.sol=[];p.monstres=[];
   return p;
  };
  const items=[...Object.entries(a.monstres).map(([id,s])=>({id,famille:'monstre',...s})),...Object.entries(a.objets).map(([id,s])=>({id,famille:'objet',...s})),...['lit','coffre'].map(id=>({id,famille:'mobilier',tex:a.repos[id],taille:a.repos[id].w/r.PIXELS_PAR_CASE}))];
  for(const asset of items){
   const {id,famille,tex:tx,taille:size}=asset,n=tx.w;
   const spec=famille==='monstre'?r.GRILLES_MONSTRES[id]:famille==='objet'?r.GRILLES_OBJETS[id]:r.GRILLES_MOBILIER[id];
   const rows=famille==='monstre'?r.PIXELS_GARDIENS[id]:famille==='objet'?r.PIXELS_OBJETS_SOL[id]:undefined;
   if(rows&&(rows.length!==n||rows.some(row=>row.length!==n)))throw Error(`Matrice invalide: ${famille}/${id}`);
   if(n!==spec||tx.h!==n)throw Error(`Grille invalide: ${famille}/${id}`);
   const natif=canvas(n,n);natif.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(tx.px),n,n),0,0);
   const sec=section('natifs',`${famille} · ${id} · ${n}×${n}`);sec.id=`natif-${famille}-${id}`;
   const zoom=canvas(n*4,n*4);zoom.getContext('2d').imageSmoothingEnabled=false;zoom.getContext('2d').drawImage(natif,0,0,n*4,n*4);sec.append(natif,zoom);
   const alpha=new Set();for(let i=3;i<tx.px.length;i+=4)alpha.add(tx.px[i]);
   const report={sprite:id,famille,dimensions:[tx.w,tx.h],pixelsParCase:n/size,alpha:[...alpha],vues:[]};
   if(famille==='mobilier'){
    const p=fixtures();p.carte.coinRepos={x:4,y:1};p.joueur.x=id==='lit'?2.65:5.35;p.joueur.y=3;
    const c=canvas(320,180),g=c.getContext('2d'),out=g.createImageData(320,180);
    r.rendre(out,p,{x:p.joueur.x+.5,y:3.5,angle:-Math.PI/2,bob:0,secousse:0},{temps:1000,touches:new Set(),eclair:0,eclairCouleur:[0,0,0],spriteDe:()=>id});g.putImageData(out,0,0);section('objets',id).append(c);
   }else{
    for(const distance of [1,3]){
     const p=fixtures();p.joueur.y=4+distance;
     if(famille==='monstre')p.monstres=[{uid:900,type:'inspecteur',niveau:1,elite:false,boss:false,x:4,y:4,pv:100,pvMax:100,att:1,def:0,xp:1,eveille:true,sonne:0}];
     else p.sol=[{x:4,y:4,tonneau:id==='tonneau',butin:{type:id==='sac'?'objet':id}}];
     const c=canvas(320,180),g=c.getContext('2d'),out=g.createImageData(320,180),temps=1000,projection=r.focale(320);
     r.rendre(out,p,{x:4.5,y:p.joueur.y+.5,angle:-Math.PI/2,bob:0,secousse:0},{temps,touches:new Set(),eclair:0,eclairCouleur:[0,0,0],spriteDe:()=>id});g.putImageData(out,0,0);
     const cote=r.coteSprite(n,projection,distance),xa=Math.round(160-cote/2),flotte=famille==='monstre'?Math.sin(temps*.006+900)*.02:0,yb=Math.round(90+projection/distance/2-flotte*projection/distance),ya=yb-cote,groups=new Map();
     for(let y=Math.max(0,ya);y<Math.min(180,yb);y++)for(let x=Math.max(0,xa);x<Math.min(320,xa+cote);x++){
      const u=Math.floor((x-xa)/cote*n),v=Math.floor((y-ya)/cote*n),j=(v*n+u)*4;
      if(u<0||u>=n||v<0||v>=n||tx.px[j+3]<10)continue;
      const key=v*n+u,colors=groups.get(key)??new Set(),i=(y*320+x)*4;colors.add(Array.from(out.data.slice(i,i+3)).join(','));groups.set(key,colors);
     }
     report.vues.push({distance,agrandissement:cote/n,pixelsNatifsTestes:groups.size,pixelsAvecSousDetails:[...groups.values()].filter(s=>s.size>1).length});
     if(distance===1)section(famille==='monstre'?'monstres':'objets',id).append(c);
     const label=document.createElement('div');label.textContent=`${distance} case${distance>1?'s':''}`;sec.append(label,c.cloneNode());sec.lastChild.getContext('2d').drawImage(c,0,0);
    }
   }
   reports.push(report);
  }
  return reports;
 });
 await page.locator('#monstres').screenshot({path:join(dest,'ensemble-rendu.png')});
 await page.locator('#objets').screenshot({path:join(dest,'objets-rendu.png')});
 await page.locator('#natifs').screenshot({path:join(dest,'grilles-natives.png')});
 for(const {sprite,famille} of reports)await page.locator(`#natif-${famille}-${sprite}`).screenshot({path:join(dest,`${famille}-${sprite}.png`)});
 await writeFile(join(dest,'controle-pixels.json'),JSON.stringify(reports,null,2));
 if(process.env.PIXELS_STRICT==='1'){
  if(reports.some(r=>r.pixelsParCase!==40))throw Error('Densités de pixels différentes dans le monde');
  if(reports.some(r=>r.vues.some(v=>v.pixelsAvecSousDetails>0)))throw Error('Des pixels de sprites contiennent des sous-détails');
  for(const distance of [1,3])if(new Set(reports.flatMap(r=>r.vues.filter(v=>v.distance===distance).map(v=>v.agrandissement))).size!==1)throw Error(`Agrandissements différents à ${distance} case(s)`);
 }
}finally{await browser.close();server.close();}
