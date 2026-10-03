"""Mixage de « Ferme ta gueule et réponds », épisode 2 (questions 4 à 8) : voix, bruitages, public, plans et scores.
Voix : voix/ftg-ep2/*.opus (ElevenLabs v4 ; Martin : Qwen ; ftg-ep2-repliques.json). Sortie : sortie/ftg-ep2.wav, .mp3
et .json (plans, sous-titres, scores) ; puis « python3 programme.py sortie/ftg-ep2.json \"FERME TA GUEULE ET RÉPONDS · Épisode 2\" »."""
import json
import os
import numpy as np
from scipy import signal
from scipy.io import wavfile

from commun import ICI, SORTIE, encoder_mp3, lire

SR = 44100  # identique à commun.SR
rng = np.random.default_rng(12)


def filtre(x, kind, f, o=2):
    return signal.sosfilt(signal.butter(o, f, kind, fs=SR, output="sos"), x)


def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def voix(nom, fin=None, debut=0.0):
    """Nettoie une réplique : bords coupés, silences internes resserrés, niveau égal."""
    x = lire(os.path.join(ICI, "voix", "ftg-ep2", nom + ".opus"))
    if fin:
        x = x[: int(fin * SR)]
    x = x[int(debut * SR) :]
    x = filtre(x, "high", 90)
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    actif = e > max(0.012, e.max() * 0.06)
    idx = np.nonzero(actif)[0]
    x = x[max(0, idx[0] * n - n) : min(len(x), (idx[-1] + 2) * n)]
    actif = actif[max(0, idx[0] - 1) : idx[-1] + 2]
    # silences internes plafonnés à 0,34 s : le rythme d'un plateau, pas celui d'une lecture
    morceaux, blanc = [], 0
    for k, a in enumerate(actif):
        blanc = 0 if a else blanc + 1
        if blanc * n / SR <= 0.34:
            morceaux.append(x[k * n : (k + 1) * n])
    x = np.concatenate(morceaux) if morceaux else x
    x = x / (np.sqrt((x**2).mean()) + 1e-9) * 0.11
    x = np.tanh(x * 1.6) / 1.6
    return x * env(len(x), 0.004, 0.03)


# ---------------------------------------------------------------- bruitages
def t_(d):
    return np.arange(int(d * SR)) / SR


def scie(f, t):
    return 2 * ((f * t) % 1) - 1


def jingle(d=4.2):
    """Jingle synthé et cuivres bon marché : montée d'arpège, accord tenu, coup de cymbale."""
    out = np.zeros(int(d * SR))
    notes = [(0.00, 392.0, 0.14), (0.14, 523.3, 0.14), (0.28, 659.3, 0.14), (0.42, 784.0, 0.22), (0.70, 659.3, 0.12), (0.84, 784.0, 0.5)]
    for t0, f, dur in notes:
        t = t_(dur + 0.1)
        s = sum(scie(f * k, t) for k in (1.0, 1.006, 0.497))
        s = filtre(s, "low", 2600) * env(len(t), 0.01, 0.08) * 0.22
        out[int(t0 * SR) : int(t0 * SR) + len(s)] += s[: len(out) - int(t0 * SR)]
    # accord final de « cuivres » : do majeur, filtre qui s'ouvre, vibrato de synthé d'occasion
    t = t_(d - 1.4)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.5 * t)
    accord = sum(scie(f * vib, t) + 0.6 * scie(f * 1.004 * vib, t) for f in (261.6, 329.6, 392.0, 523.3))
    ouverture = np.minimum(1, t / 0.25)
    accord = filtre(accord, "low", 1400) * (0.5 + 0.5 * ouverture) + filtre(accord, "high", 1400) * 0.15 * ouverture
    accord *= env(len(t), 0.03, 1.2) * 0.13
    out[int(1.4 * SR) : int(1.4 * SR) + len(accord)] += accord
    # batterie : grosse caisse et caisse claire, cymbale
    for t0 in (0.0, 0.42, 0.84, 1.4):
        k = t_(0.25)
        grosse = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-k * 18) + 45) / SR) * np.exp(-k * 14) * 0.5
        out[int(t0 * SR) : int(t0 * SR) + len(grosse)] += grosse
    for t0 in (0.28, 0.70, 1.26, 1.33):
        c = t_(0.18)
        claire = filtre(rng.standard_normal(len(c)), "band", [1200, 6000]) * np.exp(-c * 25) * 0.25
        out[int(t0 * SR) : int(t0 * SR) + len(claire)] += claire
    c = t_(2.6)
    cymbale = filtre(rng.standard_normal(len(c)), "high", 5000) * np.exp(-c * 1.6) * 0.18
    out[int(1.4 * SR) : int(1.4 * SR) + len(cymbale)] += cymbale
    # cassette un peu fatiguée
    out = np.tanh(out * 1.3)
    return filtre(out, "low", 9000) * env(len(out), 0.002, 0.3)


