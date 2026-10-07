"use client";
/** Comptes locaux : création, choix du profil et vérification du mot de passe. */
import {useEffect,useRef,useState} from 'react';
import type {ContentPack,UserProfile} from '@/content/types';
import {makeStr} from '@/os/context';
import {aHeritage,chargerComptes,creerCompte,profilDuCompte,verifierCompte,CLE_COMPTES,CLE_SELECTION,type CompteLocal} from '@/os/comptes';
import type {Fond} from '@/os/settings';
import {Icon} from './Icon';
import {Wallpaper} from './Wallpaper';

export function Login({pack,fond,onLogin}:{pack:ContentPack;fond:Fond;onLogin(user:UserProfile):void}) {
  const str=makeStr(pack);
  const [comptes,setComptes]=useState<CompteLocal[]>([]),[selection,setSelection]=useState(''),[creation,setCreation]=useState(false),[pret,setPret]=useState(false);
  const [nom,setNom]=useState(''),[pw,setPw]=useState(''),[confirmation,setConfirmation]=useState('');
  const [heritage,setHeritage]=useState(false),[recuperer,setRecuperer]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const actif=useRef(true),verrou=useRef(false);
  useEffect(()=>{
    actif.current=true;
    const c=chargerComptes();setComptes(c);setCreation(!c.length);setHeritage(!c.length&&aHeritage(pack.id));
    let dernier='';try{dernier=localStorage.getItem(CLE_SELECTION)??'';}catch{/* premier profil */}
    setSelection(c.find(p=>p.id===dernier)?.id??c[0]?.id??'');setPret(true);
    const relire=(e:StorageEvent)=>{if(e.key!==CLE_COMPTES)return;const c=chargerComptes();setComptes(c);setSelection(id=>c.some(p=>p.id===id)?id:c[0]?.id??'');};
    window.addEventListener('storage',relire);
    return()=>{actif.current=false;window.removeEventListener('storage',relire);};
  },[pack.id]);
  const choisir=(id:string)=>{setSelection(id);setPw('');setMessage('');try{localStorage.setItem(CLE_SELECTION,id);}catch{/* sélection en mémoire */}};
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();if(verrou.current||!pret)return;verrou.current=true;setBusy(true);setMessage('');
    try {
      if(creation){
        const r=await creerCompte(nom,pw,confirmation,pack.id,heritage&&recuperer);
        if(!actif.current)return;
        if(typeof r==='string'){setMessage(str(`compte.erreur.${r}`));return;}
        setComptes(chargerComptes());choisir(r.id);setCreation(false);setNom('');setConfirmation('');setHeritage(false);setMessage(str('compte.cree'));
      }else{
        const c=chargerComptes().find(c=>c.id===selection);
        if(!pw.trim()){setMessage(pack.login.emptyPassword);return;}
        if(!c||!await verifierCompte(c,pw)){if(actif.current)setMessage(pack.login.wrongPassword);return;}
        if(actif.current){try{localStorage.setItem(CLE_SELECTION,c.id);}catch{/* poste sans stockage */}onLogin(profilDuCompte(c,pack));}
      }
    }catch{if(actif.current)setMessage(str('compte.erreur.stockage'));}
    finally{verrou.current=false;if(actif.current)setBusy(false);}
  };
  return <div className="connexion" data-testid="login"><Wallpaper pack={pack} fond={fond}/>
    <form className="pk-window focused connexion-fenetre comptes-fenetre" onSubmit={submit}>
      <div className="pk-titlebar"><Icon name="cadenas" size={16}/><h2>{str(creation?'compte.creation':'login.titre')}</h2></div>
      <div className="connexion-bandeau"><img src="/brand/embleme-64.png" alt="" width={48} height={48}/><div><b>{pack.os.name}</b> <span>{pack.os.edition}</span><small>{pack.os.vendor}</small></div></div>
      <div className="connexion-corps"><p className="invite">{str(creation?'compte.bienvenue':'compte.choisir')}</p>
        {!creation&&<div className="connexion-profils" aria-label={str('compte.profils')}>{comptes.map(c=><button type="button" key={c.id} className="user-tile" disabled={busy} aria-pressed={c.id===selection} onClick={()=>choisir(c.id)} data-testid={`login-profil-${c.id}`}><Icon name="carte" size={32}/><span><b>{c.nom}</b><br/>{str('compte.profil')}</span></button>)}</div>}
        {creation&&<label className="champ"><span>{str('compte.nom')}</span><input className="pk-input" value={nom} onChange={e=>setNom(e.target.value)} maxLength={32} disabled={busy} data-testid="compte-nom" autoComplete="username" autoFocus/></label>}
        <label className="champ"><span>{str('login.motdepasse')}</span><input className="pk-input" type="password" value={pw} onChange={e=>setPw(e.target.value)} disabled={busy} data-testid="login-password" maxLength={128} autoComplete={creation?'new-password':'current-password'}/></label>
        {creation&&<label className="champ"><span>{str('compte.confirmer')}</span><input className="pk-input" type="password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy} data-testid="compte-confirmation" maxLength={128} autoComplete="new-password"/></label>}
        {creation&&heritage&&<label className="case-a-cocher compte-heritage"><input type="checkbox" checked={recuperer} onChange={e=>setRecuperer(e.target.checked)} disabled={busy} data-testid="compte-heritage"/>{str('compte.heritage')}</label>}
        <p className="compte-local">{str('compte.local')}</p>
        {message&&<p className="retour" role="status" data-testid="login-message">{message}</p>}
        <div className="actions"><button type="submit" className="pk-btn primary" disabled={!pret||busy||(!creation&&!selection)} data-testid={creation?'compte-creer':'login-submit'}>{str(busy?'compte.attendre':creation?'compte.creer':'login.valider')}</button>
          <button type="button" className="pk-btn" disabled={busy||(creation&&!comptes.length)} data-testid="compte-basculer" onClick={()=>{setCreation(!creation);setPw('');setConfirmation('');setMessage('');}}>{str(creation?'compte.retour':'compte.nouveau')}</button></div>
      </div>
    </form>
  </div>;
}
