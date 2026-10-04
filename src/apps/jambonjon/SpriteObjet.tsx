const ARMES = new Set(['couteau','os','tranchoir','crochet','louche','hachoir']);
const ARMURES = new Set(['tablier','gilet','couennes','manteau']);
export function SpriteObjet({ base, equipe = false }: { base: string; equipe?: boolean }) {
  const hauteur = ARMES.has(base) ? 48 : ARMURES.has(base) ? 40 : 24;
  const largeur = ARMES.has(base) || ARMURES.has(base) || ['charlotte','bob','casque','couronne'].includes(base) ? 32 : 24;
  const facteur = equipe && !['decapsuleur','pork-id','nappe','appeau'].includes(base) ? 2 : 1;
  return <img className="jbj-sprite-objet" src={`/ordre-cochon/items/${base}.png`} alt="" draggable={false} width={largeur*facteur} height={hauteur*facteur} style={{width:largeur*facteur,height:hauteur*facteur,imageRendering:'pixelated'}}/>;
}
