import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('react',()=>({useSyncExternalStore:(subscribe:(f:()=>void)=>()=>void,get:()=>unknown)=>{subscribe(()=>{});return get();}}));
import {creerStock} from '../src/os/provisionsStore';
import {activerProfil} from '../src/os/profilActif';
beforeEach(()=>{
  vi.useFakeTimers();vi.setSystemTime(1000);
  const values=new Map<string,string>();
  vi.stubGlobal('window',{localStorage:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)}});
  activerProfil('citoyen');
});
afterEach(()=>{activerProfil(null);vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();});
describe('Stocks de provisions indépendants',()=>{
  it('livre à la bonne échéance et consomme uniquement le produit choisi',()=>{
    const b=creerStock('porkos.biere'),s=creerStock('porkos.saucisson');
    const avisB=vi.fn(),avisS=vi.fn();b.surLivraison(avisB);s.surLivraison(avisS);
    b.useStock();s.useStock();b.commander(6,'drone',10000);s.commander(3,'colis',90000);
    vi.advanceTimersByTime(10000);expect(b.useStock().stock).toBe(6);expect(s.useStock().stock).toBe(0);
    expect(avisB).toHaveBeenCalledExactlyOnceWith(6);expect(avisS).not.toHaveBeenCalled();
    vi.advanceTimersByTime(80000);expect(s.useStock().stock).toBe(3);s.prendre();
    expect(s.useStock().stock).toBe(2);expect(b.useStock().stock).toBe(6);expect(avisS).toHaveBeenCalledExactlyOnceWith(3);
  });
  it('retrouve les stocks et livre une commande arrivée pendant une absence',()=>{
    window.localStorage.setItem('porkos.biere.citoyen',JSON.stringify({stock:4,enRoute:[],prochainId:9}));
    const s=creerStock('porkos.saucisson');s.commander(3,'drone',10000);
    vi.advanceTimersByTime(15000);
    const relu=creerStock('porkos.saucisson');expect(relu.useStock().stock).toBe(3);expect(relu.useStock().enRoute).toHaveLength(0);
    relu.prendre();expect(creerStock('porkos.saucisson').useStock().stock).toBe(2);
    expect(creerStock('porkos.biere').useStock()).toEqual({stock:4,enRoute:[],prochainId:9});
  });
  it('refuse une commande invalide et un stock vide sans les modifier',()=>{
    const s=creerStock('porkos.saucisson');expect(s.commander(-1,'drone',10000)).toBe(false);expect(s.prendre()).toBe(false);
    expect(s.useStock().stock).toBe(0);expect(s.useStock().enRoute).toHaveLength(0);
  });
});
