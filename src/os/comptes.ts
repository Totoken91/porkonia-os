import type {ContentPack,UserProfile} from '@/content/types';
import {cle,clesHeritage,clesHistoriques,PROFIL_HISTORIQUE} from './stockage';
export {clesHeritage};
export interface CompteLocal {id:string;nom:string;creation:string;sel:string;empreinte:string;iterations:number}
export const CLE_COMPTES=cle('comptes');
export const CLE_SELECTION=cle('selection');
const ITERATIONS=210000;
const hex=(v:ArrayBuffer)=>Array.from(new Uint8Array(v),n=>n.toString(16).padStart(2,'0')).join('');
export const nomNormalise=(n:string)=>n.trim().normalize('NFKC').toLocaleLowerCase('fr-FR');
export function relireComptes(v:unknown):CompteLocal[] {
  if(!Array.isArray(v))return [];
  const ids=new Set<string>(),noms=new Set<string>();
  return v.filter((x):x is CompteLocal=>{
    if(!x||typeof x!=='object'||typeof x.id!=='string'||! /^(citoyen|p-[a-f0-9-]{36})$/.test(x.id)||typeof x.nom!=='string'||x.nom.trim().length<2||x.nom.length>32||typeof x.creation!=='string'||!Number.isFinite(Date.parse(x.creation))||typeof x.sel!=='string'||!/^[a-f0-9]{32}$/.test(x.sel)||typeof x.empreinte!=='string'||!/^[a-f0-9]{64}$/.test(x.empreinte)||x.iterations!==ITERATIONS)return false;
    const nom=nomNormalise(x.nom);if(ids.has(x.id)||noms.has(nom))return false;
    ids.add(x.id);noms.add(nom);return true;
  }).slice(0,24);
}
export function chargerComptes():CompteLocal[] {
  try{return relireComptes(JSON.parse(localStorage.getItem(CLE_COMPTES)??'[]'));}catch{return [];}
}
async function empreinte(mdp:string,sel:string,iterations:number) {
  const salt=Uint8Array.from(sel.match(/../g)!,h=>parseInt(h,16));
  const cle=await crypto.subtle.importKey('raw',new TextEncoder().encode(mdp),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'},cle,256));
}
export async function verifierCompte(c:CompteLocal,mdp:string):Promise<boolean> {
  if(!mdp||mdp.length>128)return false;
  const h=await empreinte(mdp,c.sel,c.iterations);
  let diff=0;for(let i=0;i<h.length;i++)diff|=h.charCodeAt(i)^c.empreinte.charCodeAt(i);
  return diff===0;
}
export type ErreurCompte='nom'|'doublon'|'motdepasse'|'confirmation'|'limite';
export function validerCreation(comptes:CompteLocal[],nom:string,mdp:string,confirmation:string):ErreurCompte|null {
  if(nom.trim().length<2||nom.trim().length>32||/[\u0000-\u001f]/.test(nom))return 'nom';
  if(comptes.some(c=>nomNormalise(c.nom)===nomNormalise(nom)))return 'doublon';
  if(mdp.trim().length<2||mdp.length>128)return 'motdepasse';
  if(mdp!==confirmation)return 'confirmation';
  if(comptes.length>=24)return 'limite';
  return null;
}
/** Les données de l'ancienne démo sont copiées une seule fois au profil qui les revendique (voir `stockage.ts`). */
export function aHeritage(packId:string):boolean {
  try {return clesHeritage(packId,localStorage).some(([k])=>localStorage.getItem(k)!==null)||clesHistoriques(packId).some(k=>localStorage.getItem(k)!==null);}catch{return false;}
}
export async function creerCompte(nom:string,mdp:string,confirmation:string,packId:string,recuperer:boolean):Promise<CompteLocal|ErreurCompte> {
  let comptes=chargerComptes();let erreur=validerCreation(comptes,nom,mdp,confirmation);if(erreur)return erreur;
  const sel=hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const h=await empreinte(mdp,sel,ITERATIONS);
  // Relire après le calcul pour tenir compte d'une création faite dans un autre onglet.
  comptes=chargerComptes();erreur=validerCreation(comptes,nom,mdp,confirmation);if(erreur)return erreur;
  const id=!comptes.length&&(recuperer||!aHeritage(packId))?PROFIL_HISTORIQUE:`p-${crypto.randomUUID()}`;
  const c:CompteLocal={id,nom:nom.trim(),creation:new Date().toISOString(),sel,empreinte:h,iterations:ITERATIONS};
  const changements:[string,string][]=[];
  if(!comptes.length&&recuperer)for(const [avant,apres] of clesHeritage(packId,localStorage)){
    const v=localStorage.getItem(avant);if(v!==null&&localStorage.getItem(apres)===null)changements.push([apres,v]);
  }
  changements.push([CLE_COMPTES,JSON.stringify([...comptes,c])]);
  const anciens=changements.map(([k])=>[k,localStorage.getItem(k)] as const);
  try{for(const [k,v] of changements)localStorage.setItem(k,v);}catch(e){for(const [k,v] of anciens){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{/* espace toujours indisponible */}}throw e;}
  return c;
}
export function profilDuCompte(c:CompteLocal,pack:ContentPack):UserProfile {
  const modele=pack.users[0]!;
  return {...modele,id:c.id,displayName:c.nom,caption:pack.strings['compte.profil']!,password:null,passwordHint:'',guest:false,porkId:{...modele.porkId!,numero:`PK-${c.id==='citoyen'?'0012-4471':c.id.slice(2,10).toUpperCase()}`,delivrance:new Date(c.creation).toLocaleDateString('fr-FR')}};
}
