"""Reportage « DJ Fatbass à bord du Gras-Fond » (script de l'utilisateur), dans le magazine « Porc d'Attache » :
reportage local des années 2000, son de caméra médiocre. Générique (generiques.py), puis seulement le bruit de bord (ventilation, tuyaux qui vibrent, chaudière, secteur),
pings de sonar, trois secondes de techno-zouk coupées net, ronflements beaucoup trop près du micro, silences gênants
et coupe franche au noir en plein ronflement. Voix : voix/reportage-fatbass/*.opus. Bruitages CC0 : sons/bruitages/.
Sortie : sortie/reportage-fatbass.wav, .mp3 et .json (plans, sous-titres)."""
import json
import os

import numpy as np
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire
from synthe import env, filtre, techno_zouk

DOSSIER = os.path.join(ICI, "voix", "reportage-fatbass")


def bruitage(nom, niveau=0.4, debut=0.0, duree=None):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    x = x[int(debut * SR) :]
    if duree:
        x = x[: int(duree * SR)] * env(int(duree * SR), 0.01, 0.15)
    return x / (np.abs(x).max() + 1e-9) * niveau


def coque(x, g=1.0):
    """Le sous-marin : petites réflexions métalliques serrées (la coque résonne autour de la caméra)."""
    out = x.copy()
    for d, k in ((0.0071, 0.2), (0.0123, 0.14), (0.0191, 0.1), (0.031, 0.07), (0.047, 0.045)):
        out[int(d * SR) :] += filtre(x, "band", [350, 3200])[: len(x) - int(d * SR)] * k * g
    return out


def rogner(x):
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.008, e.max() * 0.05))[0]
    return x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]


# Les prises sont posées : on resserre un peu le débit (sans changer la hauteur) et les blancs entre répliques.
RESSERRE = 0.7


# Réglage par voix : (tempo, niveau, traitement)
def voix(nom):
    x = lire(os.path.join(DOSSIER, nom + ".opus"), tempo=1.1 if nom.startswith("R") else 1.07)
    x = rogner(filtre(x, "high", 75))
    x = x / (np.sqrt((x**2).mean()) + 1e-9)
    if nom.startswith("R"):
        # Le reporter tient le micro trop près : effet de proximité, un peu de saturation.
        niv = {"R17": 0.075, "R18": 0.085, "R15": 0.1}.get(nom, 0.12)
        x = x + filtre(x, "low", 180) * 0.7
        x = np.tanh(x * niv * 2.6) / 2.6
        x = coque(x, 0.5)
    elif nom.startswith("M"):
        # Le marin, hors champ, à l'autre bout du poste.
        x = coque(filtre(x, "low", 3200), 1.6) * 0.06
    elif nom == "F18":
        x = coque(filtre(x, "low", 2400), 1.0) * 0.06  # endormi, à peine compréhensible
    else:
        x = coque(np.tanh(x * 0.105 * 1.6) / 1.6, 1.0)
    x = filtre(x, "band", [90, 7500]) * env(len(x), 0.004, 0.03)
    return np.concatenate([x, np.zeros(int(0.08 * SR))])


