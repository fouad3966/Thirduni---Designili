# Long-sleeve dress

`model.glb` is a long-sleeve fit-and-flare dress with a scoop front neckline
and criss-cross straps at the back. It was supplied by the site owner as
`aas.glb`, an AI-generated model (Blender glTF export, 66 MB, 1.5 million
triangles, PBR textures).

Adaptations, made by `convert_aas.py` (see its header for the exact commands):

- Simplified from 1.5 million to about 105,000 triangles (glTF-Transform weld
  and simplify), 6 MB in total.
- The upright rotation baked into the vertices: Y up, front facing +Z.
- Mesh named `fabric_dress` so the viewer recolours it.
- The generated print (near-black with pink and purple speckles) and its
  roughness/metal maps are removed, so colours and AI designs show cleanly.
  The normal map is kept at 2048 px for the folds and fabric detail.
- A second set of texture coordinates (`TEXCOORD_1`) wrapped around the body
  for AI designs; the generator's own atlas would scramble a print.

The previous dress (Camisole Dress with Full Skirt by Margaret Toigo, CC0) is
kept in `previous/` with its conversion script and licence metadata. To switch
back, copy `previous/model.glb` over `model.glb` and restore the `dress` entry
in `src/tryon/fitPose.js` to `{ shoulderWidth: 0.27, torsoLength: 0.36, shoulderY: 0.35 }`.
