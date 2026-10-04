import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('.'),dest=resolve(process.argv[2]),inter=join(root,'.next/controle-pixels');
await mkdir(dest,{recursive:true});await mkdir(inter,{recursive:true});
await build({stdin:{contents:`export {rendre,preparer} from './rendu';export {focale} from './ambiance';export {nouvellePartie} from './logic';export {porkosPack} from '../../content/packs/porkos';`,resolveDir:join(root,'src/apps/jambonjon'),loader:'ts'},bundle:true,format:'esm',platform:'browser',tsconfig:join(root,'tsconfig.json'),outfile:join(inter,'jeu.js')});
const server=createServer(async(req,res)=>{if(req.url==='/'){res.setHeader('content-type','text/html; charset=utf-8');res.end('<body style="margin:0;background:#25211b;color:#e8d9b5;font:16px monospace"><main style="display:grid;grid-template-columns:repeat(3,320px);gap:12px;padding:12px" id="vues"></main>');}else {res.setHeader('content-type','application/javascript');res.end(await readFile(join(inter,'jeu.js')));}}).listen(0,'127.0.0.1');await new Promise(ok=>server.once('listening',ok));
const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1008,height:842}});await page.goto(`http://127.0.0.1:${server.address().port}`);
 const reports=await page.evaluate(async()=>{
  const r=await import('/jeu.js'),a=r.preparer(),reports=[];
  for(const sprite of Object.keys(a.monstres)){
   const p=r.nouvellePartie(r.porkosPack.jambonjon,42,'berthe');p.carte={w:9,h:9,cases:Array.from({length:81},(_,i)=>i<9||i>=72||i%9===0||i%9===8?1:0),vu:Array(81).fill(true),decor:Array(81).fill(0)};
   p.joueur.x=4;p.joueur.y=5;p.joueur.dir=0;p.sol=[];p.monstres=[{uid:900,type:'inspecteur',niveau:1,elite:false,boss:false,x:4,y:4,pv:100,pvMax:100,att:1,def:0,xp:1,eveille:true,sonne:0}];
   const c=document.createElement('canvas');c.width=320;c.height=180;const g=c.getContext('2d'),image=g.createImageData(320,180),temps=1000;
   r.rendre(image,p,{x:4.5,y:5.5,angle:-Math.PI/2,bob:0,secousse:0},{temps,touches:new Set(),eclair:0,eclairCouleur:[0,0,0],spriteDe:()=>sprite});g.putImageData(image,0,0);
   const tx=a.monstres[sprite].tex,size=a.monstres[sprite].taille,projection=r.focale(320),brut=projection*size,cote=brut>=tx.w?Math.round(brut/tx.w)*tx.w:Math.max(1,Math.round(brut)),xa=Math.round(160-cote/2),yb=Math.round(90+projection/2-Math.sin(temps*.006+900)*.02*projection),ya=yb-cote,groups=new Map();
   for(let y=Math.max(0,Math.ceil(ya));y<Math.min(180,yb);y++)for(let x=Math.max(0,Math.ceil(xa));x<Math.min(320,xa+cote);x++){
    const fu=(x-xa)/cote*tx.w,fv=(y-ya)/cote*tx.h;const u=Math.floor(fu),v=Math.floor(fv),j=(v*tx.w+u)*4;if(u<0||u>=tx.w||v<0||v>=tx.h||tx.px[j+3]!==255)continue;
    const key=v*tx.w+u,colors=groups.get(key)??new Set(),i=(y*320+x)*4;colors.add(Array.from(image.data.slice(i,i+3)).join(','));groups.set(key,colors);
   }
   const variants=[...groups.values()].filter(s=>s.size>1).length;
   reports.push({sprite,dimensions:[tx.w,tx.h],pixelsParCase:tx.w/size,agrandissementDansLaScene:cote/tx.w,pixelsNatifsTestes:groups.size,pixelsAvecSousDetails:variants});
   if(sprite==='moisissure'){const native=document.createElement('canvas');native.width=tx.w;native.height=tx.h;native.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(tx.px),tx.w,tx.h),0,0);const box=document.createElement('section');box.id='sprite-natif';box.style.cssText='width:288px;height:248px;display:flex;align-items:end;gap:8px';const zoom=document.createElement('canvas');zoom.width=240;zoom.height=240;zoom.getContext('2d').imageSmoothingEnabled=false;zoom.getContext('2d').drawImage(native,0,0,240,240);box.append(native,zoom);document.body.append(box);}
   const sec=document.createElement('section'),title=document.createElement('div');title.textContent=sprite;title.style.marginBottom='4px';sec.append(title,c);document.getElementById('vues').append(sec);
  }
  return reports;
 });
 await page.screenshot({path:join(dest,'ensemble-rendu.png')});
 await page.locator('#sprite-natif').screenshot({path:join(dest,'moisissure-native.png')});
 await page.locator('section').filter({hasText:'moisissure'}).screenshot({path:join(dest,'moisissure-rendu.png')});
 await writeFile(join(dest,'controle-pixels.json'),JSON.stringify(reports,null,2));
 if(process.env.PIXELS_STRICT==='1'&&reports.find(r=>r.sprite==='moisissure').agrandissementDansLaScene!==reports.find(r=>r.sprite==='inspecteur').agrandissementDansLaScene)throw Error('Les pixels de la moisissure et de l’inspecteur diffèrent à une case');
 if(process.env.PIXELS_STRICT==='1'&&reports.some(r=>r.pixelsAvecSousDetails>0))throw Error('Des pixels natifs contiennent encore plusieurs couleurs de rendu');
}finally{await browser.close();server.close();}