T = {
    "R1": "Aujourd'hui, Channel Pork embarque à bord du Gras-Fond. À la fois sous-marin de ravitaillement et salle de fête, il accueille le lieutenant Salamander, également connu sous le nom de DJ Fatbass.",
    "F1": "Faites gaffe en entrant. La porte est étanche, mais le plateau de rillettes, non.",
    "R2": "Nous sommes déjà en plongée ?",
    "F2": "Non. On attend que la mousse redescende.",
    "R3": "Ce point sur le sonar, c'est un bâtiment ennemi ?",
    "F3": "C'est un fût.",
    "R4": "Comment faites-vous la différence ?",
    "F4": "Un bâtiment ennemi, on le laisse passer. Le fût, on le récupère.",
    "R5": "Et si c'est un ennemi avec de la bière ?",
    "F5": "On négocie. Je suis pas un connard.",
    "R6": "Deux platines et une table de mixage, directement au poste sonar.",
    "F6": "Le sonar faisait ping au milieu de mes transitions. Ça me niquait tous les morceaux.",
    "R7": "Vous avez déplacé les platines ?",
    "F7": "Non. J'ai coupé le sonar.",
    "F8": "Qui l'a rallumé, bordel ?",
    "F9": "Ça, c'est le crossfader. À gauche, zouk. À droite, techno. Au milieu, incident diplomatique.",
    "R8": "La musique s'entend depuis l'extérieur ?",
    "F10": "Seulement les basses.",
    "R9": "Donc on peut vous repérer ?",
    "F11": "Ouais, mais faut aimer le morceau.",
    "R10": "Vous venez de couper la musique ?",
    "F12": "Non, le micro du capitaine. Il parle toujours pendant les drops.",
    "R11": "Combien de temps pouvez-vous rester sous l'eau ?",
    "F13": "Douze fûts.",
    "R12": "En heures ?",
    "F14": "Ça dépend de qui vient.",
    "F15": "Les porte-verres sont renforcés. On peut perdre un moteur, mais pas une ambrée.",
    "R13": "Et l'air ?",
    "F16": "Y en a partout. Regardez, on respire.",
    "R14": "Comment garantissez-vous la discrétion du sous-marin ?",
    "F17": "La furtivité acoustique, c'est très simple. Il faut que l'ennemi entende absolument…",
    "R15": "Lieutenant ?",
    "R16": "Lieutenant Salamander ?",
    "M1": "Il fait ça.",
    "R17": "Et qui surveille le sonar ?",
    "M2": "Normalement lui.",
    "R18": "On coupe. On a ce qu'il faut.",
    "F18": "Touche pas au fader…",
}

# Ronflements : prises v4 non verbales de la voix de Fatbass, découpées (cycles inspiration / expiration).
_RONFLE = lire(os.path.join(DOSSIER, "ronfle.opus"))


def ronflement(debut, fin, gain=1.0, pres=0.0):
    """`pres` : trop près du micro (graves gonflés, saturation)."""
    x = _RONFLE[int(debut * SR) : int(fin * SR)].copy()
    x = x / (np.abs(x).max() + 1e-9) * 0.3 * gain
    if pres:
        x = x + filtre(x, "low", 220) * 1.5 * pres
        x = np.tanh(x * (1 + 2 * pres)) / (1 + pres)
    return coque(x, 0.6) * env(len(x), 0.02, 0.08)


def ping(niveau=0.12, sec=False):
    s = bruitage("sonar", niveau)
    return coque(filtre(s, "band", [300, 5000]), 0.8)


def fader():
    """Clic de fader : on coupe net."""
    n = int(0.03 * SR)
    return filtre(np.random.default_rng(1).standard_normal(n), "band", [1500, 6000]) * np.exp(-np.arange(n) / SR * 160) * 0.2


# Événements : ("v", réplique, écart) · ("x", signal, écart, avance) · ("s", silence) · ("p", plan) · ("coupe",)
D = [
    ("p", "01_accueil"),
    ("s", 0.6),
    ("v", "R1", 0.0),
    ("x", bruitage("porte-coup", 0.16), 0.5, False),
    ("v", "F1", 0.7),
    ("v", "R2", 0.6),
    ("v", "F2", 0.5),
    ("p", "02_sonar"),
    ("x", ping(0.09), 0.6, False),
    ("v", "R3", 1.1),
    ("v", "F3", 0.6),
    ("x", ping(0.07), 0.2, False),
    ("v", "R4", 0.6),
    ("v", "F4", 0.5),
    ("v", "R5", 0.7),
    ("x", ping(0.07), 0.4, False),
    ("v", "F5", 0.9),
    ("p", "03_setup"),
    ("v", "R6", 1.0),
    ("v", "F6", 0.6),
    ("v", "R7", 0.5),
    ("v", "F7", 0.6),
    ("x", ping(0.16), -0.35, True),  # un seul ping coupe la fin de la phrase
    ("v", "F8", 0.3),
    ("p", "04_mix"),
    ("v", "F9", 1.0),
    ("v", "R8", 0.6),
    ("v", "F10", 0.5),
    ("v", "R9", 0.5),
    ("v", "F11", 0.5),
    ("x", techno_zouk(3.0) * 0.3, 0.6, True),
    ("x", fader(), 0.0, False),
    ("s", 0.8),
    ("v", "R10", 0.0),
    ("v", "F12", 0.5),
    ("p", "05_ravitaillement"),
    ("v", "R11", 1.0),
    ("v", "F13", 0.6),
    ("v", "R12", 0.5),
    ("v", "F14", 0.5),
    ("s", 0.9),  # il désigne le plateau de porc puis les fûts
    ("v", "F15", 0.0),
    ("v", "R13", 0.6),
    ("v", "F16", 0.6),
    ("s", 1.2),  # une seconde de silence du reporter
    ("p", "06_baillement"),
    ("v", "R14", 0.3),
    ("v", "F17", 0.7),
    ("s", 1.6),  # la phrase reste en suspens ; il pose la tête sur ses avant-bras
    ("x", bruitage("souffle", 0.05), 0.0, True),
    ("s", 0.8),
    ("p", "07_sommeil"),
    ("v", "R15", 0.2),
    ("s", 2.0),
    ("v", "R16", 0.0),
    ("x", ronflement(0.0, 2.9, 1.0, 0.6), 0.5, True),
    ("x", ping(0.08), 0.3, True),
    ("x", ronflement(3.0, 5.6, 1.45, 1.0), 0.2, True),
    ("v", "M1", 0.6),
    ("v", "R17", 0.6),
    ("v", "M2", 0.5),
    ("s", 3.0),  # silence gênant
    ("p", "08_coupure"),
    ("v", "R18", 0.4),
    ("v", "F18", 0.7),
    ("x", ronflement(5.7, 7.0, 1.3, 0.9), 0.4, False),
    ("coupe", 0.75),  # coupe franche au noir en plein ronflement
]

