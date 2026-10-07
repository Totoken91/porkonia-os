import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { porkosPack } from '../src/content/packs/porkos';
import { parseUrl } from '../src/apps/navigateur/url';
import { nouveauxSitesPigNet } from '../src/content/packs/pignet';
import {sitesVivants} from '../src/content/packs/pignet-vivant';

describe('PigNet : toutes les pubs conduisent à du contenu utilisable',()=>{
  const hotes=porkosPack.sites.map(s=>s.hote);
  const verifier=(url:string)=>{
    const route=parseUrl(url,hotes);
    expect(route.kind,url).not.toBe('inconnu');
    if(route.kind==='site')expect(porkosPack.sites.find(s=>s.hote===route.hote)?.pages[route.page],url).toBeTruthy();
  };
  it('relie chaque pub et chaque accès direct à une vraie destination et une image présente',()=>{
    for(const pub of porkosPack.portal.bannieres){verifier(pub.url);expect(existsSync(`public${pub.image}`),pub.image).toBe(true);}
    for(const lien of porkosPack.portal.raccourcis)verifier(lien.url);
  });
  it('ne laisse ni sous-page, ni programme, ni image de vitrine orphelin',()=>{
    for(const site of [...nouveauxSitesPigNet,...sitesVivants])for(const page of Object.values(site.pages))for(const b of page.blocs){
      if(b.t==='entete'){b.navigation.forEach(n=>verifier(n.url));}
      if(b.t==='liens')b.liens.forEach(l=>verifier(l.url));
      if(b.t==='programme')expect(porkosPack.installeurs.some(i=>i.programme===b.id)).toBe(true);
      if(b.t==='action'&&b.action.type==='open')expect(porkosPack.apps.some(a=>a.id===(b.action as {app:string}).app)).toBe(true);
    }
  });
});
