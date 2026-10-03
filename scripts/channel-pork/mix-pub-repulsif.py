"""Publicité d'État « Le répulsif à gobelins officiel » (script de l'utilisateur). Bureau de ministère : néon qui
grésille, sifflement de téléviseur cathodique, souffle de micro, bouteilles qui tintent dans le placard. Le
fonctionnaire, sec et proche ; Luis Fontanillas, derrière, dans le placard (étouffé, réverbéré). Orgue bon marché,
trois notes très dignes, au plan produit et à la conclusion. Mastication très audible, que le fonctionnaire laisse
finir. Coupe au noir, dernier bruit de mastication. Voix : voix/pub-repulsif/*.opus. Bruitages CC0 : sons/bruitages/.
Sortie : sortie/pub-repulsif.wav, .mp3 et .json (plans, sous-titres)."""
import json
import os

import numpy as np
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire
from synthe import env, filtre, orgue

DOSSIER = os.path.join(ICI, "voix", "pub-repulsif")


def bruitage(nom, niveau=0.4):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    return x / (np.abs(x).max() + 1e-9) * niveau


def bureau(x, g=1.0):
    """Bureau administratif : réflexions courtes sur murs nus et classeurs métalliques."""
    out = x.copy()
    for d, k in ((0.013, 0.12), (0.024, 0.09), (0.041, 0.06), (0.067, 0.04)):
        out[int(d * SR) :] += filtre(x, "low", 4000)[: len(x) - int(d * SR)] * k * g
    return out


def placard(x):
    """Dans le placard, derrière le fonctionnaire : étouffé, boîte résonante, plus loin."""
    y = filtre(x, "band", [180, 2600])
    out = y.copy()
    for d, k in ((0.004, 0.35), (0.009, 0.25), (0.016, 0.15)):
        out[int(d * SR) :] += y[: len(y) - int(d * SR)] * k
    return bureau(out, 1.6)


def rogner(x):
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.008, e.max() * 0.05))[0]
    return x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]


def voix(nom):
    x = lire(os.path.join(DOSSIER, nom + ".opus"))
    x = rogner(filtre(x, "high", 80))
    x = x / (np.sqrt((x**2).mean()) + 1e-9)
    if nom.startswith("O"):
        x = bureau(np.tanh(x * 0.11 * 1.3) / 1.3, 0.8)  # le fonctionnaire, micro de bureau, très proche
    else:
        niv = {"L1": 0.06, "L4": 0.1, "L5": 0.065, "K1": 0.05}.get(nom, 0.075)
        x = placard(x * niv)
    x = filtre(x, "band", [90, 9000]) * env(len(x), 0.004, 0.03)
    return np.concatenate([x, np.zeros(int(0.06 * SR))])


T = {
    "O1": "Citoyennes, citoyens. Le ministère rappelle que les gobelins n'existent pas. Leur présence dans vos placards ne saurait remettre en cause cette information.",
    "O2": "Pour répondre à vos inquiétudes infondées, l'État vous propose son répulsif à gobelins officiel. Une protection homologuée contre un problème qui ne se pose pas.",
    "O3": "Disponible en aérosol et en recharge solide. Parfum porc braisé. Son efficacité est certifiée contre aucun animal connu.",
    "O4": "La recharge doit être conservée dans un placard fermé, inaccessible aux êtres qui n'existent pas.",
    "L1": "Oh. Des billes molles.",
    "L2": "Elles sont bonnes, vos billes.",
    "O5": "Les bruits de mastication que vous pourriez entendre relèvent du fonctionnement normal du bâtiment.",
    "L3": "Donnez-moi des billes.",
    "O6": "Aucune demande n'a été reçue.",
    "L4": "Donnez-moi des billes.",
    "O7": "Toute demande émanant d'un gobelin est irrecevable, faute de demandeur.",
    "O8": "Le répulsif à gobelins officiel. Efficace contre aucun animal connu.",
    "L5": "Vous en avez à la bière ?",
    "O9": "Si vous voyez un gobelin, merci de regarder ailleurs.",
}

_rng = np.random.default_rng(12)


def mastication(duree, niveau=0.12, bouche=True):
    """Mastication de gobelin : bruits de bouche CC0 enchaînés au hasard, plus les « mmh » bouche pleine de Luis."""
    n = int(duree * SR)
    x = np.zeros(n + SR)
    t = 0.0
    while t < duree:
        nom = f"mastique-0{_rng.integers(1, 5)}" if _rng.random() < 0.7 else f"croque-{_rng.choice([1, 2, 3, 5])}"
        s = bruitage(nom, niveau * _rng.uniform(0.6, 1.0))
        if nom.startswith("croque"):
            s = filtre(s, "low", 3500) * 0.7
        i = int(t * SR)
        x[i : i + len(s)] += s[: len(x) - i]
        t += _rng.uniform(0.22, 0.42)
    if bouche:
        m = lire(os.path.join(DOSSIER, "K2.opus"))
        m = m / (np.abs(m).max() + 1e-9) * niveau * 0.7
        d = _rng.uniform(0, max(0.1, len(m) / SR - duree - 0.1))
        m = m[int(d * SR) : int(d * SR) + n]
        x[: len(m)] += m
    return placard(x[:n] * env(n, 0.05, 0.2))


