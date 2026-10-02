"""Mixage de « Ferme ta gueule et réponds », épisode 1 : voix, bruitages, applaudissements, plans et scores.
Voix : voix/ftg-ep1/*.opus (casting.json, ftg-ep1-repliques.json). Sortie : sortie/ftg-ep1.wav, .mp3 et .json
(plans, sous-titres, scores calés sur la bande) ; puis « python3 programme.py sortie/ftg-ep1.json » pour le pack."""
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


def voix(nom, fin=None):
    """Nettoie une réplique : bords coupés, silences internes resserrés, niveau égal."""
    x = lire(os.path.join(ICI, "voix", "ftg-ep1", nom + ".opus"))
    if fin:
        x = x[: int(fin * SR)]
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


# ---------------------------------------------------------------- déroulé
# Plans : image, cadrage, zoom.
PLANS = {
    "logo": {"image": "logo", "fond": "#661323"},
    "vitrine": {"image": "vitrine", "focus": [0.5, 0.55], "zoom": 1.15},
    "public": {"image": "public", "focus": [0.45, 0.35], "zoom": 1.1},
    "jambon": {"image": "public", "focus": [0.72, 0.6], "zoom": 2.0},
    "plateau": {"image": "plateau", "focus": [0.5, 0.4]},
    "animateur": {"image": "animateur", "focus": [0.42, 0.35], "zoom": 1.15},
    "crispe": {"image": "animateur-crispe", "focus": [0.3, 0.4], "zoom": 1.1},
    "candidats": {"image": "candidats", "focus": [0.5, 0.3]},
    "frederic": {"image": "frederic", "focus": [0.45, 0.35], "zoom": 1.1},
    "kevin": {"image": "kevin", "focus": [0.45, 0.35], "zoom": 1.1},
    "martin": {"image": "martin", "focus": [0.45, 0.35], "zoom": 1.1},
    "tonio": {"image": "tonio", "focus": [0.42, 0.35], "zoom": 1.1},
    "regie": {"image": "regie", "focus": [0.45, 0.6], "zoom": 1.15},
    "buzzer": {"image": "buzzer", "focus": [0.6, 0.6], "zoom": 1.1},
}

# (genre, source, plan, écart avant, texte, [scores après])
V = lambda nom, plan, texte, ecart=0.35, fin=None: ("voix", nom, plan, ecart, texte, fin)
S = lambda son, plan, ecart=0.1, attend=True: ("son", son, plan, ecart, attend, None)
SCORE = lambda f, k, m, t: ("score", (f, k, m, t), None, 0, None, None)
DEROULE = [
    S("frigo2", "vitrine", 0.0),
    S("clap", "vitrine", -1.2),
    V("L01", "public", "On garde les applaudissements pour Jean-Groin !", 0.3),
    V("L02", "jambon", "Et le jambon, on le garde jusqu'à quand ?", 0.5),
    S("jingle", "logo", 0.5),
    V("L03", "plateau", "Bonsoir ! Quatre candidats, douze questions, un an de porc et de bière ! Bienvenue dans « Ferme ta gueule et réponds » !", 0.2),
    S("applaudi5", "public", 0.1),
    V("L04b", "animateur", "Une bonne réponse, un point. Vous contestez avec « J'insiste » : vos points doublent si vous avez raison, ou retombent à zéro si vous avez tort. Une seule fois chacun. Deux finalistes. C'est compris ?", 0.3),
    V("L05", "frederic", "J'ai participé à la création du règlement, moi.", 0.4),
    V("L06", "crispe", "Parfait. Vous expliquerez aux autres pourquoi vous perdez.", 0.35),
    V("L07", "frederic", "Frédéric. Docteur en imprimantes, s'il vous plaît.", 0.9),
    V("L08", "frederic", "Et ancien négociateur, hein. J'ai inventé ce buzzer pendant une prise d'otages.", 0.35),
    V("L09", "animateur", "Ce soir, il servira juste à répondre.", 0.35),
    V("L10", "kevin", "Kevin, votre spécialité ?", 0.6),
    V("L11", "kevin", "La… la cu-cuisine assistée par in… intelligence artificielle. RangaNet. C'est… c'est mon meilleur ami. Mon seul ami.", 0.3),
    V("L12", "martin", "Martin ?", 0.5),
    V("L13", "martin", "Qui a validé cette finition ? En Chine, à Jingdezhen, on renvoie l'artisan pour moins que ça.", 0.5),
    V("L14b", "tonio", "Et Tonio, propriétaire d'une Brasswagen Palou.", 0.6),
    V("L15", "tonio", "Un kilo de milliards de mètres. Euh… non. Un milliard de kilomètres.", 0.45),
    V("L16", "animateur", "On va essayer de finir avant le deuxième.", 0.35),
    V("L17", "animateur", "Question un ! Une imprimante refuse d'imprimer parce qu'une feuille bloque le mécanisme. C'est un… ?", 0.9),
    S("buzzer", "buzzer", 0.15),
    V("L18", "frederic", "Bourrage papier.", 0.15),
    S("ding", "frederic", 0.1),
    SCORE(1, 0, 0, 0),
    V("L19", "frederic", "J'en ai débloqué une sous des tirs de kalachnikov, moi.", 0.5),
    V("L20", "animateur", "Question deux ! Quel matériau associe-t-on aux célèbres services de Limoges ?", 0.6),
    S("buzzer", "buzzer", 0.3),
    V("L21", "martin", "La porcelaine. Chinoise, évidemment. Comme toute porcelaine digne de ce nom.", 0.15),
    S("ding", "martin", 0.1),
    SCORE(1, 0, 1, 0),
    V("L22", "martin", "Le cadre derrière vous, c'est un lot ?", 0.5),
    V("L23c", "animateur", "Ah non !", 0.3),
    V("L24", "martin", "Pfff. C'est dommage. En Chine, il serait au musée. Ici… il sauverait le reste.", 0.4),
    V("L25", "plateau", "Question trois ! Trois caisses de douze bouteilles. Combien de bouteilles ?", 0.9),
    S("buzzer", "buzzer", 0.2),
    V("L26", "frederic", "Quarante-deux.", 0.15),
    S("erreur", "frederic", 0.15),
    V("L27c", "animateur", "Trente-six bouteilles.", 0.3),
    V("L28", "frederic", "Oui, au départ. Mais six sont arrivées en renfort. Ça, vous l'aviez pas vu venir.", 0.4),
    S("frigo3", "animateur", 0.2),
    V("L29", "crispe", "Ce sont des bouteilles, Frédéric.", 0.1),
    V("L30b", "frederic", "J'insiste !", 0.6),
    S("calculatrice", "regie", 0.5),
    V("L31", "regie", "Résultat : trente-six.", 0.3),
    S("erreur", "frederic", 0.4),
    SCORE(0, 0, 1, 0),
    V("L32", "frederic", "Votre écran compte mal, mon vieux. Je connais cette police, moi.", 0.4),
    V("L33", "crispe", "Vous me prenez pour un con ?", 0.4),
    V("L34", "frederic", "Non, non, non ! C'est vous qui me prenez pour un con !", 0.2),
    V("L35", "crispe", "Je ne vous prends pour rien. On tourne depuis deux heures. J'ai des images.", 0.4),
    S("applaudi2", "public", 0.1),
    V("L36", "animateur", "Restez avec nous : après la pub, question quatre !", 0.2),
    S("jingle", "logo", 0.3),
]

