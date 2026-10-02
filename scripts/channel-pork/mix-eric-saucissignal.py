"""« Éric présente Saucissignal » : dialogue Éric / présentateur sur un plateau porkonien. Fond de plateau (bourdon
électrique, chaudière de brasserie au loin, une toux en régie), silences qui respirent, pas de bruitage comique sur
les jurons, jingle minable et coupe nette. Voix : voix/eric-saucissignal/*.opus. Bruitages CC0 : sons/bruitages/.
Sortie : sortie/eric-saucissignal.wav, .mp3 et .json (plans, sous-titres)."""
import json
import os

import numpy as np
from scipy import signal
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire


def filtre(x, k, f, o=2):
    return signal.sosfilt(signal.butter(o, f, k, fs=SR, output="sos"), x)


def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def bruitage(nom, niveau=0.4, debut=0.0, duree=None):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    x = x[int(debut * SR) :]
    if duree:
        x = x[: int(duree * SR)] * env(int(duree * SR), 0.01, 0.15)
    return x / (np.abs(x).max() + 1e-9) * niveau


def plateau(x):
    """Petite réverbération de plateau : quelques réflexions courtes et sourdes."""
    out = x.copy()
    for d, g in ((0.021, 0.16), (0.037, 0.11), (0.058, 0.07), (0.083, 0.045)):
        out[int(d * SR) :] += filtre(x, "low", 3500)[: len(x) - int(d * SR)] * g
    return out


def voix(nom):
    x = filtre(lire(os.path.join(ICI, "voix", "eric-saucissignal", nom + ".opus"), tempo=TEMPO), "high", 90)
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.012, e.max() * 0.06))[0]
    x = x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]
    x = x / (np.sqrt((x**2).mean()) + 1e-9) * (0.11 if nom.startswith("P") else 0.12)
    x = np.tanh(x * 1.5) / 1.5 * env(len(x), 0.004, 0.03)
    return plateau(np.concatenate([x, np.zeros(int(0.1 * SR))]))


# Les prises v4 sont jouées un peu lentement : on resserre le débit (sans changer la hauteur) et les blancs.
TEMPO = 1.08
RESSERRE = 0.72

T = {
    "P1": "Éric, bonsoir. Quel problème résout votre startup ?",
    "E1": "La faim, putain. Ça fait trois heures que je vous regarde bouffer en régie pendant qu'on me poudre la gueule. Donc j'ai fondé Saucissignal.",
    "P2": "Un service de livraison ?",
    "E2": "Non, bordel. La livraison, c'est pour les fils de pute qui ont un camion. Moi j'ai des oreilles.",
    "E3": "J'entends un saucisson à 325 porkomètres. Vous payez douze porkos par mois et je vous appelle quand j'en entends un.",
    "P3": "Et ensuite ?",
    "E4": "Ensuite quoi ? Vous êtes informé, connard. Quand la météo annonce la pluie, le présentateur vient vous pisser dessus ? Non. Ben voilà.",
    "P4": "Le saucisson est compris ?",
    "E5": "Dans ma bouche, oui. Dans votre abonnement, allez vous faire foutre.",
    "P5": "Ce haut-parleur n'est pas branché.",
    "E6": "C'est du sans-fil, tête de bite.",
    "P6": "Il y a un câble.",
    "E7": "Une rétrocompatibilité, putain ! Vous voulez de l'innovation ou vous voulez m'emmerder avec des fils ?",
    "P7": "Et le casque ?",
    "E8": "Pour que les autres connards ferment leur gueule pendant que je travaille.",
    "E9": "Il y en a un.",
    "P8": "Ah bon ? Où ça ?",
    "E10": "Devant moi, bordel. Sur l'assiette.",
    "P9": "Mais vous le voyez.",
    "E11": "Multicanal. Auditif ET visuel. Ça vous troue le cul, hein ?",
    "P10": "Tout le monde peut le voir.",
    "E12": "Ouais, ben tout le monde peut fermer sa gueule aussi, et pourtant regardez où on en est.",
    "E13": "Maintenant sortez douze porkos.",
    "P11": "Pour une part de l'entreprise ?",
    "E14": "Une part de quoi, pauvre con ? J'ai même pas de table. Vous financez la croissance.",
    "P12": "Quelle croissance ?",
    "E15": "Celle de mon putain de sandwich.",
    "P13": "Vous n'avez donc aucun bénéfice pour le client ?",
    "E16": "Si. Vous pouvez raconter que vous avez investi au lieu de dire que vous m'avez filé une pièce. Je transforme votre gêne en trou du cul de prestige.",
    "P14": "Vous êtes en train de manger le prototype.",
    "E17": "Je pivote, putain.",
    "P15": "Et les abonnés, alors ?",
    "E18": "Ils vont entendre que c'était bon.",
    "P16": "Un dernier mot ?",
    "E19": "Oui. Le renouvellement est automatique. Pour résilier, faut venir me voir.",
    "P17": "À quelle adresse ?",
    "E20": "J'en ai pas, connard.",
}

