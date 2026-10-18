# Caftan

`model.glb` is a long red caftan with short sleeves, a gold belt, and cream and gold embroidery at the neckline, in motifs down the robe and in a wide band at the hem. It was supplied by the site owner as `karako.glb`, an
AI-generated model (Blender glTF export, about 70 MB, 1.5 million triangles).
The file names of the two traditional garments were swapped: `coftan.glb` is
the karakou and `karako.glb` is the caftan.

Made with `../pack_generated.py`, keeping the colour texture:

    npx @gltf-transform/cli simplify karako.glb simple.glb --ratio 0.06 --error 0.0015
    python3 public/garments/pack_generated.py --source simple.glb --name caftan --print keep --designs wrap

90,000 triangles, about 5 MB.

The chosen colour paints only the fabric; the embroidery keeps its own gold and
cream, and AI designs sit under it. The viewer tells embroidery from fabric by
brightness and colourfulness, with thresholds measured from this model
(`EMBROIDERY` in `src/config/garments/materials.js`). The default colour
(`src/config/garments/catalog.js`) is the fabric's own average colour, so the
garment first appears as made. The Wear it fit (`src/tryon/fitPose.js`) is set
from body proportions; use the Size and Position sliders to fine-tune.
