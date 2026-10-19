import state from '../store';
import { GARMENTS } from './garments/catalog';

/**
 * Converts a hex color string (#RRGGBB) to an RGB object.
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  if (isNaN(bigint)) return { r: 0, g: 0, b: 0 };
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/**
 * Wait for N animation frames so Three.js renders the canvas with buffer swap.
 */
function waitFrames(count = 3) {
  return new Promise((resolve) => {
    let current = 0;
    const step = () => {
      current++;
      if (current >= count) {
        setTimeout(resolve, 30);
      } else {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  });
}

/**
 * Crops the center portion of the 3D canvas (where the garment sits)
 * onto a clean square canvas with high fidelity.
 */
function cropGarmentView(canvas, targetSize = 1000) {
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = targetSize;
  cropCanvas.height = targetSize;
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return null;

  // Clean studio pedestal gradient
  const grad = ctx.createRadialGradient(
    targetSize / 2,
    targetSize * 0.84,
    40,
    targetSize / 2,
    targetSize * 0.84,
    targetSize * 0.38
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(targetSize / 2, targetSize * 0.84, targetSize * 0.36, targetSize * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Garment framing: crop center 82% of width and 90% of height
  const minDim = Math.min(canvas.width, canvas.height);
  const cropW = minDim * 0.82;
  const cropH = minDim * 0.9;
  const sx = (canvas.width - cropW) / 2;
  const sy = (canvas.height - cropH) / 2;

  ctx.drawImage(canvas, sx, sy, cropW, cropH, 0, 0, targetSize, targetSize);
  return cropCanvas;
}

/**
 * Captures both the Front and Back 3D views by controlling the angle
 * and taking snapshots of the active WebGL canvas.
 */
export async function captureFrontAndBackViews() {
  const canvas = document.querySelector('canvas');
  if (!canvas) throw new Error('3D Canvas not found');

  const prevRot = state.shirtRotationY || 0;
  const prevAuto = state.autoRotate;
  const prevFlipped = state.isFlipped;

  state.autoRotate = false;
  state.snapRotationInstant = true;

  try {
    // 1. Capture Front View (Rotation = 0)
    state.shirtRotationY = 0;
    state.isFlipped = false;
    await waitFrames(4);
    const frontCanvas = cropGarmentView(canvas, 1100);

    // 2. Capture Back View (Rotation = 180 deg / Math.PI)
    state.shirtRotationY = Math.PI;
    state.isFlipped = true;
    await waitFrames(4);
    const backCanvas = cropGarmentView(canvas, 1100);

    return {
      frontImage: frontCanvas ? frontCanvas.toDataURL('image/png') : null,
      backImage: backCanvas ? backCanvas.toDataURL('image/png') : null,
    };
  } finally {
    // Restore user's previous rotation state
    state.shirtRotationY = prevRot;
    state.isFlipped = prevFlipped;
    state.snapRotationInstant = false;
    state.autoRotate = prevAuto;
  }
}

/**
 * Loads an image from a data URL into an HTMLImageElement.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Generates the complete 2400 x 1550 High-Resolution Production Spec Sheet Canvas.
 */
export async function generateSpecSheetCanvas({
  frontImage,
  backImage,
  designState = state,
  notes = '',
  orderQty = '',
  designerName = 'Designer',
}) {
  const width = 2400;
  const height = 1560;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');

  // Background
  ctx.fillStyle = '#f8fafc'; // light slate
  ctx.fillRect(0, 0, width, height);

  // Subtle tech-pack grid pattern
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // -------------------------------------------------------------
  // TOP HEADER BAR (Navy/Charcoal Technical Blueprint Style)
  // -------------------------------------------------------------
  const headerHeight = 110;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, headerHeight);

  // Top accent colored line
  ctx.fillStyle = '#4f46e5'; // Indigo accent
  ctx.fillRect(0, 0, width, 5);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Inter", -apple-system, sans-serif';
  ctx.fillText('GARMENT PRODUCTION SPECIFICATION SHEET', 48, 52);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 15px "Inter", -apple-system, sans-serif';
  ctx.fillText('TECHNICAL CUTTING, SEWING & PRINTING BLUEPRINT • THIRDUNI STUDIO', 48, 82);

  // Header Metadata Badges (Right side)
  const garmentLabel = (
    GARMENTS.find((g) => g.id === designState.garment)?.label || designState.garment
  ).toUpperCase();
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const specCode = `SPEC-${(designState.garment || 'tshirt').toUpperCase()}-${Date.now().toString().slice(-6)}`;

  const drawBadge = (x, y, label, val, bg = '#1e293b') => {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x, y, 190, 48, 8);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px "Inter", sans-serif';
    ctx.fillText(label, x + 14, y + 18);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Inter", sans-serif';
    ctx.fillText(val, x + 14, y + 38);
  };

  drawBadge(width - 660, 32, 'GARMENT TYPE', garmentLabel, '#1e293b');
  drawBadge(width - 450, 32, 'SPEC REF ID', specCode, '#1e293b');
  drawBadge(width - 240, 32, 'ISSUE DATE', dateStr, '#312e81');

  // -------------------------------------------------------------
  // MAIN BODY: FRONT & BACK VIEW FRAMES
  // -------------------------------------------------------------
  const viewCardWidth = 1120;
  const viewCardHeight = 840;
  const viewCardY = 145;

  const [imgFront, imgBack] = await Promise.all([
    loadImage(frontImage),
    loadImage(backImage),
  ]);

  const drawElevationCard = (x, y, title, subtitle, img, isBack = false) => {
    // Card background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x, y, viewCardWidth, viewCardHeight, 16);
    ctx.fill();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, viewCardWidth, viewCardHeight, 16);
    ctx.stroke();

    // Card Header Pill
    ctx.fillStyle = isBack ? '#0284c7' : '#4f46e5';
    ctx.beginPath();
    ctx.roundRect(x + 24, y + 20, 150, 34, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Inter", sans-serif';
    ctx.fillText(title, x + 38, y + 42);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px "Inter", sans-serif';
    ctx.fillText(subtitle, x + 190, y + 42);

    // Rendered 3D Garment Image
    const renderSize = 740;
    const imgX = x + (viewCardWidth - renderSize) / 2;
    const imgY = y + 75;
    ctx.drawImage(img, imgX, imgY, renderSize, renderSize);

    // Dimension crosshair reference lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    // vertical center guideline
    ctx.moveTo(x + viewCardWidth / 2, y + 70);
    ctx.lineTo(x + viewCardWidth / 2, y + viewCardHeight - 20);
    // chest crosshair
    ctx.moveTo(x + 50, y + 260);
    ctx.lineTo(x + viewCardWidth - 50, y + 260);
    ctx.stroke();
    ctx.setLineDash([]);

    // Chest line label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px "Inter", sans-serif';
    ctx.fillText('CHEST ALIGNMENT AXIS', x + 50, y + 252);
  };

  // Left: Front Elevation
  drawElevationCard(
    48,
    viewCardY,
    'FRONT ELEVATION',
    'Primary Graphic, Chest Artwork & Collar Trim',
    imgFront,
    false
  );

  // Right: Back Elevation
  drawElevationCard(
    width - viewCardWidth - 48,
    viewCardY,
    'BACK ELEVATION',
    'Shoulders, Neck Yoke, Spine Alignment & Hem',
    imgBack,
    true
  );

  // -------------------------------------------------------------
  // TECHNICAL SPECIFICATIONS PANEL (Bottom 3 Columns)
  // -------------------------------------------------------------
  const specPanelY = 1015;
  const specPanelHeight = 490;
  const colWidth = (width - 96 - 40) / 3; // 741px each

  // Panel Background
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(48, specPanelY, width - 96, specPanelHeight, 16);
  ctx.fill();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(48, specPanelY, width - 96, specPanelHeight, 16);
  ctx.stroke();

  // Helper for column headers
  const drawColumnHeader = (colX, title, icon) => {
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillText(`${icon}  ${title}`, colX, specPanelY + 38);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(colX, specPanelY + 52);
    ctx.lineTo(colX + colWidth - 24, specPanelY + 52);
    ctx.stroke();
  };

  // Helper for key-value row
  const drawSpecRow = (colX, rowY, label, value, badgeColor = null) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 13px "Inter", sans-serif';
    ctx.fillText(label, colX, rowY);

    if (badgeColor) {
      // Color swatch box
      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.roundRect(colX + 180, rowY - 14, 22, 22, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(value, colX + 212, rowY + 3);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.fillText(value, colX + 180, rowY);
    }
  };

  // --- COLUMN 1: COLORWAY & FABRICATION ---
  const col1X = 76;
  drawColumnHeader(col1X, 'COLORWAY & FABRIC SPEC', '🎨');

  const baseHex = (designState.color || '#EFBD48').toUpperCase();
  const baseRgb = hexToRgb(baseHex);
  drawSpecRow(col1X, specPanelY + 84, 'Base Fabric Color:', `${baseHex} (RGB: ${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b})`, baseHex);

  const trimHex = (designState.trimColor || '#111F35').toUpperCase();
  const trimRgb = hexToRgb(trimHex);
  const trimActive = designState.useTrim && designState.isFullTexture;
  drawSpecRow(
    col1X,
    specPanelY + 120,
    'Trim / Ribbing Color:',
    trimActive ? `${trimHex} (RGB: ${trimRgb.r}, ${trimRgb.g}, ${trimRgb.b})` : 'Tone-on-tone (Matches base)',
    trimActive ? trimHex : null
  );

  drawSpecRow(col1X, specPanelY + 156, 'Fabric Structure:', 'Single Jersey / French Terry Knit');
  drawSpecRow(col1X, specPanelY + 192, 'Suggested Weight:', '220 - 280 GSM Ring-Spun Cotton');
  drawSpecRow(col1X, specPanelY + 228, 'Pattern Sublimation:', designState.isFullTexture ? 'Edge-to-Edge All-Over Print' : 'Solid Dyed Ground');
  drawSpecRow(col1X, specPanelY + 264, 'Pattern Scale Factor:', designState.isFullTexture ? `${(designState.patternScale || 1).toFixed(2)}x Repeat` : 'N/A');

  // --- COLUMN 2: ARTWORK & EMBELLISHMENTS ---
  const col2X = 48 + colWidth + 24;
  drawColumnHeader(col2X, 'ARTWORK & DECORATION', '✨');

  const logoStatus = designState.isLogoTexture ? 'Front Placement Active' : 'None';
  drawSpecRow(col2X, specPanelY + 84, 'Chest Graphic/Logo:', logoStatus);

  if (designState.isLogoTexture) {
    const scalePercent = Math.round((typeof designState.logoScale === 'number' ? designState.logoScale : 0.15) * 100);
    const pos = designState.logoPosition || [0, 0.04, 0.15];
    drawSpecRow(col2X, specPanelY + 120, 'Logo Scale & Angle:', `${scalePercent}% of chest • ${designState.logoRotation || 0}° Angle`);
    drawSpecRow(col2X, specPanelY + 156, 'Print Technique:', 'Direct-To-Garment (DTG) / Screenprint');
    drawSpecRow(col2X, specPanelY + 192, 'Background Mask:', designState.removeLogoBackground ? 'Isolated / Alpha Cutout' : 'Solid Rectangular');
  } else {
    drawSpecRow(col2X, specPanelY + 120, 'Logo Scale & Angle:', 'None');
    drawSpecRow(col2X, specPanelY + 156, 'Print Technique:', 'N/A');
    drawSpecRow(col2X, specPanelY + 192, 'Background Mask:', 'N/A');
  }

  const textStatus = designState.isTextTexture ? `"${designState.textContent || 'TEXT'}"` : 'None';
  drawSpecRow(col2X, specPanelY + 228, 'Custom Typography:', textStatus);
  if (designState.isTextTexture) {
    const textHex = (designState.textColor || '#ffffff').toUpperCase();
    drawSpecRow(
      col2X,
      specPanelY + 264,
      'Font & Style:',
      `${designState.textFont || 'Impact'} • ${designState.textPrintStyle || 'Screenprint'}`,
      textHex
    );
  } else {
    drawSpecRow(col2X, specPanelY + 264, 'Font & Style:', 'None');
  }

  // --- COLUMN 3: SEWING & PRODUCTION NOTES ---
  const col3X = 48 + colWidth * 2 + 48;
  drawColumnHeader(col3X, 'CUTTING & SEWING NOTES', '✂️');

  drawSpecRow(col3X, specPanelY + 84, 'Tolerance Standard:', '± 1.2 cm Standard Apparel Fit');
  drawSpecRow(col3X, specPanelY + 120, 'Seam Stitching:', 'Twin-needle lockstitch & overlock');
  drawSpecRow(col3X, specPanelY + 156, 'Production Quantity:', orderQty ? `${orderQty} units` : 'Sample Prototype');
  drawSpecRow(col3X, specPanelY + 192, 'Designer / Approver:', designerName || 'ThirdUni Studio');

  // Custom Sewer / Tailor Instructions Box
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(col3X, specPanelY + 220, colWidth - 70, 110, 8);
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText('SPECIAL SEWER / PRINTER INSTRUCTIONS:', col3X + 14, specPanelY + 242);

  ctx.fillStyle = '#0f172a';
  ctx.font = '500 12px "Inter", sans-serif';
  const customNotes = notes.trim() || 'Ensure color matching against digital sRGB coordinates. Verify logo center alignment before final stitching.';

  // Word wrap instructions inside box
  const words = customNotes.split(' ');
  let line = '';
  let lineY = specPanelY + 264;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > colWidth - 100 && n > 0) {
      ctx.fillText(line, col3X + 14, lineY);
      line = words[n] + ' ';
      lineY += 18;
      if (lineY > specPanelY + 315) break;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, col3X + 14, lineY);

  // -------------------------------------------------------------
  // FOOTER SIGN-OFF BAR
  // -------------------------------------------------------------
  const footerY = specPanelY + 355;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(76, footerY);
  ctx.lineTo(width - 76, footerY);
  ctx.stroke();

  // Sign-off boxes
  const drawSignBox = (x, label) => {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText(label, x, footerY + 35);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + 130, footerY + 16, 220, 32, 6);
    ctx.stroke();
  };

  drawSignBox(76, 'PATTERN CUTTER:');
  drawSignBox(520, 'PRINT SHOP LEAD:');
  drawSignBox(960, 'SEWING LEAD:');
  drawSignBox(1400, 'FINAL QC PASSED:');

  // Bottom Notice
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 11px "Inter", sans-serif';
  ctx.fillText('CONFIDENTIAL PRODUCTION DOCUMENT • READY FOR INDUSTRIAL CUT-MAKE-TRIM (CMT) & DIGITAL DIRECT PRINTING', 76, height - 35);

  ctx.fillText('Lossless 2400x1560 PNG Spec Sheet', width - 290, height - 35);

  return canvas;
}

