from PIL import Image
from pathlib import Path
root=Path(r'C:/Users/why/Documents/ChatGPT/德州扑克GTO简化/design')
ref=Image.open(r'C:/Users/why/.codex/generated_images/01a11a8a-d94e-77b2-bc4e-e00f4e520e4d/exec-1e9d1ad7-71ca-44a3-9810-b835eda9b985.png')
actual=Image.open(root/'implementation-desktop.png')
print('reference',ref.size,'capture',actual.size)
ref=ref.resize((1440,1024))
actual=actual.crop((0,0,1440,1023)).resize((1440,1024))
ref.save(root/'reference.png')
actual.save(root/'preview.png')
combined=Image.new('RGB',(2880,1024),'white');combined.paste(ref,(0,0));combined.paste(actual,(1440,0));combined.save(root/'comparison.png')