def buzzer():
    t = t_(0.34)
    s = np.sign(np.sin(2 * np.pi * 150 * t)) + np.sign(np.sin(2 * np.pi * 157 * t))
    return filtre(np.tanh(s * 2), "low", 3500) * env(len(t), 0.002, 0.03) * 0.16


def ding():
    t = t_(0.9)
    s = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((1568, 1), (3136, 0.35), (4702, 0.15)))
    return s * np.exp(-t * 5) * env(len(t), 0.002, 0.05) * 0.2


def erreur():
    out = []
    for f in (330, 247):
        t = t_(0.3)
        s = np.tanh(3 * (scie(f, t) + scie(f * 1.01, t)))
        out.append(filtre(s, "low", 2200) * env(len(t), 0.005, 0.04) * 0.14)
    return np.concatenate(out)


def clap():
    t = t_(0.12)
    s = filtre(rng.standard_normal(len(t)), "band", [900, 3500]) * np.exp(-t * 60)
    return s * 0.5


def frigo(d):
    t = t_(d)
    moteur = sum(np.sin(2 * np.pi * f * t) / k for k, f in enumerate((50, 100, 150, 200), 1)) * 0.03
    souffle = filtre(rng.standard_normal(len(t)), "band", [80, 400]) * 0.02
    return (moteur + souffle) * env(len(t), 0.4, 0.5)


def calculatrice():
    out = np.zeros(int(1.5 * SR))
    for i, t0 in enumerate((0.0, 0.22, 0.42, 0.62, 0.9)):
        t = t_(0.06)
        bip = np.sin(2 * np.pi * 2700 * t) * env(len(t), 0.002, 0.02) * 0.08
        clic = filtre(rng.standard_normal(len(t)), "high", 3000) * np.exp(-t * 200) * 0.2
        s = bip + clic
        out[int(t0 * SR) : int(t0 * SR) + len(s)] += s
    return out


APPLAUDI = lire(os.path.join(ICI, "sons", "applaudissements.opus"))


def applaudissements(d, debut=0.6, niveau=0.8):
    x = APPLAUDI[int(debut * SR) : int((debut + d) * SR)].copy()
    return x * env(len(x), 0.15, min(d * 0.6, 2.5)) * niveau


# ---------------------------------------------------------------- bruitages propres à l'épisode 2
def alarme():
    """Alarme de voiture sur le parking, au loin (la Palou a entendu son nom) : deux tons qui alternent, étouffés."""
    out = []
    for k in range(10):
        f = 760 if k % 2 == 0 else 1020
        t = t_(0.16)
        s = np.sign(np.sin(2 * np.pi * f * t)) * 0.6 + np.sin(2 * np.pi * f * 2 * t) * 0.2
        out.append(s * env(len(t), 0.005, 0.02))
    x = filtre(np.concatenate(out), "band", [400, 2200]) * 0.05
    echo = np.zeros(len(x) + int(0.18 * SR))
    echo[: len(x)] += x
    echo[int(0.18 * SR) :] += x * 0.4
    return echo * env(len(echo), 0.2, 0.6)


def vibreur():
    """Le collègue de Kevin vibre sous le pupitre."""
    out = np.zeros(int(1.4 * SR))
    for t0 in (0.0, 0.7):
        t = t_(0.4)
        s = np.sin(2 * np.pi * 160 * t) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 22 * t))) * env(len(t), 0.01, 0.03)
        out[int(t0 * SR) : int(t0 * SR) + len(s)] += filtre(s, "band", [120, 900]) * 0.07
    return out


