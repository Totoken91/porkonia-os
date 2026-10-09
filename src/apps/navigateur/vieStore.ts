"use client";
import {useSyncExternalStore} from 'react';
import {relireVie,vide,type VieLocale} from './vie-locale';
import {cle as cleStockage} from '@/os/stockage';
const etats=new Map<string,VieLocale>();
const abonnes=new Set<()=>void>();
const initial=vide();
const cle=(u:string)=>cleStockage('vieLocale',{profil:u});
function lire(u:string):VieLocale {
  if(!etats.has(u)) {
    let v=vide();
    try {v=relireVie(JSON.parse(localStorage.getItem(cle(u))??'null'));}catch{/* poste sans stockage */}
    etats.set(u,v);
  }
  return etats.get(u)!;
}
export function modifierVie(u:string,op:(v:VieLocale)=>VieLocale) {
  const avant=lire(u),v=op(avant);
  if(v===avant)return;
  etats.set(u,v);
  try{localStorage.setItem(cle(u),JSON.stringify(v));}catch{/* conservé pour la session */}
  for(const f of abonnes)f();
}
const abonner=(f:()=>void)=>{abonnes.add(f);return()=>void abonnes.delete(f);};
export const useVie=(u:string)=>useSyncExternalStore(abonner,()=>lire(u),()=>initial);
