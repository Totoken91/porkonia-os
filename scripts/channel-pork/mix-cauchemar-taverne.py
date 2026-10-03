"""« Cauchemar en Taverne — Trop propre pour être honnête » (script de l'utilisateur, parodie). Gordon Ramsgroin
(Clyde, v4) vif, monte soudain dans les tours, puis rend son verdict avec une assurance totale ; le patron (Antoni),
compétent, calme puis consterné ; le cuisinier hors champ (Fin), sobre ; un client hors champ (Sam) ; voix off
(Matilda). Son direct de petite équipe télé : saturation sur les cris, aucun bip. Carrelage sec, assiette, fût roulé,
chiffon humide, semelles qui collent, friteuse qui crépite dans les toilettes, brouhaha, bière renversée, chasse d'eau
hors champ. Nappe de tension grave, coupée pour les silences (aveux de propreté et de sobriété). Coupe franche, logo
sur noir, voix off finale. Voix : voix/cauchemar-taverne/*.opus. Sortie : sortie/cauchemar-taverne.wav, .mp3, .json."""
import json
import os

import numpy as np
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire
from synthe import enquete, env, filtre, timbale

DOSSIER = os.path.join(ICI, "voix", "cauchemar-taverne")
_rng = np.random.default_rng(53)
CRIS = {"R10", "R12", "R14", "R19", "R24"}
HORS_CHAMP = {"K01", "K02", "K03", "C01", "C02", "C03", "C04"}


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


def verre_casse():
    x = filtre(bruitage("crash", 0.12), "high", 900)[: int(1.2 * SR)]
    return cuisine(filtre(x, "low", 6000) * 0.6, 2.0)


def coup_dramatique():
    """Le coup sourd de téléréalité, sur les explosions de Gordon."""
    return filtre(timbale(48, 1.4), "low", 300) * 0.25





def pas_sec(n=4):
    """Pas sur un carrelage sec et propre : des talons nets."""
    out = []
    for _ in range(n):
        m = int(0.07 * SR)
        t = np.arange(m) / SR
        out += [filtre(_rng.standard_normal(m), "band", [900, 5000]) * np.exp(-t * 90) * 0.12, np.zeros(int(_rng.uniform(0.38, 0.5) * SR))]
    return cuisine(np.concatenate(out))


def assiette():
    s = filtre(bruitage("ding-1", 0.05), "low", 3000)[: int(0.6 * SR)]
    s[: int(0.03 * SR)] += filtre(_rng.standard_normal(int(0.03 * SR)), "band", [500, 4000]) * 0.1
    return cuisine(s)


def fut_roule(d=2.4):
    """Fût de bière roulé sur le carrelage : grondement et cerclages qui tapent."""
    n = int(d * SR)
    t = np.arange(n) / SR
    x = filtre(_rng.standard_normal(n), "band", [50, 300]) * 0.05 * (1 + 0.5 * np.sin(2 * np.pi * 3.1 * t))
    for k in np.arange(0.2, d, 0.62):
        m = int(0.06 * SR)
        i = int(k * SR)
        x[i : i + m] += filtre(_rng.standard_normal(m), "band", [300, 2500])[: n - i] * np.exp(-np.arange(min(m, n - i)) / SR * 50) * 0.08
    return cuisine(x * env(n, 0.1, 0.3))


def chiffon(d=1.8):
    """Chiffon humide frotté sur l'inox."""
    n = int(d * SR)
    t = np.arange(n) / SR
    x = filtre(_rng.standard_normal(n), "band", [700, 4500]) * 0.02 * (np.abs(np.sin(2 * np.pi * 2.2 * t)) ** 2)
    return cuisine(x * env(n, 0.05, 0.2))


def collant(n=3):
    """Semelles qui commencent à coller : petits arrachements."""
    out = []
    for _ in range(n):
        m = int(0.18 * SR)
        t = np.arange(m) / SR
        cr = filtre(_rng.standard_normal(m), "band", [1500, 7000]) * (_rng.random(m) < 0.25) * np.exp(-t * 14) * 0.18
        out += [cr, np.zeros(int(_rng.uniform(0.35, 0.55) * SR))]
    return cuisine(np.concatenate(out))


def friteuse(d=6.0):
    """Huile qui frémit et crépite : bain de friture, éclats aigus."""
    n = int(d * SR)
    t = np.arange(n) / SR
    bain = filtre(_rng.standard_normal(n), "band", [2500, 9000]) * 0.006
    crep = filtre(_rng.standard_normal(n) * (_rng.random(n) < 0.004), "band", [1800, 8000]) * 0.5
    return cuisine((bain + crep) * env(n, 0.4, 0.4), 1.4)


