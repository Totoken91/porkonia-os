"""« Porc d'Attache — Une journée sans mentir » (script de l'utilisateur). Frédéric Legaigneur (Callum, la voix de
« Ferme ta gueule et réponds ») face au reporter du magazine (Charlie), micro tendu. Après le générique, rien que le
son de l'atelier : néon qui ronfle, ventilateur d'imprimante, papier, petits silences ; frigo de cuisine au premier
plan. Un vrai bip de chronomètre, un moteur d'imprimante et un bourrage ; aucun bruitage comique. Coupe franche au
milieu de « sans les mains ». Voix : voix/fred-sans-mentir/*.opus. Sortie : sortie/fred-sans-mentir.wav, .mp3, .json."""
import json
import os

import numpy as np
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire
from synthe import env, filtre

DOSSIER = os.path.join(ICI, "voix", "fred-sans-mentir")
_rng = np.random.default_rng(41)
COUPE_F30 = 3.86  # secondes dans la prise : « sans les ma— »


def bruitage(nom, niveau=0.4):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    return x / (np.abs(x).max() + 1e-9) * niveau


def piece(x, g=1.0):
    """Atelier encombré : réflexions courtes, un peu de tôle."""
    y = filtre(x, "low", 3800)
    out = x.copy()
    for d, k in ((0.009, 0.12), (0.017, 0.09), (0.029, 0.06), (0.047, 0.04)):
        out[int(d * SR) :] += y[: len(x) - int(d * SR)] * k * g
    return out


def rogner(x):
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.008, e.max() * 0.05))[0]
    return x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]


def voix(nom):
    x = lire(os.path.join(DOSSIER, nom + ".opus"))
    if nom == "F30":
        x = filtre(x, "high", 80)[: int(COUPE_F30 * SR)]
    else:
        x = rogner(filtre(x, "high", 80))
    x = x / (np.sqrt((x**2).mean()) + 1e-9)
    if nom.startswith("V"):
        x = np.tanh(x * 0.1 * 1.2) / 1.2  # voix off du magazine, studio
    elif nom.startswith("J"):
        x = piece(np.tanh(x * 0.085 * 1.2) / 1.2, 1.2)  # journaliste, hors du micro tendu
    else:
        x = piece(np.tanh(x * 0.11 * 1.5) / 1.5, 0.7)  # Frédéric, micro sous le nez
    x = filtre(x, "band", [90, 9500])
    x *= env(len(x), 0.004, 0.001 if nom == "F30" else 0.03)
    return np.concatenate([x, np.zeros(int(0.06 * SR))]) if nom != "F30" else x


T = {
    "V01": "Chaque matin, avant de réparer les imprimantes de Porkonia, Frédéric fume de la porcana. Aujourd'hui, il accepte un autre défi : dire la vérité.",
    "J01": "Vous en fumez tous les matins ?",
    "F01": "Tous les matins. Sinon les imprimantes sentent que j'ai peur.",
    "J02": "C'est votre première réponse et vous avez déjà commencé.",
    "F02": "Non, là c'est de la maintenance préventive.",
    "J03": "Une journée sans mentir.",
    "F03": "Facile. J'ai déjà fait huit ans.",
    "J04": "On va commencer par douze minutes. Je lance le chronomètre. Quel est votre métier ?",
    "F04": "Réparateur d'imprimantes. Docteur, même. Le recto verso, c'est moi qui l'ai inventé.",
    "J05": "Quatre secondes.",
    "F05": "Vous m'avez demandé mon métier, pas de fermer ma gueule.",
    "J06": "Vous avez inventé le recto verso ?",
    "F06": "Pendant ma coloscopie. Le médecin pouvait plus imprimer le compte rendu. Moi, avec sa caméra dans le cul, j'ai trouvé la solution.",
    "J07": "Quelle solution ?",
    "F07": "Imprimer sur les deux faces du papier des chiottes. Diagnostic devant, recommandations derrière.",
    "J08": "Le papier toilette est absorbant.",
    "F08": "C'est pour ça que les informations restent. Faut réfléchir, putain.",
    "J09": "Et les recommandations ?",
    "F09": "« Arrêtez le saucisson. » J'ai demandé un deuxième avis.",
    "J10": "À qui ?",
    "F10": "Au charcutier.",
    "J11": "Puisque vous maîtrisez le recto verso, faites-nous une démonstration.",
    "F11": "Cette salope prend deux feuilles quand j'en demande une.",
    "J12": "Elle est réparée ?",
    "F12": "Mécaniquement, oui. Moralement, c'est une grosse merde.",
    "J13": "Vous avez nettoyé les rouleaux ?",
    "F13": "Oui.",
    "J14": "Avec quoi ?",
    "F14": "La serviette de mon sandwich.",
    "J15": "Il y avait de la graisse dessus.",
    "F15": "Lubrification. Vous connaissez rien aux imprimantes.",
    "J16": "Votre diplôme est entièrement blanc.",
    "F16": "Encre confidentielle.",
    "J17": "Vous l'avez imprimé ici ?",
    "J18": "Avec la machine en panne ?",
    "F18": "Elle imprime très bien le blanc.",
    "J19": "Et le jury ?",
    "F19": "Douze ingénieurs. Tous debout. Y en a un qui a vomi tellement c'était technique.",
    "J20": "Qu'est-ce que vous leur aviez présenté ?",
    "F20": "Un bac papier.",
    "J21": "Pourquoi aurait-il vomi ?",
    "F21": "J'avais posé mon slip dedans pour expliquer les traces de transfert.",
    "F22": "Une thèse, ça doit laisser une marque.",
    "J22": "Donnez-nous simplement une vérité.",
    "F23": "Je suis propre.",
    "J23": "Votre polo sent le cendrier et le pâté chaud.",
    "F24": "J'ai pris une douche hier.",
    "J24": "Hier ?",
    "F25": "Bon. J'ai rincé mes couilles au lavabo de l'atelier.",
    "J25": "C'est le lavabo où vous lavez les pièces ?",
    "F26": "Les deux avaient du dépôt.",
    "J26": "Vous voyez ? Là, vous venez de dire la vérité.",
    "F27": "Vous allez pas diffuser ça, connard ?",
    "J27": "Bilan : quatre secondes sans mentir et un aveu que personne ne voulait entendre.",
    "F28": "Votre chronomètre est faux. J'ai entraîné le mec qui a inventé les secondes.",
    "J28": "On coupe.",
    "F29": "Il chronométrait ma coloscopie. Au bout de douze heures, le médecin m'a demandé de revenir travailler chez eux.",
    "F30": "C'est moi qui ai réparé la caméra, d'ailleurs. Avec le cul. Sans les ma—",
}


