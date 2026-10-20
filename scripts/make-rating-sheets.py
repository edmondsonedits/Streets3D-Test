from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
r=Path(__file__).resolve().parents[1];out=r/'site/ratings/evidence';out.mkdir(parents=True,exist_ok=True)
for d in (r/'work/rating-frames').iterdir():
 if not (d/'frame-079.jpg').exists():continue
 target=out/(d.name+'.jpg')
 if target.exists():continue
 board=Image.new('RGB',(1920,1150),'#102017');draw=ImageDraw.Draw(board)
 for j,i in enumerate([0,16,32,47,48,58,68,79]):
  image=Image.open(d/f'frame-{i:03d}.jpg');x=j%4*480;y=j//4*575;board.paste(ImageOps.fit(image,(480,270)),(x,y))
  # Duplicate at 1:1 crop below: central facade/road gives readable detail without AI enhancement.
  detail=image.crop((240,150,720,420));board.paste(detail,(x,y+280));draw.text((x+8,y+554),f"{d.name} | {i/8:.2f}s",fill='white')
 board.save(target,quality=83)
 print(d.name)
