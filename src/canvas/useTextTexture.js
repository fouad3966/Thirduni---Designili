import { useEffect, useMemo } from 'react';
import { createTextTextureHolder, drawTextOnCanvas, getFontFamily } from '../config/textTexture';

/**
 * The customer's text, drawn onto a canvas texture and redrawn whenever a text
 * setting changes. Shared by the T-shirt and the other garments so every
 * garment shows exactly the same lettering.
 */
export default function useTextTexture(snap) {
  const { canvas, texture } = useMemo(() => createTextTextureHolder(), []);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      drawTextOnCanvas(canvas, {
        text: snap.textContent,
        font: snap.textFont,
        textColor: snap.textColor,
        textSize: snap.textSize,
        isUppercase: snap.textUppercase,
        isCurved: snap.textCurved,
        curveRadius: snap.textCurveRadius,
        hasOutline: snap.textBorder,
        outlineColor: snap.textBorderColor,
        outlineWidth: snap.textBorderWidth,
        hasShadow: snap.textShadow,
        shadowColor: snap.textShadowColor,
        printStyle: snap.textPrintStyle,
      });
      texture.needsUpdate = true;
    };
    draw();

    // Web fonts load lazily (Arabic subsets especially): redraw once the face is ready.
    if (snap.textContent && document.fonts?.load) {
      document.fonts.load(`bold 92px ${getFontFamily(snap.textFont)}`, snap.textContent)
        .then(() => { if (!cancelled) draw(); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [
    canvas, texture, snap.isTextTexture, snap.textContent, snap.textFont, snap.textColor, snap.textSize,
    snap.textUppercase, snap.textCurved, snap.textCurveRadius, snap.textBorder, snap.textBorderColor,
    snap.textBorderWidth, snap.textShadow, snap.textShadowColor, snap.textPrintStyle,
  ]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
