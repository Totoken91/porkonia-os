import { describe, expect, it } from 'vitest';
import { GRILLES_MONSTRES, GRILLES_OBJETS, GRILLES_MOBILIER, coteSprite, pasPixelMonde } from '../src/apps/jambonjon/grille-pixels';
import { PIXELS_GARDIENS } from '../src/apps/jambonjon/gardiens-pixels';
import { PIXELS_OBJETS_SOL } from '../src/apps/jambonjon/objets-sol-pixels';
import { dessinerImpacts } from '../src/apps/jambonjon/effets-combat';
import { focale } from '../src/apps/jambonjon/ambiance';

describe('Grilles du monde', () => {
  const grilles = [...Object.values(GRILLES_MONSTRES), ...Object.values(GRILLES_OBJETS), ...Object.values(GRILLES_MOBILIER)];
  it('donne la même taille de pixel aux petites créatures, boss et objets proches', () => {
    for (const distance of [.5, 1, 1.5, 2, 3, 4]) {
      const facteurs = grilles.map(n => coteSprite(n, focale(320), distance) / n);
      expect(new Set(facteurs).size).toBe(1);
      expect(facteurs[0]).toBe(pasPixelMonde(focale(320), distance));
    }
  });
  it('garde le rat plus petit que la moisissure et les boss plus grands que les humains', () => {
    const taille = (n: number) => coteSprite(n, focale(320), 1);
    expect(taille(GRILLES_MONSTRES.rat)).toBeLessThan(taille(GRILLES_MONSTRES.moisissure));
    expect(taille(GRILLES_MONSTRES.moisissure)).toBeLessThan(taille(GRILLES_MONSTRES.gobelin));
    expect(taille(GRILLES_MONSTRES.prevot)).toBeGreaterThan(taille(GRILLES_MONSTRES.inspecteur));
    expect(taille(GRILLES_MONSTRES.affineur)).toBeGreaterThan(taille(GRILLES_MONSTRES.prevot));
  });
  it('réduit les sprites très lointains sans perdre les objets les plus petits', () => {
    for (const n of grilles) {
      const cote = coteSprite(n, focale(320), 8);
      expect(cote).toBeGreaterThanOrEqual(1);
      expect(cote).toBeLessThan(n);
      expect(Number.isInteger(cote)).toBe(true);
    }
  });
  it('conserve des matrices carrées complètes pour les gardiens et le butin', () => {
    for (const [id, rows] of Object.entries(PIXELS_GARDIENS)) {
      const n = GRILLES_MONSTRES[id as keyof typeof GRILLES_MONSTRES];
      expect(rows).toHaveLength(n);
      expect(rows.every(row => row.length === n)).toBe(true);
    }
    for (const [id, rows] of Object.entries(PIXELS_OBJETS_SOL)) {
      const n = GRILLES_OBJETS[id as keyof typeof GRILLES_OBJETS];
      expect(rows).toHaveLength(n);
      expect(rows.every(row => row.length === n)).toBe(true);
    }
  });
  it('dessine les particules par cellules entières sans sous-détails sur fond uniforme', () => {
    const out = { width: 320, height: 180, data: new Uint8ClampedArray(320 * 180 * 4) } as ImageData;
    const profondeur = new Float32Array(320 * 180).fill(Infinity);
    dessinerImpacts(out, { x: .5, y: .5, angle: 0, bob: 0, secousse: 0 }, 180,
      [{ uid: 1, x: 1.5, y: .5, degats: 12, mort: false, style: 'explosion', debut: 0 }], profondeur);
    const pas = pasPixelMonde(focale(320), 1);
    let cellulesVisibles = 0;
    // Sous le point d'impact, aucun chiffre d'interface ne traverse les particules.
    for (let y = 90; y + pas <= 180; y += pas) for (let x = 160 % pas; x + pas <= 320; x += pas) {
      const couleurs = new Set<string>();
      for (let oy = 0; oy < pas; oy++) for (let ox = 0; ox < pas; ox++) {
        const i = ((y + oy) * 320 + x + ox) * 4;
        couleurs.add(Array.from(out.data.slice(i, i + 3)).join(','));
      }
      expect(couleurs.size).toBe(1);
      if (!couleurs.has('0,0,0')) cellulesVisibles++;
    }
    expect(cellulesVisibles).toBeGreaterThan(0);
  });
});
