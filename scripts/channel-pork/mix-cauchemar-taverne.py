"""« Cauchemar en Taverne — Au Fond du Fût » (script de l'utilisateur). Gordon Ramsgroin (Clyde, v4) sec, impatient
puis explosif ; le patron (Antoni) parfaitement sérieux ; un client hors champ (Sam) ; voix off de téléréalité (Matilda).
Son brut de petite équipe télé : micro qui sature pendant les cris, aucun bip. Couteau sur la planche, ventilation qui
vibre, porte qui grince, fourchette, verre, frigo (joint collant, moteur qui repart), eau, brosse métallique, seau
traîné, tireuse et mousse qui déborde cinq secondes, clic et gouttes, verre cassé hors champ. Nappe de tension grave
(synthe.enquete) sous la dispute, coupée pour les silences. Coupe franche avant la voix off finale, sur le logo.
Voix : voix/cauchemar-taverne/*.opus. Sortie : sortie/cauchemar-taverne.wav, .mp3, .json."""
import json
import os

import numpy as np
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire
from synthe import enquete, env, filtre, timbale

DOSSIER = os.path.join(ICI, "voix", "cauchemar-taverne")
_rng = np.random.default_rng(53)
CRIS = {"G10", "G14", "G15", "G18", "G19", "G28", "G29"}
HORS_CHAMP = {"P01", "P02", "P08", "P09", "P24", "C01", "C02"}


def bruitage(nom, niveau=0.4):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    return x / (np.abs(x).max() + 1e-9) * niveau


def cuisine(x, g=1.0):
    """Cuisine carrelée d'auberge : réflexions courtes et dures."""
    y = filtre(x, "low", 4500)
    out = x.copy()
    for d, k in ((0.008, 0.16), (0.015, 0.12), (0.026, 0.09), (0.041, 0.06), (0.063, 0.04)):
        out[int(d * SR) :] += y[: len(x) - int(d * SR)] * k * g
    return out


def rogner(x):
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.008, e.max() * 0.05))[0]
    return x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]


def voix(nom):
    x = lire(os.path.join(DOSSIER, nom + ".opus"))
    x = rogner(filtre(x, "high", 90))
    x = x / (np.sqrt((x**2).mean()) + 1e-9)
    if nom.startswith("V"):
        x = np.tanh(x * 0.1 * 1.2) / 1.2  # voix off de studio
    elif nom in CRIS:
        x = cuisine(np.tanh(x * 0.16 * 2.6) / 2.6 * 1.25, 0.8)  # le micro-cravate sature
    elif nom in HORS_CHAMP:
        x = cuisine(filtre(x, "band", [180, 5000]) * 0.07, 1.8)
    else:
        x = cuisine(np.tanh(x * 0.1 * 1.4) / 1.4, 0.8)
    x = filtre(x, "band", [90, 10000]) * env(len(x), 0.004, 0.03)
    return np.concatenate([x, np.zeros(int(0.06 * SR))])


T = json.load(open(os.path.join(ICI, "cauchemar-taverne-textes.json")))

# ----------------------------- Bruitages -----------------------------


def couteau(n=3):
    """Coups de couteau sur la planche."""
    out = []
    for _ in range(n):
        m = int(0.12 * SR)
        t = np.arange(m) / SR
        c = filtre(_rng.standard_normal(m), "band", [600, 5000]) * np.exp(-t * 60) + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 40) * 0.6
        out += [c * 0.25, np.zeros(int(0.22 * SR))]
    return cuisine(np.concatenate(out))


def verre_table():
    s = filtre(bruitage("ding-2", 0.04), "low", 2500)[: int(0.5 * SR)]
    s[: int(0.02 * SR)] += filtre(_rng.standard_normal(int(0.02 * SR)), "band", [300, 3000]) * 0.08
    return cuisine(s)