def jingle():
    """Trois notes très dignes : sol, do, mi grave… et la dernière tenue."""
    return orgue([67, 72, 64], [0.42, 0.42, 1.25]) * 0.2


# Événements : ("v", réplique, écart) · ("x", signal, décalage, avance) · ("s", silence) · ("p", plan) · ("noir", durée)
D = [
    ("p", "01_declaration"),
    ("s", 0.6),
    ("x", placard(bruitage("bouteille-ouvre", 0.06)), 0.0, False),
    ("x", placard(filtre(bruitage("ding-2", 0.03), "low", 3000)), 0.35, False),
    ("v", "O1", 0.2),
    ("x", placard(bruitage("bouteille-ferme", 0.05)), -1.6, False),
    ("s", 1.6),
    ("p", "02_fonctionnaire"),
    ("v", "O2", 0.5),
    ("s", 1.6),  # pause bureaucratique, regard caméra
    ("p", "03_produit"),
    ("v", "O3", 0.5),
    ("x", jingle(), 0.4, True),
    ("p", "04_luis_placard"),
    ("v", "O4", 0.4),
    ("v", "L1", 0.7),
    ("x", placard(bruitage("bouteille-ferme", 0.05)), 0.4, True),  # couvercle posé
    ("s", 1.0),
    ("p", "05_luis_recharge"),
    ("x", mastication(1.4, 0.16), 0.2, True),
    ("v", "L2", 0.0),
    ("v", "O5", 0.6),
    ("x", mastication(4.2, 0.24), 0.3, True),  # le fonctionnaire attend que ça finisse
    ("s", 0.6),
    ("p", "06_billes"),
    ("v", "L3", 0.3),
    ("v", "O6", 0.6),
    ("v", "L4", 0.6),
    ("v", "O7", 0.6),
    ("v", "K1", 0.4),  # claquement de langue agacé
    ("s", 0.8),
    ("p", "07_conclusion"),
    ("x", mastication(2.0, 0.05), 0.0, False),
    ("v", "O8", 0.3),
    ("x", jingle(), 0.3, True),
    ("v", "L5", 0.3),
    ("x", mastication(1.6, 0.04), 0.3, False),
    ("s", 2.0),  # deux secondes ; le fonctionnaire reste immobile
    ("v", "O9", 0.0),
    ("s", 0.5),
    ("noir", 1.8),
]

pistes, sous, plans, t = [], [], [], 0.0
for ev in D:
    k = ev[0]
    if k == "p":
        plans.append([ev[1], round(t, 2)])
    elif k == "v":
        _, nom, ecart = ev
        s = voix(nom)
        t += ecart
        pistes.append((t, s))
        if nom in T:
            sous.append({"at": round(t, 2), "dur": round(len(s) / SR - 0.06, 2), "voix": nom, "text": T[nom]})
        t += len(s) / SR - 0.06
    elif k == "x":
        _, s, ecart, avance = ev
        pistes.append((t + ecart, s))
        if avance:  # sinon le bruitage se pose sans déplacer la suite
            t += ecart + len(s) / SR
    elif k == "s":
        t += ev[1]
    elif k == "noir":
        NOIR = t
        plans.append(["noir", round(t, 2)])
        # Coupe au noir : l'ambiance tombe, il reste un dernier bruit de mastication.
        pistes.append((t + 0.35, mastication(0.9, 0.13, bouche=False)))
        t += ev[1]
DUREE = t
n = int(DUREE * SR)
mix = np.zeros(n + 10 * SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s
mix = mix[:n]

# Ambiance pauvre de bureau d'État : néon qui grésille (100 Hz et harmoniques, papillotement), sifflement de
# téléviseur cathodique (15 734 Hz), frigo-bourdon lointain, souffle de micro. Tout tombe au noir.
tt = np.arange(n) / SR
neon = sum(np.sin(2 * np.pi * 100 * h * tt) / h for h in range(1, 12)) * 0.004
neon *= 1 + 0.5 * (np.sin(2 * np.pi * 0.37 * tt) > 0.97)
neon = filtre(neon, "band", [90, 3000])
crt = np.sin(2 * np.pi * 15734 * tt) * 0.0025
fond = lire(os.path.join(ICI, "sons", "bruitages", "bourdon.opus"))
fond = np.tile(fond, int(n / len(fond)) + 1)[:n]
fond = filtre(fond / (np.abs(fond).max() + 1e-9), "band", [60, 2000]) * 0.012
souffle = filtre(_rng.standard_normal(n), "high", 1800) * 0.003
amb = (neon + crt + fond + souffle) * env(n, 0.3, 0.0)
amb[int(NOIR * SR) :] = 0
mix = mix + amb
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "pub-repulsif.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "pub-repulsif.wav"), os.path.join(SORTIE, "pub-repulsif.mp3"))
json.dump({"duree": round(DUREE, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "pub-repulsif.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(DUREE, 1), plans)