SONS = {
    "jingle": jingle,
    "buzzer": buzzer,
    "ding": ding,
    "erreur": erreur,
    "clap": clap,
    "calculatrice": calculatrice,
    "frigo2": lambda: frigo(2.6),
    "frigo3": lambda: frigo(2.8),
    "applaudi5": lambda: applaudissements(5.0, 0.8, 0.75),
    "applaudi2": lambda: applaudissements(2.2, 2.0, 0.45),
}

pistes = []  # (début, signal)
evenements = []  # plans, sous-titres, scores
t = 0.0
score = (0, 0, 0, 0)
for genre, src, plan, ecart, x5, x6 in DEROULE:
    if genre == "score":
        score = src
        evenements.append({"t": round(t, 2), "score": score})
        continue
    debut = max(0.0, t + ecart)
    if genre == "voix":
        s = voix(src, x6)
        evenements.append({"t": round(debut, 2), "plan": plan, "texte": x5, "dur": round(len(s) / SR, 2)})
    else:
        s = SONS[src]()
        evenements.append({"t": round(debut, 2), "plan": plan, "son": src})
    pistes.append((debut, s))
    # Les applaudissements et le frigo se fondent sous la suite ; le reste se succède.
    t = debut + (len(s) / SR if src not in ("applaudi5", "applaudi2", "clap") else len(s) / SR * 0.55)

duree = t + 0.6
mix = np.zeros(int(duree * SR) + SR)
for debut, s in pistes:
    i = int(debut * SR)
    mix[i : i + len(s)] += s
# ambiance de plateau : souffle de ventilation très bas
mix += filtre(rng.standard_normal(len(mix)), "low", 900) * 0.004
mix = mix[: int(duree * SR)]
mix = filtre(mix, "low", 10500)
mix = np.tanh(mix * 1.2) / 1.2
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "ftg-ep1.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "ftg-ep1.wav"), os.path.join(SORTIE, "ftg-ep1.mp3"))
json.dump({"duree": round(duree, 2), "plans": PLANS, "evenements": evenements}, open(os.path.join(SORTIE, "ftg-ep1.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(duree, 1), "s ;", len([e for e in evenements if "texte" in e]), "répliques")
