"""« Les Dossiers d'Alvarez — Le Coup de Hamelot » (script de l'utilisateur ; sa version de l'affaire, pas le récit de
Porkopédia). Magazine d'enquête : François Alvarez, doux et très sérieux, accroupi devant ses CRT, mange du gâteau ;
Stanley Ferret raisonnable et content de lui ; le maire sortant outré ; la greffière sans émotion. Archives CCTV muettes,
bruit analogique ; reconstitutions étouffées ; le corbeau restitue la voix du maire (Appeau des Confidences).
Son : ronflement de CRT, musique d'enquête très grave (synthe.enquete), appeau, corbeau, clic de clé, toilettes brefs
et secs, coups contre la porte, couverts et chopes, applaudissements étouffés, chasse, magnétophone, verre, bière,
coupe nette. Voix : voix/dossiers-alvarez/*.opus. Sortie : sortie/dossiers-alvarez.wav, .mp3, .json."""
import json
import os

import numpy as np
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire
from synthe import enquete, env, filtre

DOSSIER = os.path.join(ICI, "voix", "dossiers-alvarez")
_rng = np.random.default_rng(31)


def bruitage(nom, niveau=0.4):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    return x / (np.abs(x).max() + 1e-9) * niveau


def reflets(x, prises, coupure=3500):
    y = filtre(x, "low", coupure)
    out = x.copy()
    for d, k in prises:
        out[int(d * SR) :] += y[: len(x) - int(d * SR)] * k
    return out


def piece(x, g=1.0):
    """Bureau, mairie : réflexions courtes et mates."""
    return reflets(x, ((0.012, 0.11 * g), (0.021, 0.08 * g), (0.037, 0.05 * g)))


def couloir(x):
    """Couloir carrelé : plus long, plus clair."""
    return reflets(x, ((0.03, 0.3), (0.061, 0.22), (0.097, 0.16), (0.14, 0.11), (0.2, 0.07)), 5000)


def derriere_porte(x):
    """À travers la porte des toilettes : grave, étouffé, une boîte carrelée."""
    y = filtre(x, "low", 900)
    y = reflets(y, ((0.006, 0.4), (0.013, 0.3), (0.022, 0.2)), 900)
    return couloir(y * 1.4)


def rogner(x):
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.008, e.max() * 0.05))[0]
    return x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]


# Traitement par réplique : « plateau » (Alvarez face caméra), « vo » (voix off de studio), « hc » (question hors
# champ), « itw » (interview, micro tendu), « recon » (reconstitution), « porte » (derrière la porte), « corbeau »,
# « regie » (hors micro), « agent » (au fond du couloir).
MODE = {"A01": "plateau", "A02": "plateau", "A25": "plateau", "A26": "plateau", "A27": "plateau",
        "A03": "vo", "A04": "vo", "A08": "vo", "A09": "vo", "A12": "vo", "A13": "vo", "A18": "vo", "A22": "vo",
        "A23": "vo", "A24": "vo", "R01": "porte", "R02": "porte", "S04": "recon", "S05": "recon", "S09": "recon",
        "R03": "recon_cri", "K01": "corbeau", "RG": "regie", "AG": "agent"}


