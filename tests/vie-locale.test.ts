import {describe,it,expect} from 'vitest';
import {vide,relireVie,publier,progression,indiceHoroscope} from '../src/apps/navigateur/vie-locale';
describe('PigNet vivant',()=>{
  it('refuse les données corrompues et les étages inventés',()=>{
    expect(relireVie(null)).toEqual(vide());
    expect(relireVie({etage:99,annonces:[{},null],favoris:[false,'test']})).toEqual({...vide(),favoris:['test']});
    expect(progression(vide(),13,false)).toEqual(vide());
  });
  it('retient le meilleur étage et une victoire même après une nouvelle partie',()=>{
    const v=progression(vide(),6,false);
    expect(progression(v,2,false)).toBe(v);
    const fin=progression(v,12,true);
    expect(progression(fin,1,false)).toBe(fin);
    expect(relireVie(JSON.parse(JSON.stringify(fin)))).toEqual({...vide(),etage:12,victoire:true});
  });
  it('publie des textes bornés sans toucher aux autres rubriques',()=>{
    expect(publier(vide(),'annonces','   ','a','b','d','id')).toEqual(vide());
    let v=vide();for(let i=0;i<40;i++)v=publier(v,'annonces','x'.repeat(900),'y'.repeat(80),'Échange','d',String(i));
    expect(v.annonces).toHaveLength(30);expect(v.annonces[0]!.texte).toHaveLength(400);expect(v.annonces[0]!.auteur).toHaveLength(40);expect(v.lettres).toEqual([]);
  });
  it('conserve une prédiction stable pour un signe et un jour',()=>{
    expect(indiceHoroscope(2,'2026-10-07',6)).toBe(indiceHoroscope(2,'2026-10-07',6));
    expect(new Set(Array.from({length:12},(_,s)=>indiceHoroscope(s,'2026-10-07',6))).size).toBe(6);
  });
});
