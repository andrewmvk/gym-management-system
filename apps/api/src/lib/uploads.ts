import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { env } from '@api/config/env';

export const UPLOAD_KINDS = ['reference_photo', 'exam', 'certificate'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

const MB = 1024 * 1024;

const FILE_TYPES = {
  'image/jpeg': { extension: 'jpg', magic: [0xff, 0xd8, 0xff] },
  'image/png': { extension: 'png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  'application/pdf': { extension: 'pdf', magic: [0x25, 0x50, 0x44, 0x46, 0x2d] },
} as const;
type MimeType = keyof typeof FILE_TYPES;

const UPLOAD_RULES: Record<UploadKind, { mimeTypes: readonly MimeType[]; maxBytes: number }> = {
  reference_photo: { mimeTypes: ['image/jpeg', 'image/png'], maxBytes: 2 * MB },
  certificate: { mimeTypes: ['image/jpeg', 'image/png'], maxBytes: 5 * MB },
  exam: { mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'], maxBytes: 5 * MB },
};

export const MIME_TYPE_BY_EXTENSION: Record<string, MimeType> = Object.fromEntries(
  Object.entries(FILE_TYPES).map(([mimeType, { extension }]) => [extension, mimeType as MimeType]),
);

// Files travel as base64 inside tRPC inputs, so only these procedures get the larger body limit (see app.ts).
export const FILE_UPLOAD_PROCEDURES: readonly string[] = ['aptitude.savePhoto', 'certificates.upload', 'onboarding.submit'];
// Room for several 5 MB exam attachments in one onboarding submission after the ~4/3 base64 overhead.
export const FILE_REQUEST_MAX_BYTES = 32 * MB;
export const DEFAULT_REQUEST_MAX_BYTES = 1 * MB;

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
const MAX_FILENAME_LENGTH = 120;

export interface SaveUploadInput {
  ownerId: string;
  kind: UploadKind;
  filename: string;
  mimeType: string;
  base64: string;
}

export interface SavedUpload {
  path: string;
  filename: string;
  mimeType: MimeType;
  sizeBytes: number;
}

function reject(message: string): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message });
}

export function sanitizeFilename(filename: string) {
  const base = filename.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .trim()
    .slice(-MAX_FILENAME_LENGTH);
  return cleaned || 'file';
}

function hasMagicBytes(bytes: Buffer, magic: readonly number[]) {
  return bytes.length >= magic.length && magic.every((byte, index) => bytes[index] === byte);
}

export function resolveUploadPath(relativePath: string, uploadsDir = env.UPLOADS_DIR) {
  const root = path.resolve(uploadsDir);
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(root + path.sep)) reject('Invalid file path');
  return absolute;
}

export async function saveUpload(input: SaveUploadInput, uploadsDir = env.UPLOADS_DIR): Promise<SavedUpload> {
  if (!z.uuid().safeParse(input.ownerId).success) reject('Invalid file owner');

  const rules = UPLOAD_RULES[input.kind];
  if (!rules) reject('Unknown upload kind');

  const mimeType = input.mimeType as MimeType;
  if (!rules.mimeTypes.includes(mimeType)) {
    reject(`This file type is not allowed. Accepted: ${rules.mimeTypes.map((type) => FILE_TYPES[type].extension).join(', ')}`);
  }

  const base64 = input.base64.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
  if (base64.length === 0 || base64.length % 4 !== 0 || !BASE64_PATTERN.test(base64)) reject('The file is not valid base64');
  // Checked on the encoded length first so an oversized payload is never decoded into memory.
  if (Math.floor((base64.length * 3) / 4) > rules.maxBytes + 2) reject(`The file exceeds ${rules.maxBytes / MB} MB`);

  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > rules.maxBytes) reject(`The file exceeds ${rules.maxBytes / MB} MB`);

  const { extension, magic } = FILE_TYPES[mimeType];
  if (!hasMagicBytes(bytes, magic)) reject('The file content does not match its type');

  const relativePath = [input.ownerId, input.kind, `${randomUUID()}.${extension}`].join('/');
  const absolutePath = resolveUploadPath(relativePath, uploadsDir);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes, { flag: 'wx' });

  return { path: relativePath, filename: sanitizeFilename(input.filename), mimeType, sizeBytes: bytes.length };
}