def neon(d=4.0):
    """Les néons grésillent : bourdonnement à 100 Hz et craquements au hasard."""
    t = t_(d)
    hum = sum(np.sin(2 * np.pi * 100 * k * t) / k for k in range(1, 9)) * 0.02
    craque = np.zeros(len(t))
    for _ in range(int(d * 7)):
        i = rng.integers(0, len(t) - 2000)
        craque[i : i + 600] += filtre(rng.standard_normal(600), "high", 2500) * rng.uniform(0.04, 0.12)
    return (hum + craque) * env(len(t), 0.05, 0.4)


def capuche(nom, debut=0.0, fin=None):
    """La capuche : voix murmurée descendue d'un ton, collée au micro (graves gonflés, saturation douce), sèche."""
    x = voix(nom, fin=fin, debut=debut)
    k = 2 ** (-2.2 / 12)
    x = np.interp(np.arange(0, len(x), k), np.arange(len(x)), x)
    x = x + filtre(x, "low", 220) * 1.4
    x = np.tanh(x * 2.2) / 2.2
    return x * 1.15


def clap_seul():
    """Le chauffeur de salle applaudit tout seul, puis renonce."""
    out = np.zeros(int(2.4 * SR))
    for k, t0 in enumerate((0.0, 0.42, 0.86, 1.36, 1.98)):
        c = clap() * (0.9 - k * 0.15)
        out[int(t0 * SR) : int(t0 * SR) + len(c)] += c
    return out


def choeur():
    """« … ET RÉPONDS ! » : cinq voix du public, un peu décalées, comme une salle entière."""
    morceaux = [voix(n) for n in ("P1", "P2", "P3", "P4", "P5")]
    n = max(len(m) for m in morceaux) + int(0.2 * SR)
    out = np.zeros(n)
    for k, m in enumerate(morceaux):
        d = int((0.0, 0.03, 0.06, 0.02, 0.08)[k] * SR)
        out[d : d + len(m)] += m * 0.55
    salle = out.copy()
    for retard, g in ((0.03, 0.25), (0.07, 0.15), (0.12, 0.08)):
        salle[int(retard * SR) :] += out[: len(out) - int(retard * SR)] * g
    return salle


def brasswagen():
    """La plus courte pub du monde : un mot, un accord, terminé."""
    v = voix("B01")
    t = t_(1.6)
    accord = sum(scie(f, t) for f in (196.0, 246.9, 293.7, 392.0)) / 4
    accord = filtre(accord, "low", 1800) * env(len(t), 0.02, 0.9) * 0.08
    out = np.zeros(max(len(v), len(accord)) + int(0.2 * SR))
    out[: len(accord)] += accord
    out[: len(v)] += v
    return out


# ---------------------------------------------------------------- déroulé
PLANS = {
    "logo": {"image": "logo", "fond": "#661323"},
    "public": {"image": "public", "focus": [0.45, 0.35], "zoom": 1.1},
    "plateau": {"image": "plateau", "focus": [0.5, 0.4]},
    "animateur": {"image": "animateur", "focus": [0.42, 0.35], "zoom": 1.15},
    "crispe": {"image": "animateur-crispe", "focus": [0.3, 0.4], "zoom": 1.1},
    "frederic": {"image": "frederic", "focus": [0.45, 0.35], "zoom": 1.1},
    "kevin": {"image": "kevin", "focus": [0.45, 0.35], "zoom": 1.1},
    "martin": {"image": "martin", "focus": [0.45, 0.35], "zoom": 1.1},
    "tonio": {"image": "tonio", "focus": [0.42, 0.35], "zoom": 1.1},
    "buzzer": {"image": "buzzer", "focus": [0.6, 0.6], "zoom": 1.1},
    "kevin-tel": {"image": "ftg2_kevin_telephone", "focus": [0.45, 0.45], "zoom": 1.1},
    "mains": {"image": "ftg2_animateur_mains", "focus": [0.4, 0.4], "zoom": 1.12},
    "capuche-large": {"image": "ftg2_capuche_entree", "focus": [0.86, 0.3], "zoom": 1.05},
    "capuche": {"image": "ftg2_capuche_gros_plan", "focus": [0.66, 0.38], "zoom": 1.25},
    "fred-emu": {"image": "ftg2_frederic_emu", "focus": [0.45, 0.4], "zoom": 1.12},
    "jury": {"image": "ftg2_jury", "focus": [0.35, 0.5], "zoom": 1.15},
    "tonio-doigts": {"image": "ftg2_tonio_doigts", "focus": [0.55, 0.45], "zoom": 1.12},
    "brasswagen": {"chemin": "brasswagen/logo.png", "fond": "#1c1626"},
}