pistes, sous, plans, t = [], [], [], 0.0
silences = []
for ev in D:
    k = ev[0]
    if k == "p":
        plans.append([ev[1], round(t, 2)])
    elif k == "v":
        _, nom, ecart = ev
        s = voix(nom)
        t += ecart * RESSERRE
        pistes.append((t, s))
        sous.append({"at": round(t, 2), "dur": round(len(s) / SR - 0.08, 2), "voix": nom, "text": T[nom]})
        t += len(s) / SR - 0.08
    elif k == "x":
        _, s, ecart, avance = ev
        t += ecart
        pistes.append((t, s))
        if avance:
            t += len(s) / SR
    elif k == "s":
        silences.append((t, t + ev[1]))
        t += ev[1]
    elif k == "coupe":
        t += ev[1]
COUPE = t
plans.append(["noir", round(COUPE, 2)])
DUREE = COUPE + 1.2
n = int(DUREE * SR)
mix = np.zeros(n + 10 * SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s
mix = mix[:n]


def boucle(x, d, fondu=0.4):
    m, f = int(d * SR), int(fondu * SR)
    out, pos = np.zeros(m + len(x)), 0
    while pos < m:
        y = x.copy()
        y[:f] *= np.linspace(0, 1, f)
        y[-f:] *= np.linspace(1, 0, f)
        out[pos : pos + len(y)] += y
        pos += len(x) - f
    return out[:m]


# Bruit de bord : ventilation, tuyaux qui vibrent (chaudière très grave), secteur 50 Hz, souffle de la caméra,
# quelques claquements de tuyauterie au loin. Le générique « Porc d'Attache » est posé devant par generiques.py.
rng = np.random.default_rng(12)
tt = np.arange(n) / SR
bord = filtre(boucle(bruitage("ventilation", 1.0), DUREE), "band", [120, 3500]) * 0.035
bord += filtre(boucle(bruitage("chaudiere", 1.0), DUREE), "low", 260) * 0.05
bord += (np.sin(2 * np.pi * 50 * tt) + 0.5 * np.sin(2 * np.pi * 100 * tt) + 0.2 * np.sin(2 * np.pi * 150 * tt)) * 0.006 * (1 + 0.3 * np.sin(2 * np.pi * 0.21 * tt))
bord += filtre(rng.standard_normal(n), "high", 2500) * 0.004
for tc in np.arange(9.0, COUPE - 4, 11.3):
    c = coque(filtre(bruitage(f"toc-{1 + int(tc) % 3}", 0.04), "low", 1400), 2.0)
    i = int((tc + rng.uniform(0, 3)) * SR)
    bord[i : i + len(c)] += c[: n - i]
debut_bord = 0
g = np.zeros(n)
g[debut_bord:] = 1
g = np.convolve(g, np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same")
mix += bord * g
# Coupe franche au noir : plus rien, pas même le bord.
mix[int(COUPE * SR) :] = 0
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "reportage-fatbass.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "reportage-fatbass.wav"), os.path.join(SORTIE, "reportage-fatbass.mp3"))
json.dump({"duree": round(DUREE, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "reportage-fatbass.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(DUREE, 1), plans)
