"""Packs an AI-generated garment (Blender glTF export) for the site.

Generated models arrive at 60-90 MB with 1.5 million triangles and 4096 px
textures. First slim the mesh (glTF-Transform, meshoptimizer):

    npx @gltf-transform/cli simplify source.glb simple.glb --ratio 0.06 --error 0.0015

then pack it (needs numpy and Pillow):

    python3 public/garments/pack_generated.py --source simple.glb --name hat --print drop --designs wrap

Options:
  --print drop   remove the generated colour texture so the viewer paints the
                 chosen colour (for plain or dark garments; tinting black does
                 nothing). The normal map is kept for folds and stitching.
  --print keep   keep the colour texture; the viewer tints it with the chosen
                 colour (for light, black-and-white designs such as the shoe).
  --designs wrap AI designs wrap around the vertical axis (clothes, hats).
  --designs side AI designs are projected from the side (shoes).
  --measure      print the Wear it measurements for src/tryon/fitPose.js
                 (garments worn on the upper body).

Always: the upright rotation is baked in (Y up, front +Z), the mesh is named
`fabric_<name>` so the viewer colours it, textures are resized to 2048 px JPEG,
and the roughness/metal map and glossy specular setting are dropped.
"""
from pathlib import Path
import argparse, io, json, struct
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description='Pack an AI-generated garment for the site.')
parser.add_argument('--source', required=True, type=Path)
parser.add_argument('--name', required=True)
parser.add_argument('--print', dest='print_mode', choices=['drop', 'keep'], required=True)
parser.add_argument('--designs', choices=['wrap', 'side'], required=True)
parser.add_argument('--measure', action='store_true')
parser.add_argument('--texture-size', default=2048, type=int)
parser.add_argument('--output-dir', type=Path)
args = parser.parse_args()
output_dir = args.output_dir or Path(__file__).resolve().parent / args.name

data = args.source.read_bytes()
json_length = struct.unpack_from('<I', data, 12)[0]
source = json.loads(data[20:20 + json_length])
binary_in = data[20 + json_length + 8:]

