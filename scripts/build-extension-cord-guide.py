"""Draw a new single-path topology guide; this is not the inventory artwork."""

from math import cos, sin, pi
from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / 'assets/unused/extension-cord-continuity-guide-v1.png'
image = Image.new('RGBA', (1280, 1280), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)


def bezier(a, b, c, d, steps=100):
    return [tuple((1-t)**3*a[j] + 3*(1-t)**2*t*b[j] + 3*(1-t)*t*t*c[j] + t**3*d[j]
                  for j in range(2)) for t in (i/steps for i in range(steps+1))]


# One radius decreases continuously over exactly three revolutions. Every
# vertex belongs to the same open polyline; no rings or branches are drawn.
spiral = []
for i in range(1201):
    fraction = i / 1200
    angle = 2.5 + 6*pi*fraction
    radius = 520 - 340*fraction
    spiral.append((690 + radius*cos(angle), 470 + .48*radius*sin(angle)))

left_rear, right_rear = (350, 860), (970, 860)
first = bezier(left_rear, (440, 755), (200, 735), spiral[0])
last = bezier(spiral[-1], (600, 645), (865, 705), right_rear)
path = first + spiral[1:] + last[1:]
draw.line(path, fill='#776856', width=50, joint='curve')
draw.line(path, fill='#ded0b7', width=44, joint='curve')
draw.line([(x-2,y-4) for x,y in path], fill='#f5ecd9', width=24, joint='curve')

# Clear schematic connectors, each with only one cable-entry neck.
for x, y, socket in [(350,860,False),(970,860,True)]:
    draw.polygon([(x-25,y-20),(x+25,y+15),(x-100,y+155),(x-175,y+100)], fill='#dbc9aa', outline='#776856', width=4)
    draw.ellipse((x-186,y+73,x-76,y+176), fill='#eee0c7', outline='#776856', width=4)
    if socket:
        for dx,dy in [(-156,103),(-112,103),(-134,137)]:
            draw.rectangle((x+dx,y+dy,x+dx+12,y+dy+24), fill='#514636')
    else:
        for dx,dy in [(-156,105),(-111,105),(-136,138)]:
            draw.polygon([(x+dx,y+dy),(x+dx+12,y+dy+3),(x+dx-20,y+dy+47),(x+dx-32,y+dy+42)], fill='#989282', outline='#514636')

image.save(DESTINATION)
print(DESTINATION)