def voix(nom):
    x = lire(os.path.join(DOSSIER, nom + ".opus"))
    x = rogner(filtre(x, "high", 80))
    x = x / (np.sqrt((x**2).mean()) + 1e-9)
    mode = MODE.get(nom, "hc" if nom.startswith("A") else "itw")
    if mode == "vo":
        x = np.tanh(x * 0.1 * 1.2) / 1.2
    elif mode == "plateau":
        x = piece(np.tanh(x * 0.1 * 1.2) / 1.2, 0.8)
    elif mode == "hc":
        x = piece(filtre(x, "band", [140, 7000]) * 0.075, 1.3)
    elif mode == "itw":
        x = piece(np.tanh(x * 0.1 * 1.3) / 1.3, 1.0)
    elif mode == "recon":
        x = piece(filtre(x, "band", [250, 3200]) * 0.06, 1.5)
    elif mode == "recon_cri":
        x = couloir(filtre(np.tanh(x * 0.12), "band", [250, 3200]) * 0.6)
    elif mode == "porte":
        x = derriere_porte(np.tanh(x * 0.12) * (0.5 if nom == "R01" else 0.6))
    elif mode == "corbeau":
        # La voix du maire restituée par un bec : bande étroite, nasillarde, un léger vibrato de gorge d'oiseau.
        y = filtre(x, "band", [600, 3600])
        t = np.arange(len(y)) / SR
        x = np.tanh(y * 0.12 * (1 + 0.25 * np.sin(2 * np.pi * 31 * t)) * 2) / 2 * 0.8
    elif mode == "regie":
        x = piece(filtre(x, "band", [200, 5000]) * 0.05, 1.8)
    elif mode == "agent":
        x = couloir(filtre(x, "band", [200, 4000]) * 0.045)
    x = filtre(x, "band", [70, 10000]) * env(len(x), 0.004, 0.03)
    return np.concatenate([x, np.zeros(int(0.06 * SR))])


T = {
    "A01": "Un homme entre aux toilettes. Un autre en ressort maire. Entre les deux : une clé, un corbeau… et une majorité qui avait déjà commencé le porc. Je suis François Alvarez. Ce soir, nous rouvrons le dossier de Hamelot. La porte aussi, si quelqu'un a le double.",
    "A02": "La probabilité d'une simple erreur de serrure est faible. Elle diminue encore quand celui qui ferme se présente aux élections.",
    "A03": "La réunion concerne les chemins agricoles. Le maire sortant quitte la salle pour chier. Stanley reste dans le couloir. Il sort son Appeau des Confidences : ce sifflet permet aux corbeaux de répéter ce qu'ils ont entendu, avec les voix.",
    "K01": "Oh putain… fallait pas reprendre la couenne.",
    "A04": "Stanley dispose maintenant d'une information que les autres candidats n'ont pas : le mandat est occupé.",
    "A05": "Vous avez utilisé un artefact de renseignement pour entendre le maire chier ?",
    "S01": "Je m'intéresse à la vie de la commune.",
    "A06": "À ce moment-là, précisément ?",
    "S02": "Il se passait quelque chose.",
    "A07": "Vous saviez qu'il ne pouvait pas revenir au conseil.",
    "S03": "Je savais qu'il avait un dossier difficile.",
    "A08": "La clé d'entretien est sur la serrure extérieure. Stanley la tourne et la retire. Il ne consulte personne. La porte non plus.",
    "R01": "Y a quelqu'un ? Pourquoi ça tourne dehors ?",
    "A09": "Il vérifie que la porte tient. Puis il rejoint le conseil. L'opposition est désormais à huis clos.",
    "M01": "J'étais maire quand j'ai baissé mon pantalon. Quand j'ai voulu le remonter, il était élu. Vous trouvez ça normal, vous ?",
    "A10": "À quel moment avez-vous compris ?",
    "M02": "J'ai entendu les applaudissements. Au début, j'ai cru qu'ils avaient entendu la chasse.",
    "A11": "Vous avez appelé à l'aide ?",
    "M03": "J'ai hurlé « FERRET, OUVRE CES PUTAINS DE CHIOTTES ! » Il m'a répondu « La séance a commencé. » J'étais censé la présider !",
    "A12": "Les conseillers demandent où se trouve le maire. Stanley répond qu'il s'est retiré. Un élu souhaite savoir s'il revient.",
    "S04": "Il règle les affaires intérieures.",
    "R02": "JE SUIS TOUJOURS MAIRE, BANDE DE CONS !",
    "S05": "On peut éviter la plomberie pendant le scrutin ?",
    "A13": "Les mains se lèvent. Le porc refroidit moins vite que la démocratie. Stanley est élu.",
    "A14": "Vous avez entendu le maire derrière la porte.",
    "G01": "Oui.",
    "A15": "Pourquoi l'avoir noté absent ?",
    "G02": "Il n'était pas dans la salle.",
    "A16": "Il était enfermé.",
    "G03": "C'est pour ça qu'il n'était pas dans la salle.",
    "A17": "Vous n'avez pas interrompu le vote ?",
    "G04": "J'avais demandé une pause. Ils ont voté contre.",
    "A18": "Le sifflet renseigne. La clé enferme. Les conseillers votent. Aucun de ces objets ne permet à Stanley de prétendre qu'il ignorait ce qui se passait. Nous lui soumettons notre conclusion.",
    "A19": "Vous avez volontairement enfermé le maire pour prendre sa place.",
    "S06": "Je n'ai pas pris sa place.",
    "A20": "Vous êtes maire.",
    "S07": "Sa place, c'était aux chiottes. Moi, j'étais au conseil.",
    "A21": "Vous comprenez ce qu'on vous reproche ?",
    "S08": "D'avoir été disponible.",
    "A22": "Après le repas, le maire sortant retrouve le couloir. Il a perdu sa fonction, mais conservé sa colère. Stanley lui propose une chaise.",
    "R03": "TA CHAISE, TU TE LA FOUS AU CUL !",
    "S09": "Elle appartient à la commune.",
    "A23": "Les deux hommes ne s'accordent pas sur la transition.",
    "A24": "Aujourd'hui, le trousseau repose sous une cloche. Les visiteurs baissent la voix. L'agent qui demande la clé du placard à balais doit attendre la fin de la cérémonie.",
    "A25": "J'estime à quatre-vingt-dix-neuf pour cent la probabilité que Stanley ait organisé ce coup.",
    "RG": "Et le dernier pour cent ?",
    "A26": "Il a peut-être tourné la clé avec le cul. Mais les images montrent une main.",
    "A27": "L'affaire est résolue. Elle n'est pas réglée.",
    "AG": "Qui a encore les clés ?",
}

