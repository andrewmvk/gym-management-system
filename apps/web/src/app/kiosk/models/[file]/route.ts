import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODELS_DIR = resolve(process.cwd(), '../../packages/shared/face-models');

// An allowlist, so the file name in the URL can never reach outside the weights folder.
const WEIGHT_FILES = new Set([
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
]);

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!WEIGHT_FILES.has(file)) return new Response('Not found', { status: 404 });

  try {
    const bytes = await readFile(resolve(MODELS_DIR, file));
    return new Response(bytes, {
      headers: {
        'Content-Type': file.endsWith('.json') ? 'application/json' : 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Weights not downloaded, see packages/shared/face-models/README.md', { status: 404 });
  }
}