V = lambda nom, plan, texte, ecart=0.35, fin=None: ("voix", nom, plan, ecart, texte, fin)
CAP = lambda nom, plan, texte, ecart=0.35, debut=0.0, fin=None: ("capuche", nom, plan, ecart, texte, (debut, fin))
S = lambda son, plan, ecart=0.1, attend=True: ("son", son, plan, ecart, attend, None)
SCORE = lambda f, k, m, t: ("score", (f, k, m, t), None, 0, None, None)
DEROULE = [
    S("jingle", "logo", 0.0),
    V("M01", "public", "On applaudit, on est de retour !", 0.1),
    S("applaudi3", "public", 0.1),
    V("J01", "animateur", "Rebonsoir ! Les scores : Martin, un point. Frédéric… zéro.", 0.3),
    V("F01", "frederic", "Zéro, c'est rien. J'ai déjà été déclaré mort trois fois. Les trois fois, j'ai rappelé l'hôpital pour me plaindre du service.", 0.4),
    V("J02", "animateur", "Et ils ont fait quoi ?", 0.35),
    V("F02", "frederic", "Ils m'ont offert un quatrième séjour, mon vieux.", 0.3),
    # Question 4
    V("J03", "plateau", "Question quatre ! À quelle température à cœur un rôti de porc est-il bien cuit ?", 0.9),
    S("vibreur", "kevin-tel", 0.4),
    V("J04", "animateur", "Kevin. Le téléphone est interdit.", 0.2),
    V("K01", "kevin-tel", "C'est… c'est pas un téléphone. C'est un c-collègue.", 0.4),
    V("J05", "animateur", "Le jury ?", 0.4, 1.1),
    V("D01", "jury", "Accordé.", 0.6),
    S("buzzer", "buzzer", 0.3),
    V("K02", "kevin", "S-soixante-huit degrés. Et on le laisse reposer. Comme moi le week-end.", 0.15),
    S("ding", "kevin", 0.1),
    SCORE(0, 1, 1, 0),
    V("J06", "animateur", "Un point pour Kevin ! Et pour son collègue.", 0.2),
    V("F03", "frederic", "Je réclame ce point. J'ai pensé « soixante-huit » avant lui. Très fort. J'ai un témoin.", 0.4),
    V("J07", "crispe", "Qui ?", 0.35, 1.1),
    V("F04", "frederic", "Moi. À sept ans. Je m'étais prévenu.", 0.4),
    # Question 5
    V("J08", "plateau", "Question cinq ! Combien de roues sur une Brasswagen Palou ?", 0.9),
    S("alarme", "tonio", 0.3),
    V("T01", "tonio", "C'est elle. Elle a entendu son nom.", 0.2),
    S("buzzer", "buzzer", 0.4),
    V("T02", "tonio", "Six. Quatre roues, celle de secours… et le volant. Euh… non. Le volant, on roule pas dessus. Quatre.", 0.15),
    V("T03", "tonio", "Vous parlez de la Palou d'avant l'accident ou d'après ?", 0.5),
    V("J09", "crispe", "Il n'y a pas eu d'accident, Tonio.", 0.35),
    V("T04", "tonio", "Pas encore.", 0.7),
    S("ding", "animateur", 0.5),
    SCORE(0, 1, 1, 1),
    V("J10", "animateur", "Quatre. Un point.", 0.1),
    # Question 6
    V("J11", "plateau", "Question six ! Combien de pattes a un cochon ?", 0.9),
    S("buzzer", "buzzer", 0.2),
    V("F05", "frederic", "Cinq. Avec celle qu'il garde pour les grandes occasions.", 0.15),
    S("silence2", "mains", 0.0),
    V("J12", "mains", "Je vais faire comme si je n'avais rien entendu.", 0.0),
    V("MA1", "martin", "Quatre. En Chine, quatre aussi. Mais mieux finies.", 0.6),
    S("ding", "martin", 0.1),
    SCORE(0, 1, 2, 1),
    V("J13", "animateur", "Un point pour Martin.", 0.2),
    # L'intrus
    S("neon", "capuche-large", 0.5, False),
    S("silence2", "capuche-large", 0.0),
    CAP("C01", "capuche", "Bonsoir. Je viens pour la vidange.", 0.2, 0.0, 2.9),
    CAP("C02", "capuche", "Qui c'est qui a chié dans le présentoir à jambon ? Je vais vous enculer vos pupitres un par un, bande de sacs à foutre. Toi, le cochon, ta cravate pue la pisse de moine. Et vous, là-haut, dans le public, vous puez le cul de cave.", 0.8, 3.0),
    S("silence1", "capuche", 0.0),
    CAP("C03", "capuche", "Bon. Je vais rater mon bus.", 0.3),
    S("silence2", "capuche-large", 0.2),
    # Question 7, comme si de rien n'était
    S("jingle_court", "plateau", 0.0),
    V("J14", "plateau", "Question sept ! Une imprimante sort des pages de plus en plus pâles. Que faut-il changer ?", 0.1),
    S("silence2", "frederic", 0.2),
    S("buzzer", "buzzer", 0.0),
    V("K03", "kevin", "La… la cartouche ?", 0.15),
    S("ding", "kevin", 0.1),
    SCORE(0, 2, 2, 1),
    V("J15", "animateur", "La cartouche ! Un point pour Kevin. Frédéric, c'était votre spécialité…", 0.2),
    V("F06", "fred-emu", "Je ne réponds pas aux questions sur ma famille.", 0.5),
    V("F07", "fred-emu", "J'ai été élevé par une imprimante. Michèle. Elle imprimait mes devoirs. Un jour, elle est devenue pâle… Ils ont changé sa cartouche. Elle n'a plus jamais été la même.", 0.5),
    S("clap_seul", "public", 0.4),
    V("F08", "frederic", "J'insiste !", 0.2),
    V("J16", "animateur", "Vous avez déjà insisté, Frédéric.", 0.35),
    V("F09", "frederic", "Alors je revends mon « J'insiste » usagé. Douze porkos. Quelqu'un ?", 0.35),
    V("D02", "jury", "Refusé.", 0.7),
    V("F10", "frederic", "Je connais ce jury. Gérard, c'est moi qui t'ai appris à compter.", 0.35),
    V("D03", "jury", "Résultat : non.", 0.5),
    # La plus courte pub du monde
    S("brasswagen", "brasswagen", 0.5),
    V("J17", "animateur", "C'était la pub !", 0.0),
    # Question 8
    V("J18", "plateau", "Dernière question de la soirée ! À cent kilomètres-heure, combien de temps pour parcourir un milliard de kilomètres ?", 0.9),
    S("silence3", "tonio-doigts", 0.0),
    S("buzzer", "buzzer", 0.0),
    V("T05", "tonio-doigts", "Dix millions de minutes. Euh… non. D'heures. Dix millions d'heures.", 0.15),
    V("J19", "animateur", "Vous êtes sûr ?", 0.35),
    V("T06", "tonio", "J'insiste.", 0.5),
    S("calculatrice", "jury", 0.4),
    V("D04", "jury", "Résultat : dix millions d'heures.", 0.3),
    S("ding", "tonio", 0.2),
    V("M02", "public", "On applaudit !", 0.1),
    S("applaudi3", "public", 0.05),
    SCORE(0, 2, 2, 4),
    V("J20", "crispe", "Tonio double ses points… Quatre.", 0.2),
    V("T07", "tonio", "Je l'ai fait en vrai. C'est pour ça que je sais.", 0.5),
    V("J21", "crispe", "Tonio… dix millions d'heures, ça fait plus de mille ans.", 0.5),
    V("T08", "tonio", "Oui. Je suis parti tôt.", 0.6),
    # Fin
    V("J22", "animateur", "Les scores ! Tonio quatre, Kevin deux, Martin deux, Frédéric zéro.", 0.8),
    V("F11", "frederic", "Je porte plainte contre le chiffre zéro. J'ai déjà un avocat. Il est sous mon pupitre.", 0.4),
    V("MA2", "martin", "Votre cravate est moutarde. En Chine, on l'aurait mangée.", 0.5),
    V("J23", "animateur", "Restez avec nous : dans l'épisode trois, la finale ! Ferme ta gueule…", 0.5),
    S("choeur", "public", 0.05),
    S("applaudi2", "public", 0.0, False),
    V("H01", "public", "Et le jambon ?!", 1.7),
    S("jingle", "logo", 0.3),
]

