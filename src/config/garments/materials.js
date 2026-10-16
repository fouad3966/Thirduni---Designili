import { DoubleSide } from 'three';

// Preserve authored UVs and cloth normals. Only neutralize diffuse atlases
// suitable for detail.
const detailLevels = { dress: 0.3 };
// The shoe keeps its own black-and-white design and is tinted by the colour,
// instead of being painted one flat colour over sole, laces and upper.
const KEEPS_PRINT = new Set(['shoes']);

export function createTailoredMaterial(source, garment) {
  const material = source.clone();
  const keepsPrint = KEEPS_PRINT.has(garment);
  material.userData.printMap = keepsPrint ? source.map : null;
  const detailMap = garment === 'hoodie' || keepsPrint ? null : source.map;
  material.color.set('#ffffff');
  material.metalness = 0;
  material.roughness = garment === 'dress' ? 0.78 : keepsPrint ? 0.7 : 0.93;
  material.side = DoubleSide;
  material.normalScale.setScalar(0.5);

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