def frigo():
    """Joint qui colle puis s'arrache, moteur du frigo qui repart."""
    d = 2.6
    n = int(d * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    arrache = filtre(_rng.standard_normal(int(0.35 * SR)), "band", [200, 2500]) * np.linspace(0.2, 1, int(0.35 * SR)) * 0.06
    x[: len(arrache)] += arrache
    k = int(0.35 * SR)
    x[k : k + int(0.04 * SR)] += filtre(_rng.standard_normal(int(0.04 * SR)), "low", 900) * 0.1  # le « pop »
    moteur = filtre(np.sign(np.sin(2 * np.pi * 50 * t)) + 0.4 * np.sin(2 * np.pi * 100 * t), "band", [45, 400]) * 0.02
    moteur *= np.clip((t - 0.9) * 2, 0, 1)
    return cuisine(x + moteur)


def nettoyage(d=6.0):
    """Eau du robinet, brosse métallique, seau traîné. Pas de musique joyeuse."""
    n = int(d * SR)
    t = np.arange(n) / SR
    eau = filtre(_rng.standard_normal(n), "band", [400, 6000]) * 0.01 * (t < 2.2)
    brosse = filtre(_rng.standard_normal(n), "band", [2000, 9000]) * 0.016 * (np.abs(np.sin(2 * np.pi * 2.6 * t)) ** 3) * ((t > 1.8) & (t < 4.8))
    seau = filtre(_rng.standard_normal(n), "band", [80, 700]) * 0.03 * ((t > 4.6) & (t < 5.7)) * (1 + 0.6 * np.sin(2 * np.pi * 13 * t))
    return cuisine((eau + brosse + seau) * env(n, 0.05, 0.2))


def tireuse(d=5.5):
    """Tireuse ouverte, bière puis mousse qui déborde et éclabousse ; cinq secondes."""
    n = int(d * SR)
    t = np.arange(n) / SR
    jet = filtre(_rng.standard_normal(n), "band", [300, 3500]) * 0.02
    mousse = filtre(_rng.standard_normal(n), "band", [3000, 11000]) * 0.012 * np.clip(t - 1.0, 0, 1)
    eclab = np.zeros(n)
    for _ in range(18):
        i = int(_rng.uniform(1.8, d - 0.2) * SR)
        m = int(0.05 * SR)
        eclab[i : i + m] += filtre(_rng.standard_normal(m), "band", [400, 3000]) * np.exp(-np.arange(m) / SR * 60) * 0.05
    return cuisine((jet + mousse + eclab) * env(n, 0.03, 0.05))


def clic_gouttes():
    n = int(1.8 * SR)
    x = np.zeros(n)
    x[: int(0.02 * SR)] += filtre(_rng.standard_normal(int(0.02 * SR)), "band", [800, 5000]) * 0.12
    for k in range(4):
        m = int(0.08 * SR)
        tt = np.arange(m) / SR
        i = int((0.4 + k * 0.33 + _rng.uniform(0, 0.08)) * SR)
        x[i : i + m] += np.sin(2 * np.pi * (1400 - 600 * tt / 0.08) * tt) * np.exp(-tt * 50) * 0.05
    return cuisine(x)


def verre_casse():
    x = filtre(bruitage("crash", 0.12), "high", 900)[: int(1.2 * SR)]
    return cuisine(filtre(x, "low", 6000) * 0.6, 2.0)


def coup_dramatique():
    """Le coup sourd de téléréalité, sur les explosions de Gordon."""
    return filtre(timbale(48, 1.4), "low", 300) * 0.25


# ----------------------------- Montage -----------------------------
# ("p", plan) · ("v", réplique, écart) · ("x", signal, décalage, avance) · ("s", silence) · ("tension", gain)
D = [
    ("p", "01_ramsgroin"),
    ("tension", 0.6),
    ("x", couteau(3), 0.3, True),
    ("v", "V1", 0.2),
    ("v", "G01", 0.6),
    ("s", 0.8),
    ("p", "02_arrivee"),
    ("tension", 0.0),
    ("v", "G02", 0.4),
    ("v", "P01", 0.5),
    ("v", "G03", 0.4),
    ("v", "P02", 0.5),
    ("v", "G04", 0.4),
    ("s", 1.4),  # silence
    ("x", cuisine(bruitage("grincement", 0.08)), 0.0, True),  # porte qui grince
    ("v", "P03", 0.2),
    ("v", "G05", 0.4),
    ("s", 0.8),
    ("p", "03_degustation"),
    ("tension", 0.5),
    ("v", "P04", 0.4),
    ("x", cuisine(bruitage("fourchette", 0.06)), 0.1, False),
    ("v", "G06", 0.6),
    ("v", "P05", 0.5),
    ("v", "G07", 0.4),
    ("v", "P06", 0.5),
    ("v", "G08", 0.4),
    ("x", cuisine(bruitage("fourchette", 0.05)), 0.3, True),  # il repose sa fourchette
    ("x", verre_table(), 0.1, True),
    ("v", "G09", 0.2),
    ("v", "P07", 0.5),
    ("x", coup_dramatique(), 0.2, False),
    ("v", "G10", 0.3),
    ("s", 1.0),
    ("p", "04_frigo"),
    ("tension", 0.4),
    ("x", frigo(), 0.0, True),
    ("v", "G11", 0.0),
    ("v", "P08", 0.4),
    ("v", "G12", 0.4),
    ("v", "P09", 0.4),
    ("tension", 0.0),
    ("s", 2.0),  # deux secondes sans musique
    ("v", "G13", 0.0),
    ("v", "P10", 0.5),
    ("tension", 0.7),
    ("x", coup_dramatique(), 0.3, False),
    ("v", "G14", 0.4),
    ("v", "P11", 0.5),
    ("v", "G15", 0.3),
    ("s", 1.0),
    ("p", "05_engueulade"),
    ("v", "G16", 0.3),
    ("v", "P12", 0.5),
    ("v", "G17", 0.3),
    ("v", "P13", 0.4),
    ("x", coup_dramatique(), 0.1, False),
    ("v", "G18", 0.2),
    ("v", "P14", 0.5),
    ("v", "G19", 0.3),
    ("v", "P15", 0.5),
    ("tension", 0.2),
    ("v", "G20", 0.8),  # plus bas
    ("tension", 0.0),
    ("s", 1.4),  # silence ; le patron prend une bassine
    ("p", "06_nettoyage"),
    ("x", nettoyage(6.0), 0.0, False),
    ("v", "P16", 1.2),
    ("v", "G21", 0.4),
    ("v", "P17", 0.6),
    ("v", "G22", 0.4),
    ("v", "P18", 0.6),
    ("v", "G23", 0.3),
    ("v", "P19", 0.4),
    ("v", "G24", 0.3),
    ("s", 0.8),  # petite pause
    ("v", "G25", 0.0),
    ("s", 1.0),
    ("p", "07_service"),
    ("tension", 0.3),
    ("x", cuisine(bruitage("fourchette", 0.05), 1.5), 0.0, True),
    ("v", "C01", 0.1),
    ("v", "G26", 0.4),
    ("v", "P20", 0.5),
    ("x", tireuse(5.5), 0.1, True),  # laisser durer cinq secondes
    ("v", "G27", -2.6),
    ("v", "P21", 0.3),
    ("x", coup_dramatique(), 0.1, False),
    ("v", "G28", 0.3),
    ("x", clic_gouttes(), 0.0, True),
    ("v", "P22", 0.0),
    ("v", "G29", 0.3),
    ("tension", 0.0),
    ("v", "C02", 0.6),
    ("s", 1.2),  # silence
    ("v", "G30", 0.0),
    ("v", "P23", 0.5),
    ("v", "G31", 0.6),
    ("s", 1.0),
    ("p", "08_confession_finale"),
    ("tension", 0.3),
    ("v", "G32", 0.4),
    ("x", verre_casse(), 0.6, True),  # bruit de verre cassé hors champ
    ("v", "G33", 0.3),
    ("tension", 0.0),
    ("v", "P24", 0.6),
    ("s", 1.3),  # Ramsgroin ferme les yeux
    ("v", "G34", 0.0),
    ("s", 0.25),
    ("coupe",),  # coupe franche, logo sur noir
    ("p", "logo"),
    ("s", 0.8),
    ("v", "V2", 0.0),
    ("s", 1.4),
]

pistes, sous, plans, tension, t, COUPE = [], [], [], [], 0.0, None
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
        t += len(s) / SR - 0.06
    elif k == "x":
        _, s, ecart, avance = ev
        pistes.append((t + ecart, s))
        if avance:
            t += ecart + len(s) / SR
    elif k == "s":
        t += ev[1]
    elif k == "tension":
        tension.append((t, ev[1]))
    elif k == "coupe":
        COUPE = t
DUREE = t
n = int(DUREE * SR)
mix = np.zeros(n + 10 * SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s
mix = mix[:n]

# Nappe de tension, abaissée ou coupée selon le déroulé ; rien après la coupe franche.
m = enquete(DUREE, 17) * 0.06
g = np.zeros(n)
for k, (t0, gain) in enumerate(tension):
    fin = tension[k + 1][0] if k + 1 < len(tension) else COUPE
    g[int(t0 * SR) : int(fin * SR)] = gain
g = np.convolve(g, np.ones(int(0.5 * SR)) / int(0.5 * SR), mode="same")
mix += m[:n] * g
# Fond de cuisine : ventilation qui vibre et frigo, jusqu'à la coupe.
vent = lire(os.path.join(ICI, "sons", "bruitages", "ventilation.opus"))
vent = np.tile(vent, n // len(vent) + 1)[:n]
fond = filtre(vent / (np.abs(vent).max() + 1e-9), "band", [120, 3000]) * 0.009
fond += filtre(_rng.standard_normal(n), "band", [100, 3000]) * 0.0018
c = int(COUPE * SR)
fond[c:] = 0
mix += fond
# Coupe franche : tout ce qui déborde (bruitages, réverbération) s'arrête net, sauf la voix off finale.
v2 = [s for s in sous if s["voix"] == "V2"][0]
debut_v2 = int(v2["at"] * SR)
mix[c:debut_v2] = 0
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "cauchemar-taverne.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "cauchemar-taverne.wav"), os.path.join(SORTIE, "cauchemar-taverne.mp3"))
json.dump({"duree": round(DUREE, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "cauchemar-taverne.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(DUREE, 1), plans)
