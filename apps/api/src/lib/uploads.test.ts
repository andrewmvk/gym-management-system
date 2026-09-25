import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveUploadPath, sanitizeFilename, saveUpload, type SaveUploadInput } from '@api/lib/uploads';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const PDF = Buffer.from('%PDF-1.7\n');
const MB = 1024 * 1024;

let uploadsDir: string;
const ownerId = randomUUID();

function input(overrides: Partial<SaveUploadInput> = {}): SaveUploadInput {
  return { ownerId, kind: 'reference_photo', filename: 'me.jpg', mimeType: 'image/jpeg', base64: JPEG.toString('base64'), ...overrides };
}

function padded(header: Buffer, totalBytes: number) {
  return Buffer.concat([header, Buffer.alloc(totalBytes - header.length)]).toString('base64');
}

beforeEach(async () => {
  uploadsDir = await mkdtemp(path.join(tmpdir(), 'cadence-uploads-'));
});
afterEach(() => rm(uploadsDir, { recursive: true, force: true }));

describe('saveUpload', () => {
  it('writes the file under <ownerId>/<kind>/<uuid>.<ext> and returns the relative path', async () => {
    const saved = await saveUpload(input({ filename: '../../etc/pass wd.jpg' }), uploadsDir);

    expect(saved.path).toMatch(new RegExp(`^${ownerId}/reference_photo/[0-9a-f-]{36}\\.jpg$`));
    expect(saved.filename).toBe('pass wd.jpg');
    expect(await readFile(path.join(uploadsDir, saved.path))).toEqual(JPEG);
  });

  it.each([
    ['a PNG photo', { mimeType: 'image/png', base64: PNG.toString('base64') }, 'png'],
    ['a PDF exam', { kind: 'exam', mimeType: 'application/pdf', base64: PDF.toString('base64') }, 'pdf'],
    ['a data URL certificate', { kind: 'certificate', base64: `data:image/jpeg;base64,${JPEG.toString('base64')}` }, 'jpg'],
  ] as const)('accepts %s', async (_, overrides, extension) => {
    const saved = await saveUpload(input(overrides), uploadsDir);

    expect(saved.path.endsWith(`.${extension}`)).toBe(true);
  });

  it.each([
    ['a PDF photo', { mimeType: 'application/pdf', base64: PDF.toString('base64') }, 'not allowed'],
    ['a PDF certificate', { kind: 'certificate', mimeType: 'application/pdf', base64: PDF.toString('base64') }, 'not allowed'],
    ['an unknown type', { kind: 'exam', mimeType: 'image/gif' }, 'not allowed'],
    ['content that does not match the type', { mimeType: 'image/png' }, 'does not match'],
    ['invalid base64', { base64: 'not base64!' }, 'not valid base64'],
    ['an empty file', { base64: '' }, 'not valid base64'],
    ['a photo over 2 MB', { base64: padded(JPEG, 2 * MB + 1) }, 'exceeds 2 MB'],
    ['an exam over 5 MB', { kind: 'exam', base64: padded(JPEG, 5 * MB + 1) }, 'exceeds 5 MB'],
    ['an owner id with traversal', { ownerId: '../escape' }, 'Invalid file owner'],
  ] as const)('rejects %s', async (_, overrides, message) => {
    await expect(saveUpload(input(overrides), uploadsDir)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: expect.stringContaining(message),
    });
  });

  it('accepts a photo of exactly 2 MB and an exam of exactly 5 MB', async () => {
    await expect(saveUpload(input({ base64: padded(JPEG, 2 * MB) }), uploadsDir)).resolves.toBeDefined();
    await expect(saveUpload(input({ kind: 'exam', base64: padded(JPEG, 5 * MB) }), uploadsDir)).resolves.toBeDefined();
  });
});

describe('resolveUploadPath', () => {
  it('refuses a path that escapes the uploads directory', () => {
    expect(() => resolveUploadPath('../outside.jpg', uploadsDir)).toThrow('Invalid file path');
    expect(() => resolveUploadPath(`${ownerId}/../../outside.jpg`, uploadsDir)).toThrow('Invalid file path');
  });
});

describe('sanitizeFilename', () => {
  it('keeps a safe base name and falls back when nothing remains', () => {
    expect(sanitizeFilename('C:\\Users\\me\\exam <1>.pdf')).toBe('exam 1.pdf');
    expect(sanitizeFilename('..')).toBe('file');
  });
});
