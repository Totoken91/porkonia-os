/** Assemblage pur des plans de campagne. Aucun tirage, aucune mutation du pack. */
import type { EtageDonjonDef } from '@/content/types';
import type { Carte } from './logic';
export function assemblerEtage(def:EtageDonjonDef):Carte {
  const {w,h}=def,cases=Array<number>(w*h).fill(1),zones=Array<number>(w*h).fill(0);
  const ouvrir=(x:number,y:number,theme=0)=>{
    if(x<1||y<1||x>=w-1||y>=h-1)throw new Error('Plan de campagne hors limites');
    cases[y*w+x]=0;if(theme)zones[y*w+x]=theme;
  };
  for(const s of def.salles)for(let y=s.y;y<s.y+s.h;y++)for(let x=s.x;x<s.x+s.w;x++)ouvrir(x,y,s.theme);
  for(const chemin of def.passages)for(let n=1;n<chemin.length;n++){
    const [ax,ay]=chemin[n-1]!,[bx,by]=chemin[n]!;
    if(ax!==bx&&ay!==by)throw new Error('Passage diagonal dans le plan');
    const pas=Math.max(Math.abs(bx-ax),Math.abs(by-ay));
    for(let k=0;k<=pas;k++)ouvrir(ax+Math.sign(bx-ax)*k,ay+Math.sign(by-ay)*k);
  }
  for(const [x,y]of def.piliers){cases[y*w+x]=1;zones[y*w+x]=0;}
  cases[def.sortie.y*w+def.sortie.x]=2;
  return {w,h,cases,zones,vu:Array(w*h).fill(false),decor:Array(w*h).fill(0)};
}
