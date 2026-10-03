"""« Allô, Stéphane ? — Pris en charge » (script de l'utilisateur ; Stéphane Tchimbakala Matoutou, Ligne des Retours,
d'après Porkopédia ; déroulé et dialogues créés pour l'émission). Reportage de proximité des années 2000.
Voix : Stéphane (Landry, voix partagée de la bibliothèque ElevenLabs, v4, sans consigne d'accent), journaliste (Will),
voix off (Brian), appelant (Paul) et responsable (Dave) au téléphone, caméraman (Sam).
Son : frein de train, cochons, haut-parleur saturé, roues ; porte, chaise, ventilateur du CRT ; sonneries d'un téléphone
filaire beige, combiné qui claque, stylo et papier ; manteau, mallette, porte. Pas de musique hors générique : trois
notes et une sonnerie sur le logo. Coupe sèche de la sonnerie finale.
Voix : voix/allo-stephane/*.opus. Sortie : sortie/allo-stephane.wav, .mp3, .json."""
import json
import os

import numpy as np
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire
from synthe import cloche, env, filtre, xylo

DOSSIER = os.path.join(ICI, "voix", "allo-stephane")
_rng = np.random.default_rng(61)
TELEPHONE = {"A01", "A02", "A03", "A04", "A05", "A06", "R01", "R02", "R03"}


def bruitage(nom, niveau=0.4):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    return x / (np.abs(x).max() + 1e-9) * niveau


def piece(x, g=1.0):
    """Petit bureau administratif : réflexions courtes."""
    y = filtre(x, "low", 4000)
    out = x.copy()
    for d, k in ((0.009, 0.12), (0.016, 0.09), (0.028, 0.06), (0.045, 0.04)):
        out[int(d * SR) :] += y[: len(x) - int(d * SR)] * k * g
    return out


def rogner(x):
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.008, e.max() * 0.05))[0]
    return x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]


def voix(nom):
    x = lire(os.path.join(DOSSIER, nom + ".opus"))
    x = rogner(filtre(x, "high", 80)) if nom != "A05" else filtre(x, "high", 80)
    x = x / (np.sqrt((x**2).mean()) + 1e-9)
    if nom.startswith("V"):
        x = np.tanh(x * 0.1 * 1.2) / 1.2  # voix off de studio
    elif nom in TELEPHONE:
        # Combiné : bande téléphonique, petite saturation, à peine audible pour le responsable resté au loin.
        x = np.tanh(filtre(x, "band", [350, 3200], 4) * 0.25) * 0.42
        x = piece(x * (0.75 if nom.startswith("R") else 1.0), 0.6)
    elif nom == "K01" or nom == "J20":
        x = piece(filtre(x, "band", [150, 6000]) * 0.06, 1.2)  # en aparté, à voix basse
    elif nom.startswith("J"):
        x = piece(np.tanh(x * 0.09 * 1.2) / 1.2, 1.1)
    elif nom == "S17":
        x = piece(filtre(x, "band", [150, 6000]) * 0.07, 1.6)  # hors champ
    else:
        x = piece(np.tanh(x * 0.1 * 1.3) / 1.3, 0.8)
    x = filtre(x, "band", [80, 10000]) * env(len(x), 0.004, 0.001 if nom == "A05" else 0.03)
    return np.concatenate([x, np.zeros(int(0.06 * SR))]) if nom != "A05" else x


T = json.load(open(os.path.join(ICI, "allo-stephane-textes.json")))

# ----------------------------- Bruitages -----------------------------


def sonnerie(d=2.0, coupe=False):
    """Téléphone filaire beige : timbre électromécanique, salves de 0,4 s."""
    n = int(d * SR)
    t = np.arange(n) / SR
    marteau = (np.sin(2 * np.pi * 25 * t) > 0).astype(float)
    son = (np.sin(2 * np.pi * 1180 * t) + 0.6 * np.sin(2 * np.pi * 1420 * t) + 0.3 * np.sin(2 * np.pi * 2650 * t)) * marteau
    porteuse = ((t % 3.0) < 1.2).astype(float)  # sonne 1,2 s, se tait 1,8 s
    x = filtre(son * porteuse, "band", [700, 5000]) * 0.05
    if not coupe:
        x *= env(n, 0.005, 0.05)
    return piece(x, 1.3)