# Plans : liste d'événements ("v", réplique, écart avant) · ("b", bruitage, écart, avance?, niveau, début, durée) · ("s", silence)
D = [
    ("01_plateau", [("s", 1.2), ("v", "P1", 0), ("v", "E1", 0.5), ("v", "P2", 0.6), ("v", "E2", 0.4)]),
    ("02_pitch", [("v", "E3", 0.7), ("v", "P3", 0.5), ("v", "E4", 0.4), ("v", "P4", 0.7), ("v", "E5", 0.45)]),
    ("03_prototype", [("v", "P5", 0.8), ("v", "E6", 0.35), ("v", "P6", 0.6), ("v", "E7", 0.35), ("v", "P7", 0.7), ("v", "E8", 0.4),
                      ("b", "toux", 0.5, True, 0.07, 0.0, 1.3)]),
    ("04_demonstration", [("s", 3.2), ("v", "E9", 0), ("v", "P8", 0.5), ("v", "E10", 0.4), ("v", "P9", 0.7), ("v", "E11", 0.4),
                          ("v", "P10", 0.8), ("v", "E12", 0.4)]),
    ("05_investissement", [("v", "E13", 0.8), ("v", "P11", 0.6), ("v", "E14", 0.4), ("v", "P12", 0.6), ("v", "E15", 0.35),
                           ("b", "pieces", 0.7, True, 0.18, 0.8, 2.0), ("v", "P13", 0.4), ("v", "E16", 0.5)]),
    ("06_conclusion", [("b", "fourchette", 0.6, False, 0.22), ("v", "P14", 0.9), ("v", "E17", 0.5), ("v", "P15", 0.6), ("v", "E18", 0.4),
                       ("b", "croque-1", 0.6, False, 0.2), ("b", "croque-3", 0.9, False, 0.17), ("b", "croque-5", 0.8, True, 0.15), ("s", 1.0),
                       ("v", "P16", 0.2), ("v", "E19", 0.4), ("v", "P17", 0.6), ("v", "E20", 0.4),
                       ("b", "jingle-sax", 0.5, True, 0.5)]),
]

pistes, sous, plans, t, silences = [], [], [], 0.0, []
for plan, items in D:
    plans.append([plan, round(t, 2)])
    for it in items:
        if it[0] == "v":
            _, nom, ecart = it
            s = voix(nom)
            t += ecart * RESSERRE
            pistes.append((t, s))
            sous.append({"at": round(t, 2), "dur": round(len(s) / SR - 0.1, 2), "voix": nom, "text": T[nom]})
            t += len(s) / SR - 0.1
        elif it[0] == "b":
            _, nom, ecart, avance, niv, *reste = it
            s = bruitage(nom, niv, *reste)
            if nom == "toux":
                s = plateau(filtre(s, "band", [300, 2500]))  # en régie, derrière la vitre
            t += ecart
            pistes.append((t, s))
            if avance:
                t += len(s) / SR
        elif it[0] == "s":
            silences.append((t, t + it[1]))
            t += it[1]
duree = t  # coupe nette juste après le jingle
n = int(duree * SR)
mix = np.zeros(n + 10 * SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s
mix = mix[:n]


def boucle(x, d, fondu=0.5):
    m, f = int(d * SR), int(fondu * SR)
    out, pos = np.zeros(m + len(x)), 0
    while pos < m:
        y = x.copy()
        y[:f] *= np.linspace(0, 1, f)
        y[-f:] *= np.linspace(1, 0, f)
        out[pos : pos + len(y)] += y
        pos += len(x) - f
    return out[:m]


# Fond de plateau : bourdon électrique (CRT, éclairage), chaudière de brasserie lointaine dans la tuyauterie.
fond = filtre(boucle(bruitage("bourdon", 1.0), duree), "band", [60, 4000]) * 0.020
fond += filtre(boucle(bruitage("chaudiere", 1.0), duree), "low", 500) * 0.028
# Le silence du casque : le plateau retient son souffle (le fond baisse un peu).
g = np.ones(n)
for a, b in silences[1:]:
    ia, ib = int(a * SR), int(b * SR)
    g[ia:ib] = 0.55
g = np.convolve(g, np.ones(int(0.3 * SR)) / int(0.3 * SR), mode="same")
mix = mix + fond[:n] * g * env(n, 0.4, 0.0)
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "eric-saucissignal.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "eric-saucissignal.wav"), os.path.join(SORTIE, "eric-saucissignal.mp3"))
json.dump({"duree": round(duree, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "eric-saucissignal.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(duree, 1), plans)