# ----------------------------- Bruitages -----------------------------


def gateau(duree=1.2, niveau=0.05):
    """Alvarez mange son gâteau : petite fourchette sur l'assiette, mastication discrète."""
    n = int(duree * SR)
    x = np.zeros(n + SR)
    f = filtre(bruitage("fourchette", niveau * 0.8), "high", 1200)
    x[: len(f)] += f[: len(x)]
    t = 0.35
    while t < duree:
        m = filtre(bruitage(f"mastique-0{_rng.integers(1, 5)}", niveau * _rng.uniform(0.4, 0.7)), "low", 2500)
        i = int(t * SR)
        x[i : i + len(m)] += m[: len(x) - i]
        t += _rng.uniform(0.3, 0.45)
    return piece(x[:n] * env(n, 0.01, 0.2))


def appeau():
    """Appeau des Confidences : petit sifflet en bois, deux coups modulés."""
    out = []
    for f0, d in ((1650, 0.32), (1500, 0.5)):
        t = np.arange(int(d * SR)) / SR
        f = f0 * (1 + 0.05 * np.sin(2 * np.pi * 9 * t)) * (1 - 0.06 * t / d)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        s += filtre(_rng.standard_normal(len(t)), "band", [1200, 4000]) * 0.15
        out += [s * env(len(t), 0.03, 0.08), np.zeros(int(0.12 * SR))]
    return couloir(np.concatenate(out) * 0.08)


def croa(n=1):
    """Corbeau ordinaire : croassements rauques."""
    out = []
    for _ in range(n):
        d = _rng.uniform(0.28, 0.38)
        t = np.arange(int(d * SR)) / SR
        f0 = _rng.uniform(380, 460) * (1 - 0.2 * t / d)
        s = np.sign(np.sin(2 * np.pi * np.cumsum(f0) / SR)) * 0.5 + _rng.standard_normal(len(t)) * 0.6
        s = filtre(s * (1 + np.sin(2 * np.pi * 70 * t)), "band", [500, 3000])
        out += [s * env(len(t), 0.02, 0.1), np.zeros(int(_rng.uniform(0.12, 0.25) * SR))]
    return couloir(np.concatenate(out) * 0.06)