def bip(n=1):
    """Bip de chronomètre numérique : un vrai bip, court et aigu."""
    out = []
    for _ in range(n):
        t = np.arange(int(0.07 * SR)) / SR
        out += [np.sign(np.sin(2 * np.pi * 4000 * t)) * 0.3 * env(len(t), 0.002, 0.005), np.zeros(int(0.06 * SR))]
    return filtre(np.concatenate(out), "band", [1500, 7000]) * 0.08


def imprimante(bourrage=True):
    """Moteur d'imprimante jet d'encre : entraînement, chariot qui va et vient, puis bourrage et bip d'erreur."""
    d = 3.6 if bourrage else 2.4
    t = np.arange(int(d * SR)) / SR
    moteur = filtre(np.sin(2 * np.pi * 110 * t) + 0.5 * np.sign(np.sin(2 * np.pi * 220 * t)), "band", [150, 2200])
    moteur *= 0.5 + 0.5 * (np.sin(2 * np.pi * 1.6 * t) > 0)  # le chariot
    x = moteur * 0.02 + filtre(_rng.standard_normal(len(t)), "band", [800, 5000]) * 0.006
    if bourrage:
        i = int(2.3 * SR)
        x[i:] *= np.linspace(1, 0.1, len(x) - i)
        froisse = filtre(_rng.standard_normal(int(0.5 * SR)), "band", [1200, 7000]) * np.exp(-np.arange(int(0.5 * SR)) / SR * 6) * 0.05
        x[i : i + len(froisse)] += froisse
        x[i + int(0.05 * SR) : i + int(0.05 * SR) + int(0.25 * SR)] += filtre(_rng.standard_normal(int(0.25 * SR)), "low", 400) * 0.04
        b = bip(3) * 0.8
        j = int(2.9 * SR)
        x[j : j + len(b)] += b[: len(x) - j]
    return piece(x * env(len(x), 0.05, 0.1))


def papier():
    """Feuille qu'on manipule : froissement bref."""
    n = int(0.45 * SR)
    x = filtre(_rng.standard_normal(n), "band", [1500, 8000]) * (np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 7)) ** 2) * 0.02
    return piece(x * env(n, 0.02, 0.1))


