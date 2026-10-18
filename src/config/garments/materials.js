import { DoubleSide } from 'three';

// Preserve authored UVs and cloth normals. Only neutralize diffuse atlases
// suitable for detail.
const detailLevels = { dress: 0.3 };
// The shoe keeps its own black-and-white design and is tinted by the colour,
// instead of being painted one flat colour over sole, laces and upper.
const KEEPS_PRINT = new Set(['shoes']);
// Embroidered garments: the colour paints the fabric while the embroidery keeps
// its own gold and cream, and AI designs sit under the embroidery. A texel is
// embroidery when it is bright enough (luma) and not one strong colour
// (white: its weakest channel over its strongest), both in linear colour.
// fabricLuma is the fabric's average brightness, so the folds and the velvet's
// sheen in the texture shade the new colour. Measured from each model.
const EMBROIDERY = {
  karakou: { luma: [0.03, 0.09], white: [0.05, 0.12], fabricLuma: 0.005 },
  caftan: { luma: [0.05, 0.12], white: [0.06, 0.16], fabricLuma: 0.035 },
};

function addEmbroidery(material, printMap, settings) {
  material.onBeforeCompile = shader => {
    shader.uniforms.embroideryMap = { value: printMap };
    shader.uniforms.embroideryLuma = { value: settings.luma };
    shader.uniforms.embroideryWhite = { value: settings.white };
    shader.uniforms.fabricLuma = { value: settings.fabricLuma };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 embroideryUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nembroideryUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 embroideryUv;
        uniform sampler2D embroideryMap;
        uniform vec2 embroideryLuma;
        uniform vec2 embroideryWhite;
        uniform float fabricLuma;
      `)
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 printColor = texture2D(embroideryMap, embroideryUv).rgb;
        float printLuma = dot(printColor, vec3(0.2126, 0.7152, 0.0722));
        float printWhite = min(min(printColor.r, printColor.g), printColor.b)
          / max(max(printColor.r, printColor.g), max(printColor.b, 0.0001));
        float stitch = smoothstep(embroideryLuma.x, embroideryLuma.y, printLuma)
          * smoothstep(embroideryWhite.x, embroideryWhite.y, printWhite);
        float fabricShade = clamp(printLuma / fabricLuma, 0.35, 1.8);
        diffuseColor.rgb = mix(diffuseColor.rgb * fabricShade, printColor, stitch);
      `);
  };
  material.customProgramCacheKey = () => `embroidered-${JSON.stringify(settings)}`;
}

export function createTailoredMaterial(source, garment) {
  const material = source.clone();
  const keepsPrint = KEEPS_PRINT.has(garment);
  material.userData.printMap = keepsPrint ? source.map : null;
  const embroidery = EMBROIDERY[garment];
  const detailMap = garment === 'hoodie' || keepsPrint || embroidery ? null : source.map;
  material.color.set('#ffffff');
  material.metalness = 0;
  material.roughness = garment === 'dress' ? 0.78 : keepsPrint ? 0.7 : 0.93;
  material.side = DoubleSide;
  material.normalScale.setScalar(0.5);
  if (embroidery && source.map) {
    addEmbroidery(material, source.map, embroidery);
    material.map = null;
  }

  if (detailMap) {
    material.onBeforeCompile = shader => {
      shader.uniforms.clothDetailMap = { value: detailMap };
      shader.uniforms.clothDetailLevel = { value: detailLevels[garment] };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 clothUv;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nclothUv = uv;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec2 clothUv;
          uniform sampler2D clothDetailMap;
          uniform float clothDetailLevel;
        `)
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 clothDetail = texture2D(clothDetailMap, clothUv).rgb;
          float clothLuma = dot(clothDetail, vec3(0.2126, 0.7152, 0.0722));
          float clothShade = clamp(pow(max(clothLuma, 0.00001) / clothDetailLevel, 0.3), 0.6, 1.08);
          diffuseColor.rgb *= clothShade;
        `);
    };
    material.customProgramCacheKey = () => `tailored-cloth-${garment}-v1`;
  }
  return material;
}

export function updateTailoredMaterial(material, texture, design) {
  const nextMap = design.isFullTexture ? texture : material.userData.printMap ?? null;
  if (material.map !== nextMap) {
    material.map = nextMap;
    material.needsUpdate = true;
  }
  material.color.set(design.isFullTexture ? '#ffffff' : design.color);
}