def brouhaha(d=14.0):
    """Salle pleine : voix indistinctes, rires, couverts. Un fond, pas une ambiance de stade."""
    n = int(d * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k in range(9):
        f0 = _rng.uniform(220, 900)
        mod = 0.5 + 0.5 * np.sin(2 * np.pi * _rng.uniform(2.5, 5.5) * t + _rng.uniform(0, 6))
        x += filtre(_rng.standard_normal(n), "band", [f0 * 0.6, f0 * 2.2]) * mod * 0.006
    for _ in range(int(d * 1.2)):
        i = int(_rng.uniform(0, d - 0.3) * SR)
        m = int(0.08 * SR)
        x[i : i + m] += filtre(_rng.standard_normal(m), "band", [2000, 6000]) * np.exp(-np.arange(m) / SR * 60) * 0.02
    return cuisine(x * env(n, 0.8, 1.0), 1.6)


def chasse():
    """Chasse d'eau hors champ, derrière une porte fine."""
    d = 2.6
    t = np.arange(int(d * SR)) / SR
    s = filtre(_rng.standard_normal(len(t)), "band", [180, 2200]) * np.minimum(1, t * 4) * np.exp(-np.maximum(0, t - 1.2) * 1.6)
    s *= 1 + 0.3 * np.sin(2 * np.pi * 7 * t)
    return cuisine(filtre(s, "low", 1400) * 0.07, 1.5)



# ----------------------------- Montage -----------------------------
# ("p", plan) · ("v", réplique, écart) · ("x", signal, décalage, avance) · ("s", silence) · ("tension", gain)
D = [
    ("p", "01_arrivee"),
    ("tension", 0.4),
    ("x", pas_sec(4), 0.2, False),
    ("v", "V01", 0.4),
    ("v", "P01", 0.6),
    ("v", "R01", 0.4),
    ("v", "P02", 0.5),
    ("tension", 0.0),
    ("s", 1.3),  # la pause après l'aveu de nettoyage
    ("v", "R02", 0.0),
    ("s", 0.8),
    ("p", "02_cuisine_impeccable"),
    ("x", assiette(), 0.0, True),
    ("v", "P03", 0.3),
    ("v", "R03", 0.4),
    ("v", "K01", 0.4),
    ("v", "R04", 0.4),
    ("v", "K02", 0.5),
    ("v", "R05", 0.4),
    ("v", "K03", 0.5),
    ("s", 3.0),  # trois secondes de silence : l'aveu de sobriété
    ("tension", 0.5),
    ("v", "R06", 0.0),
    ("v", "P04", 0.5),
    ("v", "R07", 0.4),
    ("s", 0.8),
    ("p", "03_doigt_propre"),
    ("v", "R08", 0.3),
    ("s", 0.6),
    ("v", "P05", 0.2),
    ("tension", 0.0),
    ("s", 1.0),  # personne ne répond : c'est propre
    ("v", "R09", 0.0),
    ("v", "P06", 0.5),
    ("tension", 0.7),
    ("x", coup_dramatique(), 0.1, False),
    ("v", "R10", 0.3),
    ("v", "P07", 0.6),
    ("tension", 0.2),
    ("v", "R11", 0.6),
    ("s", 0.8),
    ("p", "04_fermeture"),
    ("tension", 0.7),
    ("x", coup_dramatique(), 0.0, False),
    ("v", "R12", 0.1),
    ("v", "P08", 0.4),
    ("v", "R13", 0.4),
    ("v", "P09", 0.5),
    ("x", coup_dramatique(), 0.2, False),
    ("v", "R14", 0.3),
    ("x", cuisine(bruitage("porte-coup", 0.25), 1.5), 0.2, True),  # la porte claque
    ("tension", 0.3),
    ("v", "V02", 0.6),
    ("s", 0.8),
    ("p", "05_renovation"),
    ("tension", 0.0),
    ("x", fut_roule(2.6), 0.0, False),
    ("v", "R15", 0.6),
    ("x", chiffon(2.0), 0.2, False),
    ("v", "P10", 0.6),
    ("v", "R16", 0.4),
    ("x", collant(3), 0.1, False),
    ("v", "P11", 0.6),
    ("v", "R17", 0.4),
    ("s", 0.6),
    ("v", "P12", 0.4),
    ("s", 0.5),
    ("v", "R18", 0.0),
    ("v", "P13", 0.4),
    ("tension", 0.6),
    ("x", coup_dramatique(), 0.1, False),
    ("v", "R19", 0.3),
    ("s", 0.8),
    ("p", "06_friteuse_toilettes"),
    ("tension", 0.2),
    ("x", friteuse(30.0), 0.0, False),
    ("v", "P14", 0.8),
    ("v", "R20", 0.4),
    ("v", "P15", 0.5),
    ("v", "R21", 0.4),
    ("v", "P16", 0.6),
    ("v", "R22", 0.4),
    ("v", "P17", 0.6),
    ("v", "R23", 0.4),
    ("tension", 0.0),
    ("s", 0.6),
    ("v", "V03", 0.4),
    ("s", 0.8),
    ("p", "07_reouverture"),
    ("x", brouhaha(23.5), 0.0, False),
    ("x", tireuse(3.5), 0.3, False),
    ("v", "C01", 0.6),
    ("v", "R24", 0.3),
    ("v", "P18", 0.5),
    ("v", "R25", 0.4),
    ("x", cuisine(bruitage("crash", 0.05), 1.6)[: int(1.0 * SR)], 0.0, False),  # bière renversée
    ("v", "C02", 0.6),
    ("v", "P19", 0.4),
    ("v", "C03", 0.4),
    ("v", "P20", 0.4),
    ("s", 0.6),
    ("v", "R26", 0.0),
    ("s", 1.0),
    ("p", "08_verdict"),
    ("x", brouhaha(26.0) * 0.6, 0.0, False),
    ("x", chasse(), 0.2, True),  # chasse d'eau hors champ
    ("v", "R27", 0.2),
    ("v", "P21", 0.5),
    ("v", "R28", 0.4),
    ("v", "P22", 0.6),
    ("v", "R29", 0.4),
    ("s", 1.4),  # pause
    ("v", "C04", 0.0),
    ("s", 0.6),
    ("v", "R30", 0.0),
    ("s", 0.4),
    ("coupe",),  # coupe franche, logo sur noir
    ("p", "logo"),
    ("s", 0.8),
    ("v", "V04", 0.0),
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
v2 = [s for s in sous if s["voix"] == "V04"][0]
debut_v2 = int(v2["at"] * SR)
mix[c:debut_v2] = 0
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "cauchemar-taverne.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "cauchemar-taverne.wav"), os.path.join(SORTIE, "cauchemar-taverne.mp3"))
json.dump({"duree": round(DUREE, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "cauchemar-taverne.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(DUREE, 1), plans)