def humide():
    """Bruit humide bref et sec, derrière la porte. Pas plus."""
    d = 0.22
    t = np.arange(int(d * SR)) / SR
    s = filtre(_rng.standard_normal(len(t)), "band", [120, 900]) * np.exp(-t * 18)
    s += np.sin(2 * np.pi * (180 - 300 * t) * t) * np.exp(-t * 25) * 0.4
    return derriere_porte(s * 0.25)


def cle():
    """Clé tournée puis retirée, très sec."""
    x = filtre(bruitage("poignee", 0.2), "high", 500)
    return couloir(x[: int(0.9 * SR)])


def coups(n=4):
    out = []
    for k in range(n):
        out += [filtre(bruitage(f"toc-{1 + k % 3}", 0.35), "low", 700), np.zeros(int(_rng.uniform(0.12, 0.2) * SR))]
    return derriere_porte(np.concatenate(out) * 0.6)


def banquet(duree):
    """Conseil municipal en reconstitution : couverts et chopes, murmures étouffés."""
    n = int(duree * SR)
    x = filtre(_rng.standard_normal(n), "band", [200, 1200]) * 0.004 * (1 + 0.5 * np.sin(2 * np.pi * 0.3 * np.arange(n) / SR))
    t = 0.2
    while t < duree - 1:
        nom = _rng.choice(["fourchette", "ding-2", "bouteille-ferme"])
        s = bruitage(nom, 0.03 if nom == "fourchette" else 0.012)
        if nom == "ding-2":
            s = filtre(s, "low", 2500)
        i = int(t * SR)
        x[i : i + len(s)] += s[: n - i]
        t += _rng.uniform(0.6, 1.4)
    return piece(filtre(x, "low", 3000), 1.5)


def applaudissements(duree=2.6, niveau=0.05):
    x = lire(os.path.join(ICI, "sons", "applaudissements.opus"))
    x = x[int(1.0 * SR) : int((1.0 + duree) * SR)]
    x = x / (np.abs(x).max() + 1e-9) * niveau
    return derriere_porte(x * env(len(x), 0.3, 0.6))


def chasse():
    """Chasse d'eau : montée d'eau, glouglou, siphon."""
    d = 2.6
    t = np.arange(int(d * SR)) / SR
    s = filtre(_rng.standard_normal(len(t)), "band", [180, 2200]) * np.minimum(1, t * 4) * np.exp(-np.maximum(0, t - 1.2) * 1.6)
    s *= 1 + 0.3 * np.sin(2 * np.pi * 7 * t)
    return derriere_porte(s * 0.06)


def magneto():
    """Magnétophone : touche lecture enfoncée, moteur, souffle de bande."""
    d = 1.8
    t = np.arange(int(d * SR)) / SR
    clic = filtre(_rng.standard_normal(int(0.04 * SR)), "band", [400, 4000]) * np.exp(-np.arange(int(0.04 * SR)) / SR * 120)
    s = np.zeros(len(t))
    s[: len(clic)] += clic * 0.3
    s += (np.sin(2 * np.pi * 50 * t) * 0.004 + filtre(_rng.standard_normal(len(t)), "high", 3000) * 0.004) * env(len(t), 0.2, 0.3)
    return piece(s)


def verre():
    """Verre reposé sur la table."""
    s = filtre(bruitage("ding-2", 0.03), "low", 3000)[: int(0.6 * SR)]
    s[: int(0.03 * SR)] += filtre(_rng.standard_normal(int(0.03 * SR)), "band", [300, 3000]) * 0.04
    return piece(s)


