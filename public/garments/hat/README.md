# Baseball cap

`model.glb` is a six-panel baseball cap with a curved brim and a snapback
strap. It was supplied by the site owner as `hat.glb`, an AI-generated model
(Blender glTF export, 72 MB, 1.5 million triangles). The generated texture
(black, with a small white brush-stroke logo on the front) is removed so the
chosen colour and AI designs show; the normal map keeps the stitching.

Made with `../pack_generated.py` (see its header for the exact commands):

    npx @gltf-transform/cli simplify hat.glb simple.glb --ratio 0.06 --error 0.0015
    python3 public/garments/pack_generated.py --source simple.glb --name hat --print drop --designs wrap

90,000 triangles, 4.6 MB. The viewer shows it turned to a three-quarter view
(`src/canvas/Garment.jsx`). Hats are left out of Wear it, which fits garments
to the upper body.
