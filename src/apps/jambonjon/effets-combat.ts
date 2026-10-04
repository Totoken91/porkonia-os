/** Effets dessinés sur le framebuffer natif : aucun filtre ni image redimensionnée. */
import { focale } from './ambiance';
import type { Camera } from './rendu';
import type { ImpactVisuel } from './retours-combat';
const CHIFFRES=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
type Couleur=readonly[number,number,number];
const OS:Couleur=[240,216,168],OR:Couleur=[224,168,64],SANG:Couleur=[176,48,32],SEL:Couleur=[184,208,136],BRAISE:Couleur=[240,112,40];
export function dessinerImpacts(out:ImageData,cam:Camera,temps:number,impacts:ImpactVisuel[],profondeur:Float32Array) {
  const W=out.width,H=out.height,f=focale(W),dx=Math.cos(cam.angle),dy=Math.sin(cam.angle);
  for(const effet of impacts) {
    const age=temps-effet.debut;if(age<0||age>950)continue;
    const rx=effet.x-cam.x,ry=effet.y-cam.y,z=rx*dx+ry*dy;
    if(z<.15||z>8)continue;
    const cx=W/2+f*(ry*dx-rx*dy)/z,cy=H/2+cam.bob+cam.secousse;
    if(cx<-40||cx>W+40)continue;
    const rayon=Math.min(40,Math.max(9,f/z*.2)),t=age/500;
    const couleur=effet.style==='sel'?SEL:effet.style==='explosion'?BRAISE:effet.style==='rot'?OR:effet.style==='execution'||effet.style==='saignement'?SANG:OS;
    const pixel=(x:number,y:number,c:Couleur,alpha=1,visible=false)=>{
      x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return;
      if(!visible&&profondeur[y*W+x]!<z-.12)return;
      const i=(y*W+x)*4;for(let k=0;k<3;k++)out.data[i+k]=out.data[i+k]!*(1-alpha)+c[k]!*alpha;
    };
    const trait=(x1:number,y1:number,x2:number,y2:number,c:Couleur,alpha:number)=>{
      const n=Math.ceil(Math.max(Math.abs(x2-x1),Math.abs(y2-y1)));
      for(let k=0;k<=n;k++){const q=n?k/n:0;pixel(x1+(x2-x1)*q,y1+(y2-y1)*q,c,alpha);pixel(x1+(x2-x1)*q,y1+(y2-y1)*q+1,c,alpha);}
    };
    const eclat=(x:number,y:number,c:Couleur,alpha:number,taille=2)=>{
      for(let oy=0;oy<taille;oy++)for(let ox=0;ox<taille;ox++)pixel(x+ox,y+oy,c,alpha);
    };
    const fade=Math.max(0,1-age/500);
    if(fade>0) {
      if(['frappe','double','pas','execution'].includes(effet.style)) {
        const coups=effet.style==='double'?2:1;
        for(let n=0;n<coups;n++){
          const avance=Math.max(0,Math.min(1,(age-n*85)/150));if(age<n*85)continue;
          const sens=n?-1:1;
          trait(cx-rayon*sens,cy+rayon*.7,cx-rayon*sens+rayon*2*sens*avance,cy+rayon*.7-rayon*1.4*avance,couleur,fade);
          if(effet.style==='execution')trait(cx-rayon,cy-rayon*.7,cx+rayon*avance*2,cy-rayon*.7+rayon*avance*1.4,SANG,fade);
        }
      } else if(effet.style==='garde') {
        const r=rayon*(.7+Math.min(t,1)*.5),points=[[cx-r,cy-r],[cx+r,cy-r],[cx+r*.8,cy+r*.4],[cx,cy+r],[cx-r*.8,cy+r*.4]];
        for(let n=0;n<points.length;n++){const a=points[n]!,b=points[(n+1)%points.length]!;trait(a[0]!,a[1]!,b[0]!,b[1]!,OR,fade);}
        trait(cx,cy-r*.6,cx,cy+r*.5,OS,fade);
      } else if(effet.style!=='saignement') {
        const r=rayon*(.3+Math.min(1,t)*1.6);
        for(let k=0;k<28;k++){
          const angle=k*Math.PI*2/28;
          if(effet.style==='rot'&&k%3===0)continue;
          if(effet.style==='revers'&&k>21)continue;
          const x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r*.72;
          eclat(x,y,couleur,fade,effet.style==='explosion'?3:2);
          if(effet.style==='butoir')trait(cx+Math.cos(angle)*r*.55,cy+Math.sin(angle)*r*.72*.55,x,y,OR,fade);
          if(effet.style==='explosion'){
            eclat(cx+Math.cos(angle)*r*.65,cy+Math.sin(angle)*r*.72*.65,OR,fade);
            if(k%3===0)trait(x,y,cx+Math.cos(angle)*r*1.35,cy+Math.sin(angle)*r*.72*1.35,BRAISE,fade);
          }
          if(effet.style==='rot')pixel(cx+Math.cos(angle)*r*.6,cy+Math.sin(angle)*r*.5+rayon*.3,SEL,fade);
        }
        if(effet.style==='sel')for(let k=0;k<12;k++)pixel(cx+Math.sin(k*4.1)*rayon,cy+Math.cos(k*2.7)*rayon-age*.028,SEL,fade);
        if(effet.style==='rot'&&age<260)for(let n=0;n<24;n++){
          const q=n/24,y=cy+rayon*.5+(H-cy-rayon*.5)*q,x=cx+Math.sin(n*2.4+age*.035)*(rayon*.05+q*rayon*.8);
          eclat(x,y,n%3===0?SEL:OR,fade*.75,2+Math.floor(q*3));
        }
      }
      for(let k=0;k<(effet.mort?24:10);k++){
        const a=k*2.399+effet.uid*.3,r=rayon*(.1+t)*(1+(k%3)*.3);
        const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r+age*age*.000035;
        eclat(x,y,effet.mort?SANG:couleur,fade,effet.mort?3:2);
      }
    }
    // Chiffres natifs 3×5 à contour sombre, lisibles au-dessus du point d'impact.
    const texte=String(effet.degats),echelle=2;
    const ox=Math.round(cx-texte.length*4*echelle/2),oy=Math.round(cy-rayon-8-Math.min(24,age*.025));
    const alpha=Math.min(1,(950-age)/220);
    const chiffres:[number,number][]=[];
    if(cx>=0&&cx<W&&profondeur[Math.max(0,Math.min(H-1,Math.round(cy)))*W+Math.min(W-1,Math.round(cx))]!>=z-.12)
      for(let n=0;n<texte.length;n++)for(let y=0;y<5;y++)for(let x=0;x<3;x++)if(CHIFFRES[Number(texte[n])]![y*3+x]==='1')
        for(let sy=0;sy<echelle;sy++)for(let sx=0;sx<echelle;sx++) {
          const px=ox+(n*4+x)*echelle+sx,py=oy+y*echelle+sy;
          chiffres.push([px,py]);
        }
    for(const [px,py]of chiffres){pixel(px-1,py,[24,16,8],alpha,true);pixel(px+1,py,[24,16,8],alpha,true);pixel(px,py-1,[24,16,8],alpha,true);pixel(px,py+1,[24,16,8],alpha,true);}
    for(const [px,py]of chiffres)pixel(px,py,effet.mort?OR:OS,alpha,true);
  }
}
