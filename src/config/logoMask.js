import { CanvasTexture, NoColorSpace } from 'three';

// Mask only near-white pixels connected to the image border. Enclosed white
// artwork and cream colors remain visible, and the original texture is untouched.
export const createLogoBackgroundMask = (texture) => {
  const source = texture?.image;
  if (!source || typeof document === 'undefined') return null;

  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(source, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const background = new Uint8Array(width * height);
    const queue = new Uint32Array(width * height);
    let head = 0;
    let tail = 0;

    // Detect if border is predominantly dark/black or light/white by sampling corners
    const corners = [
      0,
      (width - 1) * 4,
      ((height - 1) * width) * 4,
      ((height - 1) * width + width - 1) * 4
    ];
    let darkVotes = 0;
    let lightVotes = 0;
    for (const offset of corners) {
      const a = pixels[offset + 3];
      if (a === 0) continue;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      if (max <= 45 && max - min <= 20) darkVotes++;
      if (min >= 220 && max - min <= 25) lightVotes++;
    }
    const isDarkBg = darkVotes >= 2;

    const enqueue = (index) => {
      if (background[index]) return;
      const offset = index * 4;
      const a = pixels[offset + 3];
      if (a === 0) {
        background[index] = 1;
        queue[tail++] = index;
        return;
      }
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      if (isDarkBg) {
        if (max > 45 || max - min > 20) return;
      } else {
        if (min < 235 || max - min > 20) return;
      }
      background[index] = 1;
      queue[tail++] = index;
    };

    for (let x = 0; x < width; x++) {
      enqueue(x);
      enqueue((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      enqueue(y * width);
      enqueue(y * width + width - 1);
    }

    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      if (x > 0) enqueue(index - 1);
      if (x < width - 1) enqueue(index + 1);
      if (index >= width) enqueue(index - width);
      if (index < width * (height - 1)) enqueue(index + width);
    }
    if (!tail) return null;

    for (let index = 0; index < background.length; index++) {
      const offset = index * 4;
      const alpha = background[index] ? 0 : 255;
      pixels[offset] = alpha;
      pixels[offset + 1] = alpha;
      pixels[offset + 2] = alpha;
      pixels[offset + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);

    const mask = new CanvasTexture(canvas);
    mask.colorSpace = NoColorSpace;
    mask.flipY = texture.flipY;
    mask.wrapS = texture.wrapS;
    mask.wrapT = texture.wrapT;
    mask.minFilter = texture.minFilter;
    mask.magFilter = texture.magFilter;
    mask.anisotropy = texture.anisotropy;
    mask.channel = texture.channel;
    mask.offset.copy(texture.offset);
    mask.repeat.copy(texture.repeat);
    mask.center.copy(texture.center);
    mask.rotation = texture.rotation;
    return mask;
  } catch {
    // Cross-origin images may be displayable but disallow reading their pixels.
    return null;
  }
};