def combine(raccroche=True):
    """Combiné posé (ou décroché) sur la fourche : choc plastique et clic."""
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    choc = filtre(_rng.standard_normal(n), "band", [300, 3000]) * np.exp(-t * 40) * 0.12
    clic = filtre(_rng.standard_normal(n), "band", [2000, 7000]) * np.exp(-np.maximum(0, t - 0.06) * 200) * (t > 0.06) * 0.08
    return piece(choc + (clic if raccroche else clic * 0.5))


def stylo(d=2.2):
    n = int(d * SR)
    t = np.arange(n) / SR
    traits = (np.sin(2 * np.pi * 2.4 * t) > 0.3).astype(float)
    x = filtre(_rng.standard_normal(n), "band", [2500, 8000]) * 0.008 * traits
    return piece(x * env(n, 0.05, 0.1))


def cochons(d=4.0, g=1.0):
    """Cochons dans les wagons : grognements graves et quelques cris aigus, lointains."""
    n = int(d * SR)
    x = np.zeros(n + SR)
    for _ in range(int(d * 3)):
        m = int(_rng.uniform(0.15, 0.4) * SR)
        tt = np.arange(m) / SR
        aigu = _rng.random() < 0.25
        f0 = _rng.uniform(600, 1100) if aigu else _rng.uniform(90, 160)
        f = f0 * (1 + (0.4 if aigu else 0.15) * np.sin(np.pi * tt / tt[-1]))
        s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + _rng.standard_normal(m) * 0.5
        s = filtre(s * (1 + np.sin(2 * np.pi * 30 * tt)), "band", [80, 2500]) * env(m, 0.02, 0.06) * (0.4 if aigu else 0.8)
        i = int(_rng.uniform(0, d - 0.4) * SR)
        x[i : i + m] += s
    return filtre(x[:n], "low", 3000) * 0.018 * g


def frein():
    """Frein de train qui crisse, puis le souffle de l'air comprimé."""
    d = 3.0
    t = np.arange(int(d * SR)) / SR
    crisse = np.sin(2 * np.pi * (2100 + 300 * np.sin(2 * np.pi * 3 * t)) * t) * np.clip(1.6 - t, 0, 1) * 0.03
    air = filtre(_rng.standard_normal(len(t)), "band", [1500, 8000]) * np.exp(-((t - 2.1) ** 2) / 0.08) * 0.04
    return crisse + air


def haut_parleur(d=2.6):
    """Annonce de quai indéchiffrable : formants de voix sans mots, haut-parleur saturé."""
    n = int(d * SR)
    t = np.arange(n) / SR
    syll = np.abs(np.sin(2 * np.pi * 3.5 * t + 2 * np.sin(2 * np.pi * 0.7 * t)))
    f0 = 140 + 30 * np.sin(2 * np.pi * 0.9 * t)
    voix_ = np.sign(np.sin(2 * np.pi * np.cumsum(f0) / SR)) * syll
    x = np.tanh(filtre(voix_, "band", [500, 2400], 4) * 4) * 0.02
    return x * env(n, 0.05, 0.2)


def roues(d):
    """Roues sur les rails : ta-tac régulier et roulement."""
    n = int(d * SR)
    t = np.arange(n) / SR
    x = filtre(_rng.standard_normal(n), "band", [60, 600]) * 0.012
    for k in np.arange(0.3, d, 0.95):
        for dk in (0.0, 0.12):
            i = int((k + dk) * SR)
            m = int(0.06 * SR)
            x[i : i + m] += filtre(_rng.standard_normal(m), "band", [100, 1500])[: n - i] * np.exp(-np.arange(min(m, n - i)) / SR * 60) * 0.05
    return x


def jingle_logo():
    """Trois notes de générique sur le logo, puis une sonnerie beige."""
    s = np.zeros(int(2.8 * SR))
    for k, nt in enumerate((72, 76, 79)):
        x = xylo(nt, 0.6) * 0.5 + cloche(nt + 12, 0.6, 0.15)
        i = int(k * 0.22 * SR)
        s[i : i + len(x)] += x
    r = sonnerie(1.2)
    i = int(1.0 * SR)
    s[i : i + len(r)] += r[: len(s) - i] * 1.4
    return s


