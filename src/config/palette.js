// Palette fidelity helpers.
//
// FLUX follows colors loosely: ask for "black and gold" and you may get brown and cream.
// analyzePaletteMatch() measures how well a generated image uses the requested colors, and
// matchImageToPalette() recolors it with a luminance-to-palette gradient map so the print
// uses exactly those colors while keeping every shape and shading detail.

const hexToRgb = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const srgbToLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

// sRGB -> CIE Lab (D65). Distances in Lab track perceived color difference.
const rgbToLab = (r, g, b) => {
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const x = (0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047;
  const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  const z = (0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function readPixels(image, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, size, size);
  return context.getImageData(0, 0, size, size).data;
}

/**
 * How well does the image use the requested palette?
 * Returns { status: 'ok' | 'drift', missing: string[] } where `missing` lists palette colors
 * that are barely present in the image. Never throws: on any failure it reports 'ok'.
 */
export function analyzePaletteMatch(image, palette) {
  try {
    if (!Array.isArray(palette) || palette.length < 2) return { status: 'ok', missing: [] };
    const targets = palette.map((hex) => ({ hex, lab: rgbToLab(...hexToRgb(hex)) }));
    const data = readPixels(image, 64);
    const counts = new Array(targets.length).fill(0);
    let pixels = 0;
    let offPalette = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const lab = rgbToLab(data[i], data[i + 1], data[i + 2]);
      let best = 0;
      let bestDistance = Infinity;
      targets.forEach((target, index) => {
        const d = deltaE(lab, target.lab);
        if (d < bestDistance) { best = index; bestDistance = d; }
      });
      pixels += 1;
      if (bestDistance <= 32) counts[best] += 1;
      if (bestDistance > 50) offPalette += 1;
    }
    if (!pixels) return { status: 'ok', missing: [] };
    // A color covering under 4% of the image is effectively absent.
    const missing = targets.filter((_, index) => counts[index] / pixels < 0.04).map((t) => t.hex);
    const drifted = missing.length > 0 || offPalette / pixels > 0.45;
    return { status: drifted ? 'drift' : 'ok', missing };
  } catch {
    return { status: 'ok', missing: [] };
  }
}

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Gradient-map the image onto the palette: dark pixels take the darkest palette color,
 * light pixels the lightest, with the rest spread in between. The palette's first color is the
 * background by convention, so the mapping is flipped when the image has a light background but
 * the requested background color is dark (or the reverse).
 * Resolves to a PNG data URL, or null when the image is too flat to remap.
 */
export function matchImageToPalette(image, palette, size = 1024) {
  try {
    const width = Math.min(size, image.naturalWidth || image.width);
    const height = Math.min(size, image.naturalHeight || image.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    const frame = context.getImageData(0, 0, width, height);
    const { data } = frame;

    // Luminance histogram -> contrast stretch (2nd to 98th percentile) and background estimate.
    const histogram = new Uint32Array(256);
    let sum = 0;
    const total = width * height;
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
      histogram[lum] += 1;
      sum += lum;
    }
    const percentile = (fraction) => {
      let seen = 0;
      for (let v = 0; v < 256; v++) {
        seen += histogram[v];
        if (seen >= total * fraction) return v;
      }
      return 255;
    };
    const low = percentile(0.02);
    const high = percentile(0.98);
    if (high - low < 24) return null;
    const median = percentile(0.5);
    const mean = sum / total;
    const imageBackgroundIsLight = median > mean;

    // Palette stops ordered from dark to light.
    const stops = palette
      .map((hex) => ({ hex, rgb: hexToRgb(hex), lightness: rgbToLab(...hexToRgb(hex))[0] }))
      .sort((a, b) => a.lightness - b.lightness);
    const baseRank = stops.findIndex((stop) => stop.hex === palette[0]) / (stops.length - 1);
    const baseIsLight = baseRank > 0.5 ? true : baseRank < 0.5 ? false : imageBackgroundIsLight;
    const invert = imageBackgroundIsLight !== baseIsLight;

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      let t = Math.min(1, Math.max(0, (lum - low) / (high - low)));
      if (invert) t = 1 - t;
      const position = t * (stops.length - 1);
      const lower = Math.min(stops.length - 2, Math.floor(position));
      const local = position - lower;
      data[i] = lerp(stops[lower].rgb[0], stops[lower + 1].rgb[0], local);
      data[i + 1] = lerp(stops[lower].rgb[1], stops[lower + 1].rgb[1], local);
      data[i + 2] = lerp(stops[lower].rgb[2], stops[lower + 1].rgb[2], local);
      data[i + 3] = 255;
    }
    context.putImageData(frame, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