SONS = {
    "jingle": jingle,
    "jingle_court": lambda: jingle()[: int(2.6 * SR)] * env(int(2.6 * SR), 0.002, 0.5),
    "buzzer": buzzer,
    "ding": ding,
    "calculatrice": calculatrice,
    "applaudi3": lambda: applaudissements(3.2, 0.8, 0.7),
    "applaudi2": lambda: applaudissements(2.6, 2.0, 0.5),
    "alarme": alarme,
    "vibreur": vibreur,
    "neon": lambda: neon(30.0),
    "clap_seul": clap_seul,
    "choeur": choeur,
    "brasswagen": brasswagen,
    "silence1": lambda: np.zeros(int(1.0 * SR)),
    "silence2": lambda: np.zeros(int(1.6 * SR)),
    "silence3": lambda: np.zeros(int(2.4 * SR)),
}
# Gains particuliers : l'homme du public crie par-dessus les applaudissements.
GAIN = {"H01": 1.5}
# Les sons qui ne retiennent pas la suite (fondus sous ce qui vient).
SOUS = {"applaudi3": 0.55, "applaudi2": 0.0, "neon": 0.0, "alarme": 0.35}

pistes = []  # (début, signal)
evenements = []  # plans, sous-titres, scores
t = 0.0
score = (0, 0, 1, 0)
evenements.append({"t": 0.0, "score": score})
intrus = None
for genre, src, plan, ecart, x5, x6 in DEROULE:
    if genre == "score":
        score = src
        evenements.append({"t": round(t, 2), "score": score})
        continue
    debut = max(0.0, t + ecart)
    if genre in ("voix", "capuche"):
        s = voix(src, x6) if genre == "voix" else capuche(src, *x6)
        s = s * GAIN.get(src, 1.0)
        evenements.append({"t": round(debut, 2), "plan": plan, "texte": x5, "dur": round(len(s) / SR, 2)})
    else:
        s = SONS[src]()
        evenements.append({"t": round(debut, 2), "plan": plan, "son": src})
        if src == "neon":
            intrus = [debut, None]
        if src == "jingle_court" and intrus:
            intrus[1] = debut
            # Les néons s'arrêtent net quand l'émission reprend comme si de rien n'était.
            for k, (d0, sig) in enumerate(pistes):
                if abs(d0 - intrus[0]) < 1e-6 and len(sig) == int(30.0 * SR):
                    pistes[k] = (d0, sig[: int((intrus[1] - d0) * SR)] * env(int((intrus[1] - d0) * SR), 0.05, 0.05))
    pistes.append((debut, s))
    t = debut + len(s) / SR * SOUS.get(src, 1.0)

duree = t + 0.6
mix = np.zeros(int(duree * SR) + SR)
for debut, s in pistes:
    i = int(debut * SR)
    mix[i : i + len(s)] += s[: len(mix) - i]
# Ambiance de plateau : souffle de ventilation très bas ; pendant l'intrus, la salle se tait (le souffle baisse).
amb = filtre(rng.standard_normal(len(mix)), "low", 900) * 0.004
if intrus and intrus[1]:
    a, b = int(intrus[0] * SR), int(intrus[1] * SR)
    amb[a:b] *= 0.3
mix += amb
mix = mix[: int(duree * SR)]
mix = filtre(mix, "low", 10500)
mix = np.tanh(mix * 1.2) / 1.2
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "ftg-ep2.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "ftg-ep2.wav"), os.path.join(SORTIE, "ftg-ep2.mp3"))
json.dump({"duree": round(duree, 2), "plans": PLANS, "evenements": evenements}, open(os.path.join(SORTIE, "ftg-ep2.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(duree, 1), "s ;", len([e for e in evenements if "texte" in e]), "répliques")