def biere():
    """Alvarez prend enfin sa bière : verre soulevé, une gorgée."""
    s = np.zeros(int(1.5 * SR))
    v = verre()
    s[: len(v)] += v * 0.6
    t = np.arange(int(0.5 * SR)) / SR
    g = filtre(_rng.standard_normal(len(t)), "band", [200, 1200]) * np.exp(-((t - 0.25) ** 2) / 0.01) * 0.02
    s[int(0.7 * SR) : int(0.7 * SR) + len(t)] += g
    return piece(s)


# ----------------------------- Montage -----------------------------
# Événements : ("p", plan, décor) · ("v", réplique, écart) · ("x", signal, décalage, avance) · ("s", silence)
#              · ("musique", gain) · ("fin",)
# Décors : « crt » (plateau, ronflement des CRT), « cctv » (archive, bruit analogique), « itw » (pièce), « insert ».
D = [
    ("p", "10_alvarez_presentateur", "crt"),
    ("musique", 1.0),
    ("s", 1.4),
    ("v", "A01", 0.0),
    ("x", gateau(2.4), 0.3, True),  # il mange ; laisser un silence
    ("s", 0.8),
    ("v", "A02", 0.0),
    ("s", 1.2),
    ("p", "01_cctv_couloir", "cctv"),
    ("v", "A03", 0.6),
    ("x", appeau(), 0.4, True),
    ("x", croa(2), 0.2, True),
    ("s", 0.6),
    ("x", humide(), 0.0, True),
    ("v", "K01", 0.25),
    ("s", 1.4),  # silence
    ("v", "A04", 0.0),
    ("s", 1.2),
    ("p", "05_interview_stanley", "itw"),
    ("v", "A05", 0.5),
    ("v", "S01", 0.6),
    ("v", "A06", 0.7),
    ("v", "S02", 0.5),
    ("v", "A07", 0.6),
    ("v", "S03", 0.5),
    ("s", 1.2),
    ("p", "02_cctv_cle", "cctv"),
    ("v", "A08", 0.6),
    ("x", cle(), 0.1, True),  # clic sec
    ("v", "R01", 0.2),
    ("s", 2.0),  # deux secondes de silence
    ("v", "A09", 0.0),
    ("s", 1.2),
    ("p", "06_interview_maire", "itw"),
    ("v", "M01", 0.4),
    ("v", "A10", 0.7),
    ("v", "M02", 0.5),
    ("v", "A11", 0.7),
    ("v", "M03", 0.5),
    ("s", 1.2),
    ("p", "03_cctv_vote", "cctv"),
    ("banquet", 22.0),
    ("v", "A12", 0.6),
    ("v", "S04", 0.4),
    ("x", coups(4), 0.3, True),
    ("v", "R02", 0.0),
    ("v", "S05", 0.4),
    ("v", "A13", 0.7),
    ("x", applaudissements(), -1.4, False),
    ("s", 1.4),
    ("p", "07_interview_greffier", "itw"),
    ("v", "A14", 0.4),
    ("v", "G01", 0.5),
    ("v", "A15", 0.6),
    ("v", "G02", 0.4),
    ("v", "A16", 0.6),
    ("v", "G03", 0.4),
    ("s", 1.6),  # silence de François
    ("v", "A17", 0.0),
    ("v", "G04", 0.5),
    ("s", 1.2),
    ("p", "08_preuve_sifflet", "insert"),
    ("x", magneto(), 0.2, True),
    ("v", "A18", 0.0),
    ("s", 1.2),
    ("p", "05_interview_stanley", "itw"),
    ("v", "A19", 0.4),
    ("v", "S06", 0.5),
    ("v", "A20", 0.6),
    ("v", "S07", 0.5),
    ("s", 1.2),  # silence
    ("x", verre(), 0.0, True),  # léger bruit de verre reposé
    ("v", "A21", 0.4),
    ("v", "S08", 0.6),
    ("s", 1.2),
    ("p", "04_cctv_sortie", "cctv"),
    ("x", chasse(), 0.0, False),
    ("v", "A22", 1.0),
    ("v", "R03", 0.4),
    ("v", "S09", 0.5),
    ("v", "A23", 0.6),
    ("s", 1.2),
    ("p", "09_relique_cles", "insert"),
    ("musique", 0.45),  # musique réduite
    ("s", 1.0),  # une seconde de silence avant la voix
    ("v", "A24", 0.0),
    ("s", 1.4),
    ("p", "10_alvarez_presentateur", "crt"),
    ("musique", 1.0),
    ("v", "A25", 0.4),
    ("x", gateau(1.6), 0.3, True),  # la dernière bouchée
    ("v", "RG", 0.2),
    ("v", "A26", 0.6),
    ("x", biere(), 0.4, True),  # il repose l'assiette, prend enfin sa bière
    ("v", "A27", 0.3),
    ("s", 0.8),
    ("v", "AG", 0.0),
    ("s", 1.3),  # François regarde hors cadre
    ("fin",),
]