# Événements : ("p", plan, décor) · ("v", réplique, écart) · ("x", signal, décalage, avance) · ("s", silence) · ("fin",)
D = [
    ("p", "01_matin", "cuisine"),
    ("s", 0.5),
    ("v", "V01", 0.0),
    ("v", "J01", 0.6),
    ("v", "F01", 0.5),
    ("v", "J02", 0.6),
    ("v", "F02", 0.4),
    ("s", 1.0),
    ("p", "02_defi", "atelier"),
    ("v", "J03", 0.5),
    ("v", "F03", 0.5),
    ("v", "J04", 0.6),
    ("x", bip(1), 0.0, False),  # il lance le chronomètre
    ("v", "F04", 0.5),
    ("x", bip(2), 0.2, True),
    ("v", "J05", 0.3),
    ("v", "F05", 0.4),
    ("s", 1.0),
    ("p", "03_recto_verso", "atelier"),
    ("v", "J06", 0.5),
    ("v", "F06", 0.5),
    ("v", "J07", 0.5),
    ("v", "F07", 0.4),
    ("v", "J08", 0.6),
    ("v", "F08", 0.4),
    ("v", "J09", 0.6),
    ("v", "F09", 0.4),
    ("s", 1.3),  # pause
    ("v", "J10", 0.0),
    ("v", "F10", 0.5),
    ("s", 1.0),
    ("p", "04_imprimante", "atelier"),
    ("v", "J11", 0.5),
    ("v", "F11", 0.5),
    ("v", "J12", 0.5),
    ("v", "F12", 0.4),
    ("x", imprimante(), 0.4, True),  # moteur, puis bourrage
    ("v", "J13", 0.4),
    ("v", "F13", 0.3),
    ("v", "J14", 0.4),
    ("v", "F14", 0.4),
    ("v", "J15", 0.5),
    ("v", "F15", 0.4),
    ("s", 1.0),
    ("p", "05_doctorat", "atelier"),
    ("x", papier(), 0.1, True),
    ("v", "J16", 0.2),
    ("v", "F16", 0.5),
    ("v", "J17", 0.5),
    ("v", "F13", 0.3),
    ("v", "J18", 0.4),
    ("v", "F18", 0.4),
    ("v", "J19", 0.6),
    ("v", "F19", 0.4),
    ("v", "J20", 0.6),
    ("v", "F20", 0.4),
    ("v", "J21", 0.6),
    ("v", "F21", 0.4),
    ("s", 2.4),  # silence long
    ("v", "F22", 0.0),
    ("s", 1.0),
    ("p", "06_verite", "atelier"),
    ("v", "J22", 0.5),
    ("v", "F23", 0.5),
    ("v", "J23", 0.6),
    ("v", "F24", 0.4),
    ("v", "J24", 0.5),
    ("v", "F25", 0.5),
    ("v", "J25", 0.6),
    ("v", "F26", 0.4),
    ("s", 1.0),  # une seconde
    ("v", "J26", 0.0),
    ("v", "F27", 0.3),
    ("s", 1.0),
    ("p", "07_bilan", "atelier"),
    ("v", "J27", 0.5),
    ("v", "F28", 0.4),
    ("v", "J28", 0.5),
    ("v", "F29", 0.2),
    ("s", 0.6),  # le journaliste baisse le micro
    ("v", "F30", 0.0),
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
        sous.append({"at": round(t, 2), "dur": round(len(s) / SR - (0.06 if nom != "F30" else 0), 2), "voix": nom, "text": T[nom]})
        t += len(s) / SR - (0.06 if nom != "F30" else 0)
    elif k == "x":
        _, s, ecart, avance = ev
        pistes.append((t + ecart, s))
        if avance:
            t += ecart + len(s) / SR
    elif k == "s":
        t += ev[1]
DUREE = t
n = int(DUREE * SR)
mix = np.zeros(n + 10 * SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s
mix = mix[:n]

# Décors : cuisine (frigo qui ronronne, horloge) ; atelier (néon qui ronfle, ventilateur d'imprimante, secteur).
tt = np.arange(n) / SR
frigo = lire(os.path.join(ICI, "sons", "bruitages", "bourdon.opus"))
frigo = np.tile(frigo, n // len(frigo) + 1)[:n]
frigo = filtre(frigo / (np.abs(frigo).max() + 1e-9), "band", [60, 1500]) * 0.012
tic = np.zeros(n)
for k in range(int(DUREE)):
    i = int(k * SR)
    c = filtre(_rng.standard_normal(int(0.01 * SR)), "band", [2000, 6000]) * 0.006
    tic[i : i + len(c)] += c
cuisine = frigo + tic
neon = filtre(sum(np.sin(2 * np.pi * 100 * h * tt) / h for h in range(1, 10)), "band", [90, 2500]) * 0.0035
vent = lire(os.path.join(ICI, "sons", "bruitages", "ventilation.opus"))
vent = np.tile(vent, n // len(vent) + 1)[:n]
vent = filtre(vent / (np.abs(vent).max() + 1e-9), "band", [200, 3000]) * 0.007
atelier = neon + vent + filtre(_rng.standard_normal(n), "band", [100, 3000]) * 0.0015
fond = np.zeros(n)
for k, (t0, decor) in enumerate(decors):
    a, b = int(t0 * SR), int((decors[k + 1][0] if k + 1 < len(decors) else DUREE) * SR)
    fond[a:b] = {"cuisine": cuisine, "atelier": atelier}[decor][a:b]
mix += fond
mix = mix / np.abs(mix).max() * 0.9
mix[-int(0.003 * SR) :] *= np.linspace(1, 0, int(0.003 * SR))  # coupe franche, sans clic
plans.append(["noir", round(DUREE, 2)])
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "fred-sans-mentir.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "fred-sans-mentir.wav"), os.path.join(SORTIE, "fred-sans-mentir.mp3"))
json.dump({"duree": round(DUREE, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "fred-sans-mentir.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(DUREE, 1), plans)
