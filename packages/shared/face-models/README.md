# Face recognition weights

This folder is the single location of the face-api.js weights for **both** the backend (signup reference embedding) and the kiosk (probe embedding in the browser). The two sides must load the exact same files: descriptors from different models or weight versions are not comparable, and matching would fail silently (`docs/04-architecture.md` §5).

The weights are binaries and are not committed (the local `.gitignore` keeps only this README). Every developer downloads them once into this folder.

## Required files

Three nets, in the original face-api.js format (a weights manifest plus its shards):

| Net | Purpose | Files |
|---|---|---|
| SSD MobileNet v1 | Face detector (counts faces: zero, one, or several) | `ssd_mobilenetv1_model-weights_manifest.json`, `ssd_mobilenetv1_model-shard1`, `ssd_mobilenetv1_model-shard2` |
| 68-point face landmark | Aligns the detected face before recognition | `face_landmark_68_model-weights_manifest.json`, `face_landmark_68_model-shard1` |
| Face recognition | Produces the 128-number descriptor that is stored and matched | `face_recognition_model-weights_manifest.json`, `face_recognition_model-shard1`, `face_recognition_model-shard2` |

## Where to download

From the `weights/` folder of the face-api.js repository: <https://github.com/justadudewhohacks/face-api.js/tree/master/weights>. Download the eight files above (use each file's "Download raw file" button, or clone the repository and copy them) into this folder, keeping their names unchanged.

## Status

Until the real backend implementation lands (P-22), the backend runs with `FACE_EMBEDDING_MODE=stub`, which derives a deterministic vector from the image bytes and needs none of these files. P-22 picks the face-api.js package and TensorFlow backend and records that choice here; if it switches to a package that expects a different weight format, it updates the file list above so the kiosk and the backend keep loading the same files.
