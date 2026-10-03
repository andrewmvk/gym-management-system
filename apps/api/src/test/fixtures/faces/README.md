# Face recognition fixtures

Photos used by `apps/api/src/lib/face-recognition.test.ts` to check the real face embedding and matching. All of them are AI-generated faces, so the repo never holds real biometric data (`docs/01-product-overview.md`). Do not add photos of real people here.

Save each photo with one of the extensions `jpg`, `jpeg`, or `png`, using exactly these names:

| File | Content | Expected |
|---|---|---|
| `valid/reference` | One person, one face, clearly visible | An embedding is produced |
| `valid/other-pose` | The same person as `reference`, with different clothes and pose | Matches `reference` |
| `invalid/landscape` | No face (a landscape) | `no_face` |
| `invalid/group` | Several people | `multiple_faces` |
| `invalid/stranger` | A different person with one face | An embedding, but no match against `reference` |

The test fails if a photo is missing.
