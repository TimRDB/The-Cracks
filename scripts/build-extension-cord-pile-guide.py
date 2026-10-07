"""Draw a new continuous four-turn helix as a stacked-coil reference."""

from math import cos, sin, pi
from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / 'assets/unused/extension-cord-pile-guide-v1.png'
image = Image.new('RGBA', (1280, 1280), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)


def bezier(a, b, c, d, steps=100):
    return [tuple((1-t)**3*a[j] + 3*(1-t)**2*t*b[j] + 3*(1-t)*t*t*c[j] + t**3*d[j]
                  for j in range(2)) for t in (i/steps for i in range(steps+1))]


# Constant-radius helix: four turns progress vertically without closing any
# ring. The pitch equals the cable diameter, making a compact touching pile.
coil = []
for i in range(1601):
    fraction = i / 1600
    angle = 2.5 + 8*pi*fraction
    coil.append((690 + 460*cos(angle), 340 + .40*460*sin(angle) + 160*(1-fraction)))

first = bezier((350,860), (390,745), (230,710), coil[0])
last = bezier(coil[-1], (400,540), (825,715), (970,860))
path = first + coil[1:] + last[1:]
# Draw round-ended segments to avoid ImageDraw's polyline joint artifacts.
for points, colour, width in [(path,'#786954',44),(path,'#e8d9bd',40),([(x-2,y-3) for x,y in path],'#f6eedc',18)]:
    draw.line(points, fill=colour, width=width)
    radius = width/2
    for x,y in points:
        draw.ellipse((x-radius,y-radius,x+radius,y+radius), fill=colour)

for x,y,socket in [(350,860,False),(970,860,True)]:
    draw.polygon([(x-22,y-15),(x+22,y+15),(x-100,y+155),(x-175,y+100)], fill='#dbc9aa', outline='#776856', width=4)
    draw.ellipse((x-186,y+73,x-76,y+176), fill='#eee0c7', outline='#776856', width=4)
    if socket:
        for dx,dy in [(-156,103),(-112,103),(-134,137)]:
            draw.rectangle((x+dx,y+dy,x+dx+12,y+dy+24), fill='#514636')
    else:
        for dx,dy in [(-156,105),(-111,105),(-136,138)]:
            draw.polygon([(x+dx,y+dy),(x+dx+12,y+dy+3),(x+dx-20,y+dy+47),(x+dx-32,y+dy+42)], fill='#989282', outline='#514636')

image.save(DESTINATION)
print(DESTINATION)
