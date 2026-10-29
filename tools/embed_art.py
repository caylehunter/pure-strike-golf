"""Embed art/golfer-swing.png and its layout (art/golfer-swing.json) into index.html between the ART:BEGIN / ART:END markers.

How the swing was made (repeat with any swing video filmed from behind the golfer):
  1. ffmpeg -ss <start> -t <secs> -i swing.mov -vf "fps=30,scale=470:-2" frames/f%03d.png
  2. python3 tools/roto_segment.py selfie_multiclass_256x256.tflite frames masks   (MediaPipe person segmenter)
  3. python3 tools/roto_sheet.py masks <first> <last> art/golfer-swing.png art/golfer-swing.json   (impact .. finish)
  4. python3 tools/embed_art.py
"""
import base64, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
page = root / 'index.html'
meta = json.loads((root / 'art' / 'golfer-swing.json').read_text())
meta['src'] = 'data:image/png;base64,' + base64.b64encode((root / 'art' / 'golfer-swing.png').read_bytes()).decode()
html = page.read_text()
html, n = re.subn(r'/\* ART:BEGIN \*/.*?/\* ART:END \*/', lambda m: '/* ART:BEGIN */ ' + json.dumps(meta) + ' /* ART:END */', html, flags=re.S)
if n != 1:
    raise SystemExit('index.html needs exactly one ART:BEGIN ... ART:END block')
page.write_text(html)
print('embedded the golfer swing:', meta['n'], 'frames')
