"""Annonce de prévention de l'État « Mangez gras. Bougez plus tard. » (script de l'utilisateur). Voix off douce et
paternaliste, deux courtes répliques en situation (le collègue, le fonctionnaire), conclusion du fonctionnaire face
caméra, mention légale rapide. Musique de campagne rassurante (guitare et petit piano, synthe.campagne), continue,
abaissée sous les deux répliques ; fourchette, verres, ambiance extérieure ; petit accord final ; coupe nette.
Voix : voix/pub-mangez-gras/*.opus. Bruitages CC0 : sons/bruitages/. Sortie : sortie/pub-mangez-gras.wav, .mp3, .json."""
import json
import os

import numpy as np
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire
from synthe import accord_final, campagne, env, filtre

DOSSIER = os.path.join(ICI, "voix", "pub-mangez-gras")
_rng = np.random.default_rng(21)


def bruitage(nom, niveau=0.4):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    return x / (np.abs(x).max() + 1e-9) * niveau


def piece(x, g=1.0):
    """Pièce d'habitation : quelques réflexions courtes et mates."""
    out = x.copy()
    for d, k in ((0.011, 0.1), (0.019, 0.07), (0.033, 0.05)):
        out[int(d * SR) :] += filtre(x, "low", 3500)[: len(x) - int(d * SR)] * k * g
    return out


def rogner(x):
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.008, e.max() * 0.05))[0]
    return x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]


def voix(nom):
    x = lire(os.path.join(DOSSIER, nom + ".opus"), tempo=1.12 if nom == "L1" else 1.0)
    x = rogner(filtre(x, "high", 80))
    x = x / (np.sqrt((x**2).mean()) + 1e-9)
    if nom.startswith("V"):
        x = np.tanh(x * 0.1 * 1.2) / 1.2  # voix off de studio, proche et douce
    elif nom == "L1":
        x = filtre(np.tanh(x * 0.085), "band", [200, 6000])  # mention légale, débitée et un peu serrée
    else:
        x = piece(np.tanh(x * 0.09 * 1.2) / 1.2, 1.0 if nom != "F1" else 0.4)  # en situation
    x = filtre(x, "band", [80, 10000]) * env(len(x), 0.004, 0.03)
    return np.concatenate([x, np.zeros(int(0.06 * SR))])


T = {
    "V1": "Pour votre équilibre alimentaire, pensez à varier les morceaux de cochon.",
    "V2": "Jambon, poitrine, saucisson : chaque partie compte.",
    "V3": "N'attendez pas d'avoir soif pour vous resservir.",
    "V4": "Un proche attentif peut vous aider à maintenir le rythme.",
    "V5": "Chaque déplacement évitable représente une dépense énergétique inutile.",
    "V6": "Faites-vous apporter le saucisson.",
    "C1": "Reste assis. Je suis déjà debout.",
    "V7": "Écoutez votre corps. S'il refuse l'effort, respectez sa décision.",
    "F1": "Vous avez déjà fait deux marches. C'est bien.",
    "V8": "Pratiquez au moins trente minutes d'inactivité après chaque repas.",
    "V9": "Pour vous aider, éloignez la télécommande.",
    "F2": "Mangez du cochon. Buvez des bières. Vous aurez bien le temps de marcher quand il faudra aller en chercher.",
    "L1": "L'abus d'eau peut vous faire oublier de commander une bière.",
}


def verres():
    """Deux verres qui se touchent, une bouteille qu'on ouvre : discret."""
    x = np.zeros(int(1.2 * SR))
    b = filtre(bruitage("bouteille-ouvre", 0.12), "high", 300)
    x[: len(b)] += b[: len(x)]
    for t0, g in ((0.55, 0.05), (0.62, 0.03)):
        d = filtre(bruitage("ding-2", g), "high", 1800)
        i = int(t0 * SR)
        x[i : i + len(d)] += d[: len(x) - i]
    return piece(x)


def oiseaux(duree):
    """Ambiance extérieure de village : vent léger, deux oiseaux, une voiture qui passe au loin."""
    n = int(duree * SR)
    vent = filtre(_rng.standard_normal(n), "band", [150, 900]) * 0.012 * (1 + 0.4 * np.sin(2 * np.pi * 0.2 * np.arange(n) / SR))
    for _ in range(int(duree * 1.4)):
        d = _rng.uniform(0.06, 0.14)
        t = np.arange(int(d * SR)) / SR
        f0 = _rng.uniform(2600, 4200)
        c = np.sin(2 * np.pi * (f0 + _rng.choice([-1, 1]) * 900 * t / d) * t) * env(len(t), 0.006, 0.03)
        for r in range(_rng.integers(1, 4)):
            i = int(_rng.uniform(0, duree - 0.5) * SR) + int(r * 0.16 * SR)
            vent[i : i + len(c)] += c[: n - i] * 0.012
    t = np.arange(n) / SR
    passe = filtre(_rng.standard_normal(n), "band", [80, 500]) * np.exp(-((t - duree * 0.6) ** 2) / 2.0) * 0.02
    return (vent + passe) * env(n, 0.3, 0.3)


