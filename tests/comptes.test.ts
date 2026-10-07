import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {creerCompte,chargerComptes,verifierCompte,validerCreation,relireComptes,CLE_COMPTES,profilDuCompte} from '../src/os/comptes';
import {activerProfil} from '../src/os/profilActif';
import {commanderBieres,prendreBiere} from '../src/os/biereStore';
import {commanderSaucissons} from '../src/os/saucissonStore';
import {boireVerres,niveauActuel} from '../src/os/ivresseStore';
import {porkosPack} from '../src/content/packs/porkos';
class Memoire implements Storage {
  valeurs=new Map<string,string>();
  get length(){return this.valeurs.size;}
  key(i:number){return [...this.valeurs.keys()][i]??null;}
  getItem(k:string){return this.valeurs.get(k)??null;}
  setItem(k:string,v:string){this.valeurs.set(k,v);}
  removeItem(k:string){this.valeurs.delete(k);}
  clear(){this.valeurs.clear();}
}
const pack=porkosPack.id;
beforeEach(()=>{vi.stubGlobal('localStorage',new Memoire());vi.stubGlobal('window',globalThis);activerProfil(null);});
afterEach(()=>{activerProfil(null);vi.unstubAllGlobals();});
describe('Comptes PorkOS locaux',()=>{
  it('vérifie le vrai mot de passe et ne conserve pas sa valeur en clair',async()=>{
    const c=await creerCompte('Kenny','Douzi de poche','Douzi de poche',pack,false);
    expect(typeof c).toBe('object');if(typeof c==='string')throw Error(c);
    expect(await verifierCompte(c,'Douzi de poche')).toBe(true);
    expect(await verifierCompte(c,'12')).toBe(false);
    expect(await verifierCompte(c,'')).toBe(false);
    expect(localStorage.getItem(CLE_COMPTES)).not.toContain('Douzi de poche');
    expect(chargerComptes()).toEqual([c]);expect(profilDuCompte(c,porkosPack).displayName).toBe('Kenny');
  });
  it('refuse doublons normalisés, confirmation différente et profils corrompus',async()=>{
    const c=await creerCompte('Kenny','12','12',pack,false);if(typeof c==='string')throw Error(c);
    expect(validerCreation([c],' KENNY ','12','12')).toBe('doublon');
    expect(validerCreation([],'Eric','12','13')).toBe('confirmation');
    expect(validerCreation([],'Eric',' ',' ')).toBe('motdepasse');
    expect(relireComptes([{},null,{...c,empreinte:'12'},c,c])).toEqual([c]);
    expect(porkosPack.users.some(u=>u.guest)).toBe(false);
  });
  it('récupère les anciennes données seulement dans le premier profil qui les revendique',async()=>{
    localStorage.setItem('porkos.jambonjon.partie','ancienne partie');
    localStorage.setItem(`porkos.courrier.${pack}`,'ancien courrier');
    localStorage.setItem('porkos.biere',JSON.stringify({stock:2,enRoute:[],prochainId:3}));
    const a=await creerCompte('Kenny','12','12',pack,true);if(typeof a==='string')throw Error(a);
    expect(a.id).toBe('citoyen');expect(localStorage.getItem(`porkos.jambonjon.partie.${a.id}`)).toBe('ancienne partie');
    const b=await creerCompte('Eric','12','12',pack,true);if(typeof b==='string')throw Error(b);
    expect(b.id).not.toBe(a.id);expect(localStorage.getItem(`porkos.courrier.${pack}.${b.id}`)).toBeNull();
    expect(localStorage.getItem('porkos.jambonjon.partie')).toBe('ancienne partie');
  });
  it('ne rattache pas les anciennes données lorsque la récupération est décochée',async()=>{
    localStorage.setItem('porkos.banque.citoyen','ancien compte');
    const a=await creerCompte('Nouveau','12','12',pack,false);if(typeof a==='string')throw Error(a);
    expect(a.id).not.toBe('citoyen');expect(localStorage.getItem(`porkos.banque.${a.id}`)).toBeNull();
  });
  it('isole stocks et ivresse même sans recharger la page',()=>{
    expect(commanderBieres(1,'colis',0)).toBe(false);
    activerProfil('alice');expect(commanderBieres(2,'colis',0)).toBe(true);expect(commanderSaucissons(1,'colis',0)).toBe(true);
    boireVerres(3);expect(niveauActuel()).toBeGreaterThan(2.9);
    activerProfil('bob');expect(niveauActuel()).toBe(0);expect(prendreBiere()).toBe(false);
    expect(commanderBieres(1,'colis',0)).toBe(true);
    activerProfil('alice');expect(niveauActuel()).toBeGreaterThan(2.9);expect(prendreBiere()).toBe(true);
    expect(JSON.parse(localStorage.getItem('porkos.biere.alice')!).stock).toBe(1);
    expect(JSON.parse(localStorage.getItem('porkos.biere.bob')!).enRoute).toHaveLength(1);
    activerProfil(null);expect(niveauActuel()).toBe(0);expect(prendreBiere()).toBe(false);
  });
  it('annule la migration si le stockage ne peut pas conserver le compte',async()=>{
    localStorage.setItem('porkos.biere','ancien stock');
    const original=localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage,'setItem').mockImplementation((k,v)=>{if(k===CLE_COMPTES)throw Error('quota');original(k,v);});
    await expect(creerCompte('Kenny','12','12',pack,true)).rejects.toThrow('quota');
    expect(localStorage.getItem('porkos.biere.citoyen')).toBeNull();expect(localStorage.getItem('porkos.biere')).toBe('ancien stock');
  });
});
