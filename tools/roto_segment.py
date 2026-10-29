"""Cut the golfer out of each frame with MediaPipe's person segmenter; write one alpha mask PNG per frame."""
import sys, glob, os
import numpy as np
from PIL import Image
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

model, frames_dir, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out_dir, exist_ok=True)
seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=mpt.BaseOptions(model_asset_path=model), output_category_mask=True, output_confidence_masks=True))
for f in sorted(glob.glob(os.path.join(frames_dir, '*.png'))):
    img = mp.Image.create_from_file(f)
    r = seg.segment(img)
    bg = r.confidence_masks[0].numpy_view()          # class 0 = background
    person = np.clip(1.0 - np.squeeze(bg), 0, 1)
    Image.fromarray((person * 255).astype(np.uint8), 'L').save(os.path.join(out_dir, os.path.basename(f)))
seg.close()
print("done", len(glob.glob(os.path.join(out_dir, '*.png'))))
