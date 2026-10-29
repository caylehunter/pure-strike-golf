"""Pack the golfer masks (impact through finish) into one RGBA sprite sheet: dark ink with the mask as alpha."""
import sys, glob, os, json
import numpy as np
from PIL import Image
masks_dir, first, last, out_png, out_json = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
files = [os.path.join(masks_dir, f'f{i:03d}.png') for i in range(first, last + 1)]
ms = [np.asarray(Image.open(f), dtype=np.float32) / 255 for f in files]
# soft threshold: drop the faint halo, keep a soft edge
ms = [np.clip((m - 0.3) / 0.35, 0, 1) for m in ms]
union = np.max(np.stack(ms), axis=0) > 0.05
ys, xs = np.where(union)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
pad = 4; y0 = max(0, y0 - pad); x0 = max(0, x0 - pad); y1 = min(union.shape[0], y1 + pad); x1 = min(union.shape[1], x1 + pad)
# the golfer's standing height at the finish (feet to top of head) and where his feet are
fin = ms[-1][y0:y1, x0:x1] > 0.5
fy, fx = np.where(fin)
person_h = fy.max() - fy.min()
feet_y = fy.max(); low = fx[fy > feet_y - 6]; feet_x = int(np.median(low))
target_h = 170.0                       # sprite pixels for the standing golfer
k = target_h / person_h
W, H = int(round((x1 - x0) * k)), int(round((y1 - y0) * k))
cols = 10; rows = (len(ms) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * W, rows * H), (0, 0, 0, 0))
for i, m in enumerate(ms):
    a = Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8), 'L').resize((W, H), Image.LANCZOS)
    tile = Image.new('RGBA', (W, H), (20, 28, 24, 0)); tile.putalpha(a)
    sheet.paste(tile, ((i % cols) * W, (i // cols) * H))
sheet.save(out_png, optimize=True)
json.dump({'w': W, 'h': H, 'n': len(ms), 'cols': cols, 'fps': 30, 'feetX': round(feet_x * k, 1), 'feetY': round(feet_y * k, 1), 'personH': target_h}, open(out_json, 'w'))
print('frames', len(ms), 'tile', W, 'x', H, 'sheet', sheet.size, 'bytes', os.path.getsize(out_png))
