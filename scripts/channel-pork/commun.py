"""Outils communs aux mixages de Channel Pork : lecture audio (wav, opus, mp3 via ffmpeg) et décodage des réponses Speko."""
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import wave

import numpy as np

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "sortie")
SR = 44100


def ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg introuvable : installer ffmpeg ou « pip install imageio-ffmpeg ».")


def lire(chemin, sr=SR, tempo=1.0):
    """Signal mono flottant à `sr` Hz, quel que soit le format d'origine ; `tempo` accélère sans changer la hauteur."""
    filtre = ["-af", f"atempo={tempo}"] if tempo != 1.0 else []
    brut = subprocess.run(
        [ffmpeg(), "-loglevel", "error", "-i", chemin, *filtre, "-f", "s16le", "-ac", "1", "-ar", str(sr), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(brut, dtype=np.int16).astype(float) / 32768


def decoder_speko(fichier_json, sortie_wav):
    """Une réponse de audio.synthesize (JSON {audio_base64, content_type}) vers un wav."""
    d = json.load(open(fichier_json))
    ct, b = d["content_type"], base64.b64decode(d["audio_base64"])
    if "pcm" not in ct:
        open(sortie_wav, "wb").write(b)
        return
    rate = int(re.search(r"rate=(\d+)", ct).group(1))
    w = wave.open(sortie_wav, "wb")
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(rate)
    w.writeframes(b)
    w.close()


def encoder_mp3(wav, mp3):
    """Encodage de diffusion : mono, 96 kb/s, volume normalisé (-16 LUFS)."""
    subprocess.run([ffmpeg(), "-loglevel", "error", "-y", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5", "-ac", "1", "-b:a", "96k", mp3], check=True)


if __name__ == "__main__":
    # python3 commun.py reponse.json sortie.wav
    decoder_speko(sys.argv[1], sys.argv[2])
