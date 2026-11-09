from PIL import Image
from pathlib import Path
root=Path(r'C:/Users/why/Documents/ChatGPT/德州扑克GTO简化/design')
a=Image.open(root/'reference.png').crop((400,260,1040,870))
b=Image.open(root/'preview.png').crop((400,260,1040,870))
out=Image.new('RGB',(1280,610));out.paste(a,(0,0));out.paste(b,(640,0));out.save(root/'comparison-focus.png')
for name in ['postflop','settings']:
 im=Image.open(root/(name+'.png'));im.crop((0,0,1440,1023)).save(root/(name+'-normalized.png'))
