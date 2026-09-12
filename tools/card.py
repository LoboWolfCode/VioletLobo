# -*- coding: utf-8 -*-
"""Social share card: the name stencilled out of a painting, with work alongside."""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

W, H = 1200, 630
INK = (10, 7, 12)
SERIF = 'C:/Windows/Fonts/georgia.ttf'
SANS = 'C:/Windows/Fonts/segoeui.ttf'
PANEL = 470                      # width of the artwork panel on the right


def cover(path, w, h, zoom=1.0):
    im = Image.open(path).convert('RGB')
    s = max(w / im.width, h / im.height) * zoom
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


card = Image.new('RGB', (W, H), INK)

# the work itself, down the right hand side
panel = cover('images/art_2.jpg', PANEL, H, 1.05)
card.paste(panel, (W - PANEL, 0))

# feather its left edge into the dark so the join never reads as a hard seam
feather = Image.new('L', (PANEL, H), 255)
fd = ImageDraw.Draw(feather)
RAMP = 170
for i in range(RAMP):
    fd.line([(i, 0), (i, H)], fill=int(255 * (i / RAMP) ** 1.6))
card.paste(panel, (W - PANEL, 0), feather)

# the name, with a painting showing through the letters
art = ImageEnhance.Brightness(cover('images/art_16.jpg', 640, 400, 1.2)).enhance(1.5)
art = Image.blend(art, Image.new('RGB', art.size, (248, 242, 250)), 0.30)

mask = Image.new('L', (W, H), 0)
md = ImageDraw.Draw(mask)
f_big = ImageFont.truetype(SERIF, 150)
md.text((70, 190), 'Violet', font=f_big, fill=255)
md.text((70, 330), 'Lobo', font=f_big, fill=255)
card.paste(art.resize((W, H)), (0, 0), mask)

d = ImageDraw.Draw(card)
d.text((74, 140), 'P A I N T E R   ·   A N I M A T O R   ·   C U R A T O R',
       font=ImageFont.truetype(SANS, 21), fill=(168, 160, 178))
d.text((74, 505), 'violetlobo.com', font=ImageFont.truetype(SANS, 25), fill=(196, 140, 255))

card.save('images/social-card.jpg', 'JPEG', quality=88, optimize=True)
print('social-card.jpg', card.size)
