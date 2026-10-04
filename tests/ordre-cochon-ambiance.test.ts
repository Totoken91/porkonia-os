import { describe, expect, it } from 'vitest';
import { CHAMP_HORIZONTAL, composerAmbiance, focale, lumiereEn } from '../src/apps/jambonjon/ambiance';
import { genererCarte, MUR, type Carte } from '../src/apps/jambonjon/logic';

describe('Donjon : caméra et décors',()=>{
  it('garde une focale commune aux murs, au sol et aux sprites pour 85°',()=>{
    expect(CHAMP_HORIZONTAL*180/Math.PI).toBeCloseTo(85);
    expect(Math.atan(160/focale(320))*2).toBeCloseTo(CHAMP_HORIZONTAL);
  });
  it('compose sans modifier la carte, la sauvegarde ni le hasard',()=>{
    const hasard={alea:42}, c=genererCarte(hasard,9), avant=JSON.stringify(c), graine=hasard.alea;
    const a=composerAmbiance(c);
    expect(JSON.stringify(c)).toBe(avant);expect(hasard.alea).toBe(graine);
    expect(composerAmbiance({...c,vu:[...c.vu]})).toBe(a);
    expect(a.torches.length).toBeGreaterThan(0);expect(a.passages.length).toBeGreaterThan(0);
    expect(a.torches.every(i=>c.cases[i]===MUR)).toBe(true);
    expect(a.passages.every(p=>c.cases[p.y*c.w+p.x]!==MUR)).toBe(true);
    expect([...a.lumiere].every(n=>Number.isFinite(n)&&n>=0&&n<=1)).toBe(true);
  });
  it('ne diffuse aucune lumière dans un volume entièrement fermé',()=>{
    const c:Carte={w:9,h:9,cases:Array(81).fill(MUR),vu:Array(81).fill(false),decor:Array(81).fill(0)};
    c.cases[2*9+2]=0;
    const a=composerAmbiance(c);
    // Le centre de ce massif n'est voisin d'aucun sol et ne peut recevoir une torche.
    expect(a.lumiere[6*9+6]).toBe(0);
    expect(lumiereEn(c,a,6.5,6.5)).toBe(0);
  });
  it('interpole la lumière sans saut aux limites de cases',()=>{
    const c=genererCarte({alea:42},9),a=composerAmbiance(c);
    expect(Math.abs(lumiereEn(c,a,4.9999,3.5)-lumiereEn(c,a,5.0001,3.5))).toBeLessThan(.001);
    expect(Number.isFinite(lumiereEn(c,a,-50,0))).toBe(true);
  });
  it('regroupe les accessoires par salle plutôt que de mélanger toutes les réserves',()=>{
    const w=15,h=9,c:Carte={w,h,cases:Array(w*h).fill(MUR),vu:Array(w*h).fill(false),decor:Array(w*h).fill(2)};
    for(let y=2;y<=4;y++)for(const debut of [2,9])for(let x=debut;x<debut+3;x++)c.cases[y*w+x]=0;
    for(let x=5;x<=8;x++)c.cases[3*w+x]=0;
    const a=composerAmbiance(c);
    // Le saloir à gauche reçoit des jambons ; la salle de pierre à droite retire les tonneaux hérités.
    expect(a.murs[4*w+1]).toBe(1);
    for(let y=2;y<=4;y++)for(const x of [8,12])expect([1,2]).not.toContain(a.murs[y*w+x]);
  });
});
