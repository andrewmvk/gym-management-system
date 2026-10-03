# Face recognition weights

This folder is the single location of the face-api.js weights for **both** the backend (signup reference embedding) and the kiosk (probe embedding in the browser). The two sides must load the exact same files: descriptors from different models or weight versions are not comparable, and matching would fail silently (`docs/04-architecture.md` §5).

The weights are small (about 12 MB in total), so they are committed here and every checkout has them. The kiosk serves them from this folder through `apps/web/src/app/kiosk/models/[file]/route.ts`.

## Required files

Three nets, in the original face-api.js format (a weights manifest plus its shards):

| Net | Purpose | Files |
|---|---|---|
| SSD MobileNet v1 | Face detector (counts faces: zero, one, or several) | `ssd_mobilenetv1_model-weights_manifest.json`, `ssd_mobilenetv1_model-shard1`, `ssd_mobilenetv1_model-shard2` |
| 68-point face landmark | Aligns the detected face before recognition | `face_landmark_68_model-weights_manifest.json`, `face_landmark_68_model-shard1` |
| Face recognition | Produces the 128-number descriptor that is stored and matched | `face_recognition_model-weights_manifest.json`, `face_recognition_model-shard1`, `face_recognition_model-shard2` |

## Where they come from

The `weights/` folder of the face-api.js repository: <https://github.com/justadudewhohacks/face-api.js/tree/master/weights>. If a file is ever missing, download the eight files above into this folder, keeping their names unchanged.

## Status

`FACE_EMBEDDING_MODE=stub` (the default) derives a deterministic vector from the image bytes and needs none of these files. `FACE_EMBEDDING_MODE=real` runs the three nets above on the backend.

## Library choice (backend and kiosk)

Both sides use `@vladmandic/face-api` 1.7.15 (a maintained fork of face-api.js that reads these same weight files) with TensorFlow.js 4.22:

- **Kiosk**: the browser build, with the default WebGL or CPU backend.
- **Backend**: the `face-api.node-wasm.js` build with `@tensorflow/tfjs-backend-wasm`. The WASM backend ships its binary inside the npm package, so it installs on Windows and in the backend container without native compilation (the native `tfjs-node` addon needs build tools). It is slower than native, which is fine for one signup photo at a time.
- **Image decoding**: `jpeg-js` and `pngjs` (pure JavaScript) turn the uploaded photo into the RGB tensor, so no canvas or native image library is needed. The upload validation already restricts reference photos to JPEG and PNG.

Keep the `@vladmandic/face-api` version equal on the backend (`apps/api/package.json`) and the kiosk (`apps/web/package.json`) so descriptors stay comparable.
