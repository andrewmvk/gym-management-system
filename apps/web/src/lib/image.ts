export const IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

// A face needs far fewer pixels than a phone photo has, and large uploads would pass the server's size limit.
const MAX_SIDE = 1280;

export async function fileToCanvas(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}
