/** Aperçu reproductible des compétences : véritables états avant/après le moteur. */
import {build} from 'esbuild';
import {mkdir,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,join} from 'node:path';
import {chromium} from 'playwright';
const racine=resolve('.'),inter=join(racine,'.next/apercu-combat'),sortie=resolve(process.argv[2]);
await mkdir(inter,{recursive:true});await mkdir(sortie,{recursive:true});
await build({stdin:{contents:`export {rendre,LARGEUR,HAUTEUR} from './rendu';export {nouvellePartie,jouer} from './logic';export {impactsCombat} from './retours-combat';export {porkosPack} from '../../content/packs/porkos';`,resolveDir:join(racine,'src/apps/jambonjon'),loader:'ts'},bundle:true,format:'esm',platform:'browser',tsconfig:join(racine,'tsconfig.json'),outfile:join(inter,'jeu.js')});
const serveur=createServer(async(req,res)=>{
  if(req.url==='/'){res.setHeader('content-type','text/html');res.end('<body style="margin:0;background:#211b13;color:#e6d4ad;font:16px monospace"><div id="vues" style="display:flex"></div>');return;}
  try{res.setHeader('content-type','application/javascript');res.end(await readFile(join(inter,'jeu.js')));}catch{res.writeHead(404).end();}
}).listen(0,'127.0.0.1');await new Promise(ok=>serveur.once('listening',ok));
const navigateur=await chromium.launch();
try{
  const page=await navigateur.newPage({viewport:{width:960,height:216}});await page.goto(`http://127.0.0.1:${serveur.address().port}`);
  for(const [groupe,id]of [['mage','ysee'],['dps','colin'],['tank','berthe']]){
    await page.evaluate(async id=>{
      const jeu=await import('/jeu.js');window.scenes=[];document.getElementById('vues').replaceChildren();
      for(let slot=0;slot<3;slot++){
        const p=jeu.nouvellePartie(jeu.porkosPack.jambonjon,42,id),w=9;
        p.carte={w,h:w,cases:Array.from({length:w*w},(_,i)=>i<w||i>=w*(w-1)||i%w===0||i%w===w-1?1:0),vu:Array(w*w).fill(true),decor:Array(w*w).fill(0)};
        p.joueur.x=4;p.joueur.y=5;p.joueur.dir=0;p.joueur.niveau=7;p.joueur.mousse=60;p.joueur.pv=90;
        p.joueur.rpg.rangs=[1,1,1,1,0,0];p.joueur.rpg.points=3;
        p.monstres=[{uid:990,type:'inspecteur',niveau:1,elite:false,boss:false,x:4,y:4,pv:slot===2&&id==='colin'?1:150,pvMax:150,att:1,def:1,xp:1,eveille:false,sonne:0}];p.sol=[];
        const a={type:'competence',slot,cote:'droite'},apres=jeu.jouer(p,jeu.porkosPack.jambonjon,a),impacts=jeu.impactsCombat(p,apres,a,1000);
        const cadre=document.createElement('div'),titre=document.createElement('div'),c=document.createElement('canvas');
        titre.textContent=jeu.porkosPack.jambonjon.rpg.competences[p.joueur.rpg.classe][[0,2,3][slot]].nom;
        titre.style.cssText='padding:8px;height:20px;box-sizing:content-box';c.width=320;c.height=180;c.style.imageRendering='pixelated';
        cadre.append(titre,c);document.getElementById('vues').append(cadre);
        window.scenes.push({jeu,apres,impacts,c,cam:{x:4.5,y:5.5,angle:-Math.PI/2,bob:0,secousse:0}});
      }
      window.dessiner=age=>{for(const s of window.scenes){const g=s.c.getContext('2d'),im=g.createImageData(320,180);s.jeu.rendre(im,s.apres,s.cam,{temps:1000+age,touches:age<180?new Set(s.impacts.map(e=>e.uid)):new Set(),eclair:0,eclairCouleur:[0,0,0],spriteDe:()=> 'inspecteur',impacts:s.impacts});g.putImageData(im,0,0);}};
    },id);
    for(let n=0;n<30;n++){
      await page.evaluate(age=>window.dessiner(age),n*40);
      await page.screenshot({path:join(sortie,`${groupe}-${String(n).padStart(2,'0')}.png`)});
    }
  }
}finally{await navigateur.close();serveur.close();}
