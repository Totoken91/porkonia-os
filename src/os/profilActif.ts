/** Profil actif de cet onglet. Les magasins du moniteur changent de données à la connexion. */
let actif:string|null=null;
const abonnes=new Set<()=>void>();
export const profilActif=()=>actif;
export const cleProfil=(base:string,id:string)=>`${base}.${id}`;
export function activerProfil(id:string|null) {
  if(id===actif)return;
  actif=id;for(const f of abonnes)f();
}
export function surProfil(f:()=>void) {abonnes.add(f);return()=>void abonnes.delete(f);}
