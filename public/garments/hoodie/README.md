# Pullover hoodie

`model.glb` is a pullover hoodie with a hood, drawstrings, a front pocket and
ribbed cuffs and hem. It was supplied by the site owner as `hoodie.glb`, an
AI-generated model (Blender glTF export, 72 MB, 1.5 million triangles). The
generated purple texture, with dark blotches from the generator, is removed so
colours and AI designs show cleanly; the normal map keeps the ribbing and seams.

Made with `../pack_generated.py` (see its header for the exact commands):

    npx @gltf-transform/cli simplify hoodie.glb simple.glb --ratio 0.06 --error 0.0015
    python3 public/garments/pack_generated.py --source simple.glb --name hoodie --print drop --designs wrap --measure

90,000 triangles, 4.4 MB. The Wear it fit in `src/tryon/fitPose.js` comes from
the `--measure` output.

The previous hoodie (Hooded Sweat Jacket by Elvaerwyn, CC BY 4.0) is kept in
`previous/` with its source files. To switch back, copy `previous/model.glb`
over `model.glb`, restore the `hoodie` entry in `src/tryon/fitPose.js` to
`{ shoulderWidth: 0.365, torsoLength: 0.50, shoulderY: 0.215 }` and its credit.
