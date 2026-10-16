# Low-top sneaker

`model.glb` is a single low-top sneaker, black, white and grey, in a cartoon
style. It was supplied by the site owner as `sheos.glb`, an AI-generated model
(Blender glTF export, 87 MB, 1.5 million triangles, 4096 px PBR textures).

**Note:** the design carries a Nike-style swoosh and an Air Force 1 style
silhouette. Showing or selling a product with another company's logo can
infringe their trademark; use a logo-free model before selling shoes.

Adaptations, made by `convert_shoes.py` (see its header for the exact commands):

- Simplified to about 90,000 triangles; textures resized to 2048 px JPEG;
  6 MB in total.
- The upright rotation baked into the vertices: Y up, toe towards +X.
- Mesh named `fabric_shoes` so the viewer colours it. Unlike the other
  garments the shoe keeps its own design and is tinted by the chosen colour
  (white shows it unchanged). The roughness/metal map and glossy specular
  setting are removed.
- A second set of texture coordinates (`TEXCOORD_1`), projected from the side,
  for AI designs.

The viewer shows it turned to a three-quarter angle (`src/canvas/Garment.jsx`).
Shoes are left out of Wear it, which fits garments to the upper body.