pistes, sous, plans, decors, musique, t = [], [], [], [], [], 0.0
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
        sous.append({"at": round(t, 2), "dur": round(len(s) / SR - 0.06, 2), "voix": nom, "text": T[nom]})
        t += len(s) / SR - 0.06
    elif k == "x":
        _, s, ecart, avance = ev
        pistes.append((t + ecart, s))
        if avance:
            t += ecart + len(s) / SR
    elif k == "s":
        t += ev[1]
    elif k == "musique":
        musique.append((t, ev[1]))
    elif k == "banquet":
        pistes.append((t, banquet(ev[1])))
    elif k == "fin":
        pass
DUREE = t
n = int(DUREE * SR)
mix = np.zeros(n + 10 * SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s
mix = mix[:n]

# Musique d'enquête excessivement grave, sous tout l'épisode ; réduite devant la relique.
m = enquete(DUREE) * 0.075
g = np.ones(n)
for k, (t0, gain) in enumerate(musique):
    fin = musique[k + 1][0] if k + 1 < len(musique) else DUREE
    g[int(t0 * SR) : int(fin * SR)] = gain
g = np.convolve(g, np.ones(int(0.8 * SR)) / int(0.8 * SR), mode="same")
mix += m[:n] * g

# Décors : ronflement des vieux CRT (15 734 Hz et bourdon 50 Hz) au plateau ; bruit analogique sur les archives CCTV
# (souffle large, ronflette de 50 Hz, craquements) ; pièce très discrète aux interviews.
tt = np.arange(n) / SR
crt = np.sin(2 * np.pi * 15734 * tt) * 0.003 + filtre(sum(np.sin(2 * np.pi * 50 * h * tt) / h for h in range(1, 6)), "low", 400) * 0.006
cctv = filtre(_rng.standard_normal(n), "band", [300, 9000]) * 0.006 + np.sin(2 * np.pi * 50 * tt) * 0.004
cctv += (_rng.random(n) > 0.9996) * _rng.standard_normal(n) * 0.05
salle = filtre(_rng.standard_normal(n), "band", [100, 2500]) * 0.0015
fond = np.zeros(n)
for k, (t0, decor) in enumerate(decors):
    a, b = int(t0 * SR), int((decors[k + 1][0] if k + 1 < len(decors) else DUREE) * SR)
    fond[a:b] = {"crt": crt, "cctv": cctv, "itw": salle, "insert": salle}[decor][a:b]
mix += fond
mix = mix / np.abs(mix).max() * 0.9
mix[-int(0.004 * SR) :] *= np.linspace(1, 0, int(0.004 * SR))  # couper net
plans.append(["noir", round(DUREE, 2)])
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "dossiers-alvarez.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "dossiers-alvarez.wav"), os.path.join(SORTIE, "dossiers-alvarez.mp3"))
json.dump({"duree": round(DUREE, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "dossiers-alvarez.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(DUREE, 1), plans)
