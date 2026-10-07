"use client";
import {useEffect,useId,useState} from 'react';
import {useOs} from '@/os/context';
import {useCompte} from '@/os/banqueStore';
import {useCave} from '@/os/biereStore';
import {useGardeManger} from '@/os/saucissonStore';
import {jourLocal} from '@/os/banque';
import {annoncesPigNet,lettresPigNet,categoriesAnnonces,signesPorcins,predictionsPorcines,reponsesRedaction,rubriquesVivantes} from '@/content/packs/pignet-vivant';
import {indiceHoroscope,publier} from './vie-locale';
import {modifierVie,useVie} from './vieStore';

export function CoinCitoyens({go}:{go(u:string):void}) {
  const {str}=useOs();
  return <section className="cadre coin-citoyens"><h3>{str('vie.rubriques')}</h3><div>{rubriquesVivantes.map(r=><button key={r.url} onClick={()=>go(r.url)} data-testid={`rubrique-${r.url.split('://')[1]}`}><b>{r.titre}</b><span>{r.detail}</span></button>)}</div></section>;
}
export function NouvellesLocales({go}:{go(u:string):void}) {
  const {user,str,mail,openApp}=useOs(),vie=useVie(user.id),compte=useCompte(user.id),cave=useCave(),garde=useGardeManger();
  const nouvelles:{texte:string;url:string}[]=[];
  if(vie.etage)nouvelles.push({texte:str(vie.victoire?'vie.victoire':'vie.etage',{n:vie.etage}),url:'porko://donjonbon'});
  const colis=cave.enRoute.length+garde.enRoute.length,stock=cave.stock+garde.stock;
  if(colis)nouvelles.push({texte:str('vie.colis',{n:colis}),url:'porko://porkomazon'});
  if(stock)nouvelles.push({texte:str('vie.stock',{n:stock}),url:'porko://porkomazon'});
  if(compte?.historique[0])nouvelles.push({texte:str('vie.banque',{libelle:compte.historique[0].libelle}),url:'porko://banque-porc'});
  const nonLus=mail.boite.messages.filter(m=>m.folder==='reception'&&!m.read).length;
  return <section className="cadre nouvelles-locales" data-testid="nouvelles-locales"><h3>{str('vie.nouvelles')}</h3>{nouvelles.length||nonLus?<ul>{nouvelles.map(n=><li key={n.texte}><button className="lien" onClick={()=>go(n.url)}>{n.texte}</button></li>)}{nonLus>0&&<li><button className="lien" onClick={()=>openApp('mail')}>{str('vie.mail',{n:nonLus})}</button></li>}</ul>:<p>{str('vie.calme')}</p>}</section>;
}
export function VieLocale({mode}:{mode:'annonces'|'courrier'|'horoscope'}) {
  if(mode==='horoscope')return <Horoscope/>;
  return <Publications key={mode} mode={mode}/>;
}
function Publications({mode}:{mode:'annonces'|'courrier'}) {
  const {user,str,mail,openApp}=useOs(),vie=useVie(user.id),ids=useId();
  const [texte,setTexte]=useState(''),[categorie,setCategorie]=useState(categoriesAnnonces[0]!),[filtre,setFiltre]=useState(''),[message,setMessage]=useState('');
  const annonces=mode==='annonces',champ=annonces?'annonces':'lettres';
  const liste=[...vie[champ],...(annonces?annoncesPigNet:lettresPigNet)].filter(p=>!filtre||p.categorie===filtre);
  const envoyer=(e:React.FormEvent)=>{
    e.preventDefault();if(!texte.trim())return;
    modifierVie(user.id,v=>publier(v,champ,texte,user.displayName,annonces?categorie:'',new Date().toLocaleDateString('fr-FR'),crypto.randomUUID()));
    setTexte('');setMessage(str('vie.publie'));
  };
  return <section className="vie-publications" data-testid={`vie-${mode}`}>
    <p className="vie-note">{str('vie.poste')}</p>
    {annonces&&<label>{str('vie.categorie')} <select aria-label={str('vie.categorie')} value={filtre} onChange={e=>setFiltre(e.target.value)}><option value="">{str('vie.tout')}</option>{categoriesAnnonces.map(c=><option key={c}>{c}</option>)}</select></label>}
    <form onSubmit={envoyer} className="vie-form">
      {annonces&&<label>{str('vie.categorie')} <select value={categorie} onChange={e=>setCategorie(e.target.value)}>{categoriesAnnonces.map(c=><option key={c}>{c}</option>)}</select></label>}
      <label htmlFor={`${ids}-texte`}>{str('vie.texte')}</label><textarea id={`${ids}-texte`} required maxLength={400} rows={3} value={texte} onChange={e=>setTexte(e.target.value)} data-testid="vie-texte"/>
      <button className="site-action" disabled={!texte.trim()}>{str(annonces?'vie.publier':'vie.ecrire')}</button><p role="status">{message}</p>
    </form>
    {liste.map(p=><article className="vie-publication" key={p.id}><b>{p.auteur} {p.categorie&&`/ ${p.categorie}`}</b><span>{p.date}</span><p>{p.texte}</p>
      {annonces?<div><button className="site-action" onClick={()=>{const id=mail.brouillon({to:`${p.auteur}@pignet.pork`,subject:str('vie.sujet'),body:str('vie.brouillon',{texte:p.texte})});openApp('mail',{draft:id});}}>{str('vie.repondre')}</button>
      {vie.annonces.some(a=>a.id===p.id)&&<button className="site-lien" onClick={()=>modifierVie(user.id,v=>({...v,annonces:v.annonces.filter(a=>a.id!==p.id)}))}>{str('vie.retirer')}</button>}</div>:
      <blockquote><b>{str('vie.redaction')}</b><p>{reponsesRedaction[indiceHoroscope(0,p.texte,reponsesRedaction.length)]}</p></blockquote>}
    </article>)}
  </section>;
}
function Horoscope() {
  const {user,str}=useOs(),vie=useVie(user.id);
  const [signe,setSigne]=useState(0),[jour,setJour]=useState(()=>jourLocal(new Date())),[message,setMessage]=useState('');
  useEffect(()=>{const t=setInterval(()=>setJour(jourLocal(new Date())),60000);return()=>clearInterval(t);},[]);
  const prediction=predictionsPorcines[indiceHoroscope(signe,jour,predictionsPorcines.length)];
  const entree=`${jour} / ${signesPorcins[signe]} : ${prediction}`;
  return <section data-testid="vie-horoscope" className="vie-horoscope"><label>{str('vie.signe')} <select value={signe} onChange={e=>{setSigne(Number(e.target.value));setMessage('');}}>{signesPorcins.map((s,i)=><option value={i} key={s}>{s}</option>)}</select></label><h2>{signesPorcins[signe]} / {jour}</h2><p>{prediction}</p>
    <button className="site-action" disabled={vie.favoris.includes(entree)} onClick={()=>{modifierVie(user.id,v=>({...v,favoris:[entree,...v.favoris].slice(0,30)}));setMessage(str('vie.garde'));}}>{str('vie.garder')}</button><p role="status">{message}</p>
    {vie.favoris.length>0&&<section><h2>{str('vie.carnet')}</h2><ul>{vie.favoris.map(f=><li key={f}>{f}</li>)}</ul></section>}
  </section>;
}
