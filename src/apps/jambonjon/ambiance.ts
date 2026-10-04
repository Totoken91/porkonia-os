/** Décor visuel déterministe. N'ajoute ni collision, ni butin, ni tirage au moteur. */
import { MUR, type Carte } from './logic';

export const CHAMP_HORIZONTAL = 85 * Math.PI / 180;
export const PLAN_CAMERA = Math.tan(CHAMP_HORIZONTAL / 2);
export const focale = (largeur: number) => largeur / (2 * PLAN_CAMERA);
export interface Ambiance { murs: Uint8Array; lumiere: Float32Array; torches: number[]; passages: {x:number;y:number;axe:'x'|'y'}[] }
const cache = new WeakMap<number[], Ambiance>();

export function composerAmbiance(c: Carte): Ambiance {
  const precedente = cache.get(c.cases);
  if (precedente) return precedente;
  const murs = new Uint8Array(c.cases.length), lumiere = new Float32Array(c.cases.length), torches: number[] = [];
  const passages: Ambiance['passages']=[];
  const sol = (x: number, y: number) => x >= 0 && y >= 0 && x < c.w && y < c.h && c.cases[y*c.w+x] !== MUR;
  // Regrouper le décor des salles : saloir, réserve, humidité ou pierre nue.
  // Un même volume reçoit un thème ; les croisements étroits restent des couloirs.
  const coeurs=new Set<number>(), zones=c.zones?Uint8Array.from(c.zones):new Uint8Array(c.cases.length);
  for(let y=1;y<c.h-1;y++)for(let x=1;x<c.w-1;x++) {
    let salle=true;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) if(!sol(x+dx,y+dy))salle=false;
    if(salle&&!c.zones)coeurs.add(y*c.w+x);
  }
  while(coeurs.size) {
    const premier=coeurs.values().next().value!, file=[premier], theme=(premier%c.w*5+Math.floor(premier/c.w)*7)%4;
    coeurs.delete(premier);
    for(let n=0;n<file.length;n++) {
      const i=file[n]!, x=i%c.w,y=Math.floor(i/c.w);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)zones[(y+dy)*c.w+x+dx]=theme+1;
      for(const voisin of [i-1,i+1,i-c.w,i+c.w])if(coeurs.delete(voisin))file.push(voisin);
    }
  }
  for (let y=0; y<c.h; y++) for(let x=0; x<c.w; x++) {
    const i=y*c.w+x;
    if(sol(x,y)) {
      const axe = !sol(x-1,y)&&!sol(x+1,y)&&sol(x,y-1)&&sol(x,y+1) ? 'y' : !sol(x,y-1)&&!sol(x,y+1)&&sol(x-1,y)&&sol(x+1,y) ? 'x' : null;
      const salle=sol(x-1,y-1)||sol(x+1,y-1)||sol(x-1,y+1)||sol(x+1,y+1);
      if(axe && (salle||(x*3+y*5)%11===0) && !passages.some((p)=>Math.abs(p.x-x)+Math.abs(p.y-y)<3)) passages.push({x,y,axe});
    }
    if(c.cases[i]!==MUR) continue;
    const expose = sol(x-1,y)||sol(x+1,y)||sol(x,y-1)||sol(x,y+1);
    if(!expose) continue;
    const graine = (x*11+y*17) % 29;
    let theme=0;
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(sol(x+dx!,y+dy!))theme=Math.max(theme,zones[(y+dy!)*c.w+x+dx!]!);
    // Pilastres aux passages d'une case entre deux volumes plus larges.
    const seuil = (sol(x-1,y)&&!sol(x+1,y)&&sol(x-1,y-1)&&sol(x-1,y+1)) || (sol(x+1,y)&&!sol(x-1,y)&&sol(x+1,y-1)&&sol(x+1,y+1));
    murs[i] = graine===0 ? 4 : seuil && graine%3===0 ? 7 : graine===3 ? 3 : graine===9 ? 6 : graine%5===0 ? 5 : c.decor[i]===1 ? 1 : c.decor[i]===2 ? 2 : [0,8,9][graine%3]!;
    if(murs[i]!==4&&murs[i]!==7&&murs[i]!==3&&murs[i]!==6) {
      if(theme===1)murs[i]=graine%3===0?1:[0,8,9][graine%3]!;
      if(theme===2)murs[i]=graine%3===0?2:[0,8,9][graine%3]!;
      if(theme===3)murs[i]=graine%2===0?5:[0,8,9][graine%3]!;
      if(theme===4)murs[i]=[0,8,9][graine%3]!;
    }
    if(murs[i]===4) torches.push(i);
  }
  // Une applique accueille chaque passage : le décor guide le joueur plutôt que de tapisser le labyrinthe.
  for(const p of passages) {
    const i=p.axe==='y' ? p.y*c.w+p.x-1 : (p.y-1)*c.w+p.x;
    if(!torches.includes(i)) torches.push(i);
    murs[i]=4;
  }
  // Diffusion limitée par les murs : aucune source n'éclaire la pièce d'à côté à travers la pierre.
  if(c.coinRepos) {
    const foyer=c.coinRepos.x;
    for(let x=foyer-2;x<=foyer+2;x++)murs[x]=0;
    murs[foyer]=10;
    if(!torches.includes(foyer))torches.push(foyer);
  }
  for(const source of torches) {
    const sx=source%c.w, sy=Math.floor(source/c.w), queue: [number,number,number][]=[];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(sol(sx+dx!,sy+dy!)) queue.push([sx+dx!,sy+dy!,0]);
    const vus=new Set<number>();
    for(let n=0;n<queue.length;n++) {
      const [x,y,d]=queue[n]!, i=y*c.w+x;
      if(vus.has(i)) continue; vus.add(i);
      lumiere[i]=Math.min(1,lumiere[i]!+Math.max(0,1-d/5));
      if(d<4) for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(sol(x+dx!,y+dy!)) queue.push([x+dx!,y+dy!,d+1]);
    }
  }
  // Les faces de pierre empruntent la lumière de leurs cases voisines.
  for(let y=0;y<c.h;y++) for(let x=0;x<c.w;x++) if(c.cases[y*c.w+x]===MUR) {
    let valeur=0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if(sol(x+dx!,y+dy!)) valeur=Math.max(valeur,lumiere[(y+dy!)*c.w+x+dx!]!);
    lumiere[y*c.w+x]=valeur;
  }
  const resultat={murs,lumiere,torches,passages}; cache.set(c.cases,resultat); return resultat;
}

export function lumiereEn(c: Carte, a: Ambiance, x: number,y: number) {
  const ix=Math.floor(x-.5), iy=Math.floor(y-.5), fx=x-.5-ix, fy=y-.5-iy;
  const v=(dx:number,dy:number) => ix+dx<0||iy+dy<0||ix+dx>=c.w||iy+dy>=c.h ? 0 : a.lumiere[(iy+dy)*c.w+ix+dx]!;
  return (v(0,0)*(1-fx)+v(1,0)*fx)*(1-fy)+(v(0,1)*(1-fx)+v(1,1)*fx)*fy;
}
