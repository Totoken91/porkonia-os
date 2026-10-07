/** Logique locale PigNet : aucun contenu utilisateur ne quitte le poste. */
export interface Contribution { id: string; texte: string; auteur: string; date: string; categorie: string }
export interface VieLocale { annonces: Contribution[]; lettres: Contribution[]; favoris: string[]; etage: number; victoire: boolean }
export const vide = (): VieLocale => ({annonces:[],lettres:[],favoris:[],etage:0,victoire:false});
export function relireVie(v: unknown): VieLocale {
  if (!v || typeof v !== 'object') return vide();
  const x=v as Partial<VieLocale>;
  const liste=(v:unknown):Contribution[] => Array.isArray(v)?v.filter((p):p is Contribution=>!!p&&typeof p==='object'&&['id','texte','auteur','date','categorie'].every(k=>typeof p[k]==='string')).slice(0,30):[];
  return {annonces:liste(x.annonces),lettres:liste(x.lettres),favoris:Array.isArray(x.favoris)?x.favoris.filter((s):s is string=>typeof s==='string').slice(0,30):[],etage:Number.isInteger(x.etage)&&x.etage!>=1&&x.etage!<=12?x.etage!:0,victoire:x.victoire===true};
}
export function publier(v:VieLocale, champ:'annonces'|'lettres', texte:string, auteur:string, categorie:string, date:string, id:string):VieLocale {
  const propre=texte.trim().slice(0,400);
  if(!propre)return v;
  return {...v,[champ]:[{id,texte:propre,auteur:auteur.trim().slice(0,40),categorie,date},...v[champ]].slice(0,30)};
}
export function progression(v:VieLocale, etage:number, victoire:boolean):VieLocale {
  if(!Number.isInteger(etage)||etage<1||etage>12)return v;
  if(etage<=v.etage&&(!victoire||v.victoire))return v;
  return {...v,etage:Math.max(etage,v.etage),victoire:v.victoire||victoire};
}
export function indiceHoroscope(signe:number, jour:string, total:number):number {
  return [...jour].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,signe+1)%total;
}
