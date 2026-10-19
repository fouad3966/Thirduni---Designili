// Image models such as FLUX respond to color *names* far better than to hex codes.
// This module maps a hex color to a descriptive name by nearest distance in CIE Lab,
// and provides light/dark shading used for darja shade words (fatha / ghamqa).

// [name, hex]. The first block holds the exact hex values used by the darja lexicon, so they
// always resolve to the same descriptive name (guarded by a test).
export const COLOR_TABLE = [
    ['deep black', '#0B0B0B'],
    ['crimson red', '#B3202A'],
    ['royal blue', '#1F4E9E'],
    ['emerald green', '#1E7B4A'],
    ['ivory white', '#F5F5F0'],
    ['sunny yellow', '#F2C94C'],
    ['slate grey', '#8A8D91'],
    ['soft pink', '#E58CA8'],
    ['violet', '#6A3FA0'],
    ['chestnut brown', '#6B4423'],
    ['vivid orange', '#E8731A'],
    ['rich metallic gold', '#D4AF37'],
    ['metallic silver', '#C0C0C0'],
    ['navy blue', '#14213D'],
    ['turquoise', '#1AA7A1'],
    ['sand beige', '#D9C5A0'],
    ['burgundy', '#7A1E2E'],
    ['sky blue', '#7EC8E3'],
    ['cream', '#F3EAD3'],
    ['deep flag green', '#006233'],
    ['bright flag red', '#D21034'],
    // Extra anchors so arbitrary hex values (client or model supplied) get a sensible name.
    ['pure white', '#FFFFFF'],
    ['charcoal', '#333B44'],
    ['light grey', '#D3D5D8'],
    ['dark chocolate', '#3B2314'],
    ['terracotta', '#C8643C'],
    ['rust', '#B7410E'],
    ['amber', '#F2A900'],
    ['mustard', '#C9A227'],
    ['warm gold', '#E8B84A'],
    ['olive green', '#6B7A2A'],
    ['forest green', '#1E5E3A'],
    ['lime green', '#9ACD32'],
    ['mint green', '#98D8C0'],
    ['teal', '#1F7A7A'],
    ['light blue', '#9CC5E8'],
    ['midnight navy', '#102A43'],
    ['indigo', '#3F3B8C'],
    ['lavender', '#B7A6E0'],
    ['plum', '#6E2C5E'],
    ['magenta', '#C2185B'],
    ['blush pink', '#F4C2C2'],
    ['coral', '#F26B5B'],
    ['maroon', '#5C1A1B'],
];

const hexToRgb = (hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const rgbToHex = (rgb) => `#${rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

const srgbToLinear = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const toLab = (hex) => {
    const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const [fx, fy, fz] = [f(x), f(y), f(z)];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const TABLE_LAB = COLOR_TABLE.map(([name, hex]) => ({ name, hex, lab: toLab(hex) }));
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const isHex = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function nameColor(hex) {
    if (!isHex(hex)) return 'neutral';
    const lab = toLab(hex);
    let best = TABLE_LAB[0];
    let bestDistance = Infinity;
    for (const entry of TABLE_LAB) {
        const d = distance(lab, entry.lab);
        if (d < bestDistance) { best = entry; bestDistance = d; }
    }
    return best.name;
}

// "deep black, rich metallic gold": names in order, with consecutive duplicates removed.
export function describePalette(palette) {
    const names = [];
    for (const hex of palette ?? []) {
        const name = nameColor(hex);
        if (names[names.length - 1] !== name && !names.includes(name)) names.push(name);
    }
    return names.join(', ');
}

// Mix toward white (light) or black (dark).
export function shadeHex(hex, shade) {
    const [r, g, b] = hexToRgb(hex);
    const target = shade === 'light' ? 255 : 0;
    const amount = shade === 'light' ? 0.38 : 0.42;
    return rgbToHex([r, g, b].map((c) => c + (target - c) * amount));
}