def read(index):
    """Reads an accessor, including interleaved ones."""
    accessor = source['accessors'][index]
    view = source['bufferViews'][accessor['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[accessor['type']]
    dtype = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[accessor['componentType']]
    size = np.dtype(dtype).itemsize * width
    stride = view.get('byteStride') or size
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    raw = np.frombuffer(binary_in, np.uint8, stride * (accessor['count'] - 1) + size, start)
    rows = np.lib.stride_tricks.as_strided(raw, (accessor['count'], size), (stride, 1)).copy().view(dtype)
    return rows.reshape(-1, width) if width > 1 else rows.ravel()

def texture_jpeg(texture_index):
    meta = source['images'][source['textures'][texture_index]['source']]
    view = source['bufferViews'][meta['bufferView']]
    start = view.get('byteOffset', 0)
    picture = Image.open(io.BytesIO(binary_in[start:start + view['byteLength']])).convert('RGB')
    picture = picture.resize((args.texture_size, args.texture_size), Image.LANCZOS)
    encoded = io.BytesIO()
    picture.save(encoded, 'JPEG', quality=90, optimize=True)
    return encoded.getvalue()

primitive = source['meshes'][0]['primitives'][0]
positions = read(primitive['attributes']['POSITION']).astype(np.float64)
normals = read(primitive['attributes']['NORMAL']).astype(np.float64)
uv0 = read(primitive['attributes']['TEXCOORD_0']).astype(np.float64)
indices = read(primitive['indices']).astype(np.int64).reshape(-1, 3)

# These exports turn the model upright with a +90 degree rotation about X on
# their only node. Bake it in so the file has no transforms.
if source['nodes'][0].get('rotation'):
    upright = lambda v: np.stack([v[:, 0], -v[:, 2], v[:, 1]], axis=1)
    positions, normals = upright(positions), upright(normals)
normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
low, high = positions.min(axis=0), positions.max(axis=0)
height = high[1] - low[1]
axis = (low + high) / 2

# ---------- TEXCOORD_1, used by the viewer for AI designs ----------
if args.designs == 'side':
    length = high[0] - low[0]
    uv1 = np.stack([(positions[:, 0] - low[0]) / length, (positions[:, 1] - low[1]) / length], axis=1)
else:
    # Around the vertical axis: front centre at u = 0.5, seam down the back,
    # v scaled so a square of print stays square at the typical radius.
    u = np.arctan2(positions[:, 0] - axis[0], positions[:, 2] - axis[2]) / (2 * np.pi) + 0.5
    radius = np.median(np.hypot(positions[:, 0] - axis[0], positions[:, 2] - axis[2]))
    uv1 = np.stack([u, (positions[:, 1] - low[1]) / (2 * np.pi * radius)], axis=1)
    # Triangles crossing the back seam get copies of their low-u corners at u + 1.
    extra = {}
    for triangle in np.nonzero(np.ptp(uv1[indices, 0], axis=1) > 0.5)[0]:
        for corner in range(3):
            vertex = indices[triangle, corner]
            if uv1[vertex, 0] < 0.5:
                extra.setdefault(vertex, len(positions) + len(extra))
                indices[triangle, corner] = extra[vertex]
    if extra:
        copies = np.fromiter(extra.keys(), dtype=np.int64)
        positions = np.concatenate([positions, positions[copies]])
        normals = np.concatenate([normals, normals[copies]])
        uv0 = np.concatenate([uv0, uv0[copies]])
        uv1 = np.concatenate([uv1, uv1[copies] + [1, 0]])

# ---------- write ----------
gltf = {'asset': {'version': '2.0', 'generator': f'{args.source.name}, packed by pack_generated.py'},
        'scene': 0, 'scenes': [{'nodes': [0]}],
        'nodes': [{'name': f'fabric_{args.name}', 'mesh': 0, 'extras': {'role': 'fabric'}}],
        'meshes': [], 'buffers': [{'byteLength': 0}], 'bufferViews': [], 'accessors': [],
        'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
        'images': [], 'textures': [], 'materials': []}
binary = bytearray()

def view(payload, target=None):
    while len(binary) % 4:
        binary.append(0)
    entry = {'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(payload)}
    if target:
        entry['target'] = target
    gltf['bufferViews'].append(entry)
    binary.extend(payload)
    return len(gltf['bufferViews']) - 1

def accessor(array, kind, component=5126, bounds=False):
    array = np.ascontiguousarray(array, dtype='<f4' if component == 5126 else '<u4')
    entry = {'bufferView': view(array.tobytes(), 34963 if component == 5125 else 34962),
             'componentType': component, 'count': len(array), 'type': kind}
    if bounds:
        entry['min'] = array.min(axis=0).tolist()
        entry['max'] = array.max(axis=0).tolist()
    gltf['accessors'].append(entry)
    return len(gltf['accessors']) - 1

def add_texture(payload, name):
    gltf['images'].append({'bufferView': view(payload), 'mimeType': 'image/jpeg', 'name': name})
    gltf['textures'].append({'sampler': 0, 'source': len(gltf['images']) - 1})
    return len(gltf['textures']) - 1

material_in = source['materials'][0]
pbr = {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 0.8}
if args.print_mode == 'keep':
    pbr['baseColorTexture'] = {'index': add_texture(texture_jpeg(material_in['pbrMetallicRoughness']['baseColorTexture']['index']), f'{args.name}-colour')}
normal_index = add_texture(texture_jpeg(material_in['normalTexture']['index']), f'{args.name}-normal')
gltf['materials'].append({'name': 'fabric', 'doubleSided': True, 'pbrMetallicRoughness': pbr,
                          'normalTexture': {'index': normal_index, 'scale': 1}, 'extras': {'role': 'fabric'}})
gltf['meshes'].append({'name': f'fabric_{args.name}', 'primitives': [{
    'attributes': {'POSITION': accessor(positions, 'VEC3', bounds=True), 'NORMAL': accessor(normals, 'VEC3'),
                   'TEXCOORD_0': accessor(uv0, 'VEC2'), 'TEXCOORD_1': accessor(uv1, 'VEC2')},
    'indices': accessor(indices.ravel(), 'SCALAR', 5125), 'material': 0}]})

gltf['buffers'][0]['byteLength'] = len(binary)
while len(binary) % 4:
    binary.append(0)
metadata = json.dumps(gltf, separators=(',', ':')).encode()
metadata += b' ' * ((-len(metadata)) % 4)
total = 12 + 8 + len(metadata) + 8 + len(binary)
glb = (struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(metadata), 0x4E4F534A) + metadata
       + struct.pack('<II', len(binary), 0x004E4942) + binary)
output_dir.mkdir(parents=True, exist_ok=True)
(output_dir / 'model.glb').write_bytes(glb)
report = {'vertices': len(positions), 'triangles': len(indices), 'bytes': len(glb), 'size': np.round(high - low, 3).tolist()}

# ---------- Wear it measurements ----------
if args.measure:
    # In the viewer's units: centred, then scaled to fit 0.67 tall (hooded
    # tops use 0.67, see Garment.jsx) or 0.66 wide.
    max_height = 0.67 if args.name == 'hoodie' else 0.75
    scale = min(max_height / height, 0.66 / (high[0] - low[0]))
    # Widths from the top down through the upper half. The shoulder line is
    # the sharpest widening: a hood or collar above it is much narrower, and
    # sleeves below it only widen gradually as they hang.
    # The top 10% is skipped: the crown of a hood widens sharply too.
    levels = np.linspace(high[1] - height * 0.1, high[1] - height * 0.5, 64)
    band = height * 0.006
    widths = np.array([np.ptp(positions[np.abs(positions[:, 1] - level) < band, 0])
                       if np.any(np.abs(positions[:, 1] - level) < band) else 0 for level in levels])
    smooth = np.convolve(widths, np.ones(3) / 3, mode='same')
    jump = int(np.argmax(np.diff(smooth[2:-2]))) + 3
    shoulder_y, shoulder_width = levels[jump], widths[min(jump + 2, len(widths) - 1)]
    report['fit'] = {'shoulderWidth': round(shoulder_width * scale * 0.95, 3),
                     'torsoLength': round((shoulder_y - low[1]) * scale * 0.95, 3),
                     'shoulderY': round((shoulder_y - axis[1]) * scale, 3)}
print(json.dumps(report))