/**
 * Generates a clean 2400 x 1350 Side-by-Side Mockup image (Front & Back)
 * on a clean studio backdrop without tables/text packs.
 */
export async function generateCleanMockupCanvas({
  frontImage,
  backImage,
  garmentLabel = 'Garment',
  colorHex = '#EFBD48',
}) {
  const width = 2400;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');

  // Studio Gradient Backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const [imgFront, imgBack] = await Promise.all([
    loadImage(frontImage),
    loadImage(backImage),
  ]);

  const renderSize = 980;
  const leftX = (width / 2 - renderSize) / 2;
  const rightX = width / 2 + (width / 2 - renderSize) / 2;
  const imgY = 140;

  // Draw Front Image
  ctx.drawImage(imgFront, leftX, imgY, renderSize, renderSize);

  // Draw Back Image
  ctx.drawImage(imgBack, rightX, imgY, renderSize, renderSize);

  // Labels: FRONT & BACK
  const drawBadge = (cx, label, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - 90, 70, 180, 44, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, 98);
    ctx.textAlign = 'start';
  };

  drawBadge(leftX + renderSize / 2, 'FRONT VIEW', '#4f46e5');
  drawBadge(rightX + renderSize / 2, 'BACK VIEW', '#0284c7');

  // Bottom Center Product Info Pill
  const pillW = 540;
  const pillH = 50;
  const pillX = (width - pillW) / 2;
  const pillY = height - 85;

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 25);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 13px "Inter", sans-serif';
  ctx.fillText('THIRDUNI APPAREL •', pillX + 28, pillY + 31);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.fillText(garmentLabel.toUpperCase(), pillX + 175, pillY + 31);

  // Color Swatch
  ctx.fillStyle = colorHex;
  ctx.beginPath();
  ctx.roundRect(pillX + 310, pillY + 14, 22, 22, 5);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillText(colorHex.toUpperCase(), pillX + 342, pillY + 31);

  return canvas;
}