# Événements : ("p", plan) · ("v", réplique, écart) · ("x", signal, décalage, avance) · ("s", silence)
#              · ("dehors", durée) · ("fin",)
D = [
    ("p", "01_famille"),
    ("s", 1.0),
    ("v", "V1", 0.0),
    ("s", 0.6),
    ("x", piece(bruitage("fourchette", 0.1)), 0.0, True),  # bruit de fourchette
    ("v", "V2", 0.3),
    ("s", 1.1),
    ("p", "02_biere"),
    ("v", "V3", 0.4),
    ("x", verres(), 0.2, True),
    ("v", "V4", 0.1),
    ("s", 1.2),
    ("p", "03_saucisson"),
    ("v", "V5", 0.4),
    ("s", 0.9),
    ("v", "V6", 0.0),
    ("v", "C1", 0.6),  # le collègue, doucement
    ("s", 1.4),  # le salarié acquiesce, reconnaissant
    ("p", "04_marches"),
    ("dehors", 9.0),
    ("v", "V7", 0.5),
    ("v", "F1", 0.7),
    ("s", 1.4),
    ("p", "05_canape"),
    ("v", "V8", 0.4),
    ("s", 0.7),
    ("v", "V9", 0.0),
    ("s", 1.6),  # il regarde la télécommande et renonce à se pencher
    ("p", "06_fonctionnaire"),
    ("v", "F2", 0.6),
    ("fin",),
]

pistes, sous, plans, baisses, t = [], [], [], [], 0.0
for ev in D:
    k = ev[0]
    if k == "p":
        plans.append([ev[1], round(t, 2)])
    elif k == "v":
        _, nom, ecart = ev
        s = voix(nom)
        t += ecart
        pistes.append((t, s))
        sous.append({"at": round(t, 2), "dur": round(len(s) / SR - 0.06, 2), "voix": nom, "text": T[nom]})
        if nom in ("C1", "F1"):
            baisses.append((t - 0.2, t + len(s) / SR))
        t += len(s) / SR - 0.06
    elif k == "x":
        _, s, ecart, avance = ev
        pistes.append((t + ecart, s))
        if avance:
            t += ecart + len(s) / SR
    elif k == "s":
        t += ev[1]
    elif k == "dehors":
        pistes.append((t, oiseaux(ev[1] + 6)))
    elif k == "fin":
        # Petit accord final, puis la mention légale débitée, puis coupe nette.
        FIN_MUSIQUE = t + 0.3
        pistes.append((FIN_MUSIQUE, accord_final() * 0.3))
        t = FIN_MUSIQUE + 1.4
        s = voix("L1")
        pistes.append((t, s))
        sous.append({"at": round(t, 2), "dur": round(len(s) / SR - 0.06, 2), "voix": "L1", "text": T["L1"]})
        t += len(s) / SR + 0.12
DUREE = t
n = int(DUREE * SR)
mix = np.zeros(n + 10 * SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s
mix = mix[:n]

# Musique continue, abaissée sous les deux courtes répliques, qui s'éteint sur l'accord final.
m = campagne(FIN_MUSIQUE + 0.6) * 0.13
g = np.ones(len(m))
for a, b in baisses:
    g[int(a * SR) : int(b * SR)] = 0.4
g = np.convolve(g, np.ones(int(0.3 * SR)) / int(0.3 * SR), mode="same")
m *= g * env(len(m), 0.3, 0.6)
mix[: len(m)] += m[: n]
# Souffle de pièce discret, sauf dans le plan extérieur.
mix += filtre(_rng.standard_normal(n), "band", [100, 3000]) * 0.0015
mix = mix / np.abs(mix).max() * 0.9
mix[-int(0.004 * SR) :] *= np.linspace(1, 0, int(0.004 * SR))  # coupe nette, sans clic
plans.append(["noir", round(DUREE, 2)])
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "pub-mangez-gras.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "pub-mangez-gras.wav"), os.path.join(SORTIE, "pub-mangez-gras.mp3"))
json.dump({"duree": round(DUREE, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "pub-mangez-gras.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(DUREE, 1), plans)