def manteau():
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    x = filtre(_rng.standard_normal(n), "band", [300, 3000]) * 0.012 * np.abs(np.sin(2 * np.pi * 1.4 * t))
    m = filtre(_rng.standard_normal(int(0.08 * SR)), "band", [200, 2000]) * np.exp(-np.arange(int(0.08 * SR)) / SR * 50) * 0.08
    x[int(1.3 * SR) : int(1.3 * SR) + len(m)] += m  # la mallette qu'on attrape
    return piece(x)


# ----------------------------- Montage -----------------------------
# ("p", plan, décor) · ("v", réplique, écart) · ("x", signal, décalage, avance) · ("s", silence)
D = [
    ("p", "01_quai", "quai"),
    ("x", frein(), 0.0, False),
    ("x", haut_parleur(), 1.2, False),
    ("s", 1.2),
    ("v", "V01", 0.0),
    ("v", "J01", 0.6),
    ("v", "S01", 0.5),
    ("v", "J02", 0.6),
    ("v", "S02", 0.5),
    ("s", 1.4),  # pause
    ("v", "V02", 0.0),
    ("s", 0.4),
    ("p", "logo", "quai"),
    ("x", jingle_logo(), 0.0, True),
    ("p", "02_train", "train"),
    ("s", 0.6),
    ("v", "J03", 0.0),
    ("v", "S03", 0.5),
    ("v", "J04", 0.6),
    ("v", "S04", 0.5),
    ("s", 0.8),
    ("v", "V03", 0.0),
    ("v", "J05", 0.6),
    ("v", "S05", 0.5),
    ("s", 1.0),
    ("p", "03_bureau", "bureau"),
    ("x", piece(bruitage("poignee", 0.08)), 0.0, True),
    ("x", piece(filtre(bruitage("grincement", 0.05), "low", 3000)), 0.1, True),
    ("s", 6.0),  # six secondes où il regarde simplement l'écran
    ("v", "V04", 0.0),
    ("v", "J06", 0.6),
    ("v", "S06", 0.5),
    ("v", "J07", 0.6),
    ("v", "S07", 0.5),
    ("s", 0.8),
    ("v", "V05", 0.0),
    ("s", 0.8),
    ("x", sonnerie(1.3), 0.0, True),  # sonnerie brusque
    ("p", "04_appel", "bureau"),
    ("x", combine(False), 0.0, True),
    ("v", "S08", 0.1),
    ("v", "A01", 0.4),
    ("v", "S09", 0.5),
    ("v", "A02", 0.4),
    ("v", "S10", 0.5),
    ("v", "A03", 0.3),
    ("v", "S11", 0.5),
    ("v", "A04", 0.4),
    ("v", "S12", 0.5),
    ("v", "A05", 0.3),
    ("v", "S13", 0.0),  # il coupe la parole
    ("s", 3.0),  # trois secondes : il ne comprend plus
    ("p", "05_raccroche", "bureau"),
    ("x", combine(True), 0.0, True),
    ("v", "J08", 0.6),
    ("v", "S14", 0.5),
    ("v", "J09", 0.6),
    ("v", "S15", 0.5),
    ("x", sonnerie(1.3), 0.6, True),
    ("v", "S16", 0.2),
    ("v", "V06", 0.6),
    ("s", 1.0),
    ("p", "06_registre", "bureau"),
    ("x", stylo(2.2), 0.0, False),
    ("x", sonnerie(1.0, coupe=True) * 0.5, 0.9, False),  # une sonnerie s'arrête hors champ
    ("v", "V07", 0.2),
    ("v", "J10", 0.6),
    ("v", "S17", 0.5),
    ("v", "J11", 0.6),
    ("v", "S18", 0.5),
    ("v", "R01", 0.6),
    ("v", "J12", 0.6),
    ("v", "R02", 0.4),
    ("v", "J13", 0.6),
    ("v", "R03", 0.4),
    ("s", 1.0),
    ("p", "07_interview", "bureau"),
    ("v", "J14", 0.4),
    ("v", "S19", 0.5),
    ("v", "J15", 0.6),
    ("v", "S20", 0.6),
    ("s", 2.4),  # pause longue
    ("v", "J16", 0.0),
    ("v", "S21", 0.5),
    ("v", "J17", 0.6),
    ("v", "S22", 0.5),
    ("v", "V08", 0.6),
    ("v", "J18", 0.6),
    ("v", "S23", 0.6),
    ("v", "J19", 0.8),
    ("v", "S24", 0.5),
    ("s", 2.4),  # silence, bourdonnement du CRT
    ("v", "J20", 0.0),
    ("v", "K01", 0.3),
    ("v", "S25", 0.7),
    ("s", 1.0),
    ("p", "08_depart", "bureau"),
    ("x", manteau(), 0.0, False),
    ("x", sonnerie(3.0), 0.8, False),  # il ne décroche pas
    ("v", "J21", 1.0),
    ("v", "S26", 0.5),
    ("v", "J22", 0.5),
    ("v", "S27", 0.5),
    ("v", "V09", 0.8),
    ("x", piece(bruitage("porte-coup", 0.12)), 0.3, True),  # porte fermée
    ("x", sonnerie(5.0), 0.2, True),  # téléphone seul, cinq secondes
    ("p", "noir_fin", "aucun"),
    ("v", "A06", 0.2),
    ("p", "logo_fin", "aucun"),
    ("fin",),
]