/**
 * Downloads a canvas directly as a real binary image file using Blob and URL.createObjectURL.
 * This completely avoids the browser data URL size limits that corrupt large image downloads.
 */
export function downloadCanvasAsImage(canvas, filename, format = 'png') {
  if (!canvas) return;

  const isJpeg = format === 'jpeg' || format === 'jpg';
  const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
  const quality = isJpeg ? 0.94 : undefined;

  // Clean filename extension
  const ext = isJpeg ? 'jpg' : 'png';
  const cleanBase = filename.replace(/\.(png|jpg|jpeg)$/i, '');
  const cleanFilename = `${cleanBase}.${ext}`;

  if (canvas.toBlob) {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          fallbackDownload(canvas, cleanFilename, mimeType, quality);
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobUrl;
        link.download = cleanFilename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 3000);
      },
      mimeType,
      quality
    );
  } else {
    fallbackDownload(canvas, cleanFilename, mimeType, quality);
  }
}

function fallbackDownload(canvas, filename, mimeType, quality) {
  const dataUrl = canvas.toDataURL(mimeType, quality);
  const link = document.createElement('a');
  link.style.display = 'none';
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => document.body.removeChild(link), 1500);
}

/**
 * Copies a canvas as a PNG image to the system clipboard.
 */
export async function copyCanvasToClipboard(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('Canvas blob conversion failed'));
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}

