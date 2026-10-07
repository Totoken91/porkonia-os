"""Compression sans perte des grands PNG du portail (Pillow).

Les dimensions, tous les pixels RGBA et la transparence sont vérifiés avant
remplacement. Les sprites et les médias sonores restent inchangés.
"""
from pathlib import Path
from PIL import Image
import io

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    *[f"pignet/{name}-1999" for name in ("donjonbon", "douzi", "saucissignal", "viteau")],
    "pignet/donjonbon-capture",
    "brand/banque-logo", "brand/porkomazon-logo", "brand/saucisson-planche",
]

def main():
    saved = 0
    for name in FILES:
        source = ROOT / "public" / f"{name}.png"
        target = source.with_suffix(".webp")
        if not source.exists():
            if not target.exists():
                raise FileNotFoundError(source)
            continue
        with Image.open(source) as original:
            rgba = original.convert("RGBA")
            encoded = io.BytesIO()
            rgba.save(encoded, format="WEBP", lossless=True, exact=True, method=6)
            data = encoded.getvalue()
            with Image.open(io.BytesIO(data)) as check:
                assert check.size == rgba.size and check.convert("RGBA").tobytes() == rgba.tobytes(), name
        gain = source.stat().st_size - len(data)
        if gain <= 0:
            raise ValueError(f"Pas de gain pour {name}")
        target.write_bytes(data)
        source.unlink()
        saved += gain
        print(f"{name}: {gain / 1024:.0f} Ko économisés, pixels identiques")
    print(f"Total: {saved / 1024**2:.2f} Mo économisés")

if __name__ == "__main__":
    main()