pistes, sous, plans, decors, t = [], [], [], [], 0.0
for ev in D:
    k = ev[0]
    if k == "p":
        plans.append([ev[1], round(t, 2)])
        decors.append((t, ev[2]))
    elif k == "v":
        _, nom, ecart = ev
        s = voix(nom)
        t += ecart
        pistes.append((t, s))
        dur = len(s) / SR - (0 if nom == "A05" else 0.06)
        sous.append({"at": round(t, 2), "dur": round(dur, 2), "voix": nom, "text": T[nom]})
        t += dur
    elif k == "x":
        _, s, ecart, avance = ev
        pistes.append((t + ecart, s))
        if avance:
            t += ecart + len(s) / SR
    elif k == "s":
        t += ev[1]
    elif k == "fin":
        # Logo final sur une sonnerie, coupée sèchement.
        r = sonnerie(1.6, coupe=True)
        pistes.append((t + 0.2, r))
        t += 1.8
DUREE = t
n = int(DUREE * SR)
mix = np.zeros(n + 10 * SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s
mix = mix[:n]

# Décors : quai (cochons, gare), train (roues, roulement), bureau (ventilateur du CRT, sifflement, fret au loin).
tt = np.arange(n) / SR
quai = cochons(DUREE, 1.0) + filtre(_rng.standard_normal(n), "band", [100, 2000]) * 0.003
train = roues(DUREE)
vent = lire(os.path.join(ICI, "sons", "bruitages", "ventilation.opus"))
vent = np.tile(vent, n // len(vent) + 1)[:n]
bureau = filtre(vent / (np.abs(vent).max() + 1e-9), "band", [150, 3000]) * 0.006 + np.sin(2 * np.pi * 15734 * tt) * 0.0025
bureau += cochons(DUREE, 0.15)  # le fret porcin derrière la fenêtre
fond = np.zeros(n)
for k, (t0, decor) in enumerate(decors):
    a, b = int(t0 * SR), int((decors[k + 1][0] if k + 1 < len(decors) else DUREE) * SR)
    if decor != "aucun":
        fond[a:b] = {"quai": quai, "train": train, "bureau": bureau}[decor][a:b]
fond = np.convolve(fond, np.ones(int(0.05 * SR)) / int(0.05 * SR), mode="same")
mix += fond
mix = mix / np.abs(mix).max() * 0.9
mix[-int(0.003 * SR) :] *= np.linspace(1, 0, int(0.003 * SR))  # coupe sèche
plans.append(["noir", round(DUREE, 2)])
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "allo-stephane.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "allo-stephane.wav"), os.path.join(SORTIE, "allo-stephane.mp3"))
json.dump({"duree": round(DUREE, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "allo-stephane.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(DUREE, 1), plans)
