"""Embed every sounds/*.mp3 into index.html (between the SAMPLES:BEGIN / SAMPLES:END markers) so the game stays one file.

Run after adding or replacing a recording:  python3 tools/embed_sounds.py
A file named sounds/driver-1.mp3 is played in the game as 'driver-1'.
"""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
page = root / 'index.html'
entries = [f"'{f.stem}': '{base64.b64encode(f.read_bytes()).decode()}'" for f in sorted((root / 'sounds').glob('*.mp3'))]
html = page.read_text()
html, n = re.subn(r'/\* SAMPLES:BEGIN \*/.*?/\* SAMPLES:END \*/', lambda m: '/* SAMPLES:BEGIN */ ' + ', '.join(entries) + ' /* SAMPLES:END */', html, flags=re.S)
if n != 1:
    raise SystemExit('index.html needs exactly one SAMPLES:BEGIN ... SAMPLES:END block')
page.write_text(html)
print(f'embedded {len(entries)} sound(s)')
