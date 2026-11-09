from PIL import Image
from pathlib import Path
p=Path(r'C:/Users/why/Documents/ChatGPT/德州扑克GTO简化/design')
im=Image.open(p/'detail-review-desktop.png');im.crop((0,0,1440,1023)).save(p/'detail-review-final.png')
