from PIL import Image
from pathlib import Path
p=Path(r'C:/Users/why/Documents/ChatGPT/德州扑克GTO简化/design')
im=Image.open(p/'detail-review.png');print(im.size);im.crop((0,0,1910,1074)).save(p/'detail-review-preview.png')
