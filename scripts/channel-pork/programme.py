"""Programme du pack (slides et sous-titres au format porkos.ts) depuis le JSON d'un mixage de jeu télévisé.
Usage : python3 programme.py sortie/ftg-ep1.json [titre du bandeau]. Coller la sortie dans le programme ftg-N du pack."""
import json,sys
d=json.load(open(sys.argv[1]))
P=d['plans'];ev=d['evenements'];D=d['duree']
TITRE=sys.argv[2] if len(sys.argv)>2 else "FERME TA GUEULE ET RÉPONDS · Épisode 1"
NOMS=["FRÉDÉRIC","KEVIN","MARTIN","TONIO"]
cuts=[];score=None;cur=None
for e in ev:
    if 'score' in e:
        score=e['score'];cuts.append([e['t'],cur,score]);continue
    if e['plan']!=cur:
        cur=e['plan'];cuts.append([e['t'],cur,score])
# fusionne les coupes au même instant
out=[]
for c in cuts:
    if out and abs(out[-1][0]-c[0])<0.01: out[-1]=c
    else: out.append(c)
js=lambda s: json.dumps(s,ensure_ascii=False)
L=[]
for i,(t,plan,sc) in enumerate(out):
    fin=out[i+1][0] if i+1<len(out) else D
    p=P[plan];sec=round(fin-t,2)
    parts=[]
    if 'chemin' in p:
        parts=[f"image: `${{T}}{p['chemin']}`",f"seconds: {sec}",f"fond: {js(p['fond'])}"]
    elif plan=='logo':
        parts=[f"image: `${{T}}ftg/logo.png`",f"seconds: {sec}",f"fond: {js(p['fond'])}"]
    else:
        parts=[f"image: `${{T}}ftg/{p['image']}.jpg`",f"seconds: {sec}"]
        if p.get('zoom'): parts.append(f"zoom: {p['zoom']}")
        parts.append(f"focus: [{p['focus'][0]}, {p['focus'][1]}]")
        ch=TITRE if sc is None else " · ".join(f"{n} {s}" for n,s in zip(NOMS,sc))
        parts.append(f"chyron: {js(ch)}")
    L.append("        { "+", ".join(parts)+" },")
S=[]
for e in ev:
    if 'texte' in e: S.append(f"        {{ at: {e['t']}, dur: {e['dur']}, text: {js(e['texte'])} }},")
print("\n".join(L));print("----");print("\n".join(S))
