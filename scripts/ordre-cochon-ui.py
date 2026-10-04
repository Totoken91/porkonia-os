"""Native 64px tiled stone, restricted palette; no resizing or external artwork."""
from pathlib import Path
import random
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'public' / 'ordre-cochon'
root.mkdir(exist_ok=True)
rng = random.Random(98)
size = 64
field = [[rng.random() for x in range(16)] for y in range(16)]
palette = ['#343837', '#393d3b', '#3e4240', '#454946', '#4b4e49', '#52544e']
im = Image.new('RGB', (size, size))
for y in range(size):
    for x in range(size):
        # Seamless low-frequency planes with shallow diagonal mineral veins.
        value = sum(field[(y//4+dy)%16][(x//4+dx)%16] for dx,dy in [(0,0),(1,0),(0,1),(-1,0),(0,-1)]) / 5
        vein = ((x + y//2 + int(field[y//4][x//4]*8)) % 23)
        shade = max(0, min(5, int(value*6) + (1 if vein < 2 else -1 if vein == 3 else 0)))
        im.putpixel((x,y), tuple(bytes.fromhex(palette[shade][1:])))
d = ImageDraw.Draw(im)
for path in [[(4,11),(10,13),(14,12),(19,15)],[(43,37),(45,41),(51,43),(54,47)]]:
    d.line(path,fill='#2d3231',width=1)
im.save(root / 'pierre.png')
