"""Packs aas.glb (an AI-generated long-sleeve dress) as the site's dress model.

The source is 66 MB / 1.5 million triangles with a printed, AI-generated
texture cut into hundreds of atlas pieces. Two steps make it usable:

1. Slim the mesh to about 105,000 triangles (glTF-Transform, meshoptimizer):

    npx @gltf-transform/cli weld aas.glb weld.glb
    npx @gltf-transform/cli simplify weld.glb simple.glb --ratio 0.07 --error 0.0015

2. Pack it for the site (this script, needs numpy and Pillow):

    python3 public/garments/dress/convert_aas.py --source simple.glb

This step:
  * bakes the upright rotation into the vertices (Y up, front facing +Z);
  * names the mesh `fabric_dress` so the viewer recolours it;
  * drops the printed base colour and the roughness/metal maps: their pink
    speckles would show through every colour a customer picks. The normal
    map is kept (resized to 2048 px) for the fold and fabric detail;
  * adds a second set of texture coordinates (TEXCOORD_1) wrapped around the
    body, which the viewer uses for AI designs, because the generator's own
    atlas would scramble a pattern into pieces;
  * prints the measurements used by the Wear it fit (src/tryon/fitPose.js).
"""
from pathlib import Path
import argparse, io, json, struct
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description='Pack the slimmed aas.glb dress for the site.')
parser.add_argument('--source', required=True, type=Path, help='Slimmed glb from step 1')
parser.add_argument('--output-dir', default=Path(__file__).resolve().parent, type=Path)
parser.add_argument('--normal-size', default=2048, type=int)
args = parser.parse_args()

# ---------- read (handles interleaved buffers) ----------
data = args.source.read_bytes()
json_length = struct.unpack_from('<I', data, 12)[0]
source = json.loads(data[20:20 + json_length])
binary_in = data[20 + json_length + 8:]

def read(index):
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

primitive = source['meshes'][0]['primitives'][0]
positions = read(primitive['attributes']['POSITION']).astype(np.float64)
normals = read(primitive['attributes']['NORMAL']).astype(np.float64)
uv0 = read(primitive['attributes']['TEXCOORD_0']).astype(np.float64)
indices = read(primitive['indices']).astype(np.int64).reshape(-1, 3)

# The source node turns the dress upright (+90 degrees about X): bake it in.
upright = lambda v: np.stack([v[:, 0], -v[:, 2], v[:, 1]], axis=1)
positions, normals = upright(positions), upright(normals)

low, high = positions.min(axis=0), positions.max(axis=0)
height = high[1] - low[1]
axis = (low + high) / 2

# ---------- TEXCOORD_1: wrapped around the body ----------
# u is the angle around the vertical axis (front centre 0.5, seam down the
# back); v is height, scaled so a square of pattern stays square at mid-skirt.
angle = np.arctan2(positions[:, 0] - axis[0], positions[:, 2] - axis[2])
u = angle / (2 * np.pi) + 0.5
mid = np.abs(positions[:, 1] - (low[1] + height * 0.35)) < height * 0.05
radius = np.median(np.hypot(positions[mid, 0] - axis[0], positions[mid, 2] - axis[2]))
v = (positions[:, 1] - low[1]) / (2 * np.pi * radius)
uv1 = np.stack([u, v], axis=1)

# Triangles that cross the back seam would smear the whole pattern across
# themselves; give their low-u corners a copy of the vertex with u + 1.
extra = {}
seam = np.ptp(uv1[indices, 0], axis=1) > 0.5
for triangle in np.nonzero(seam)[0]:
    for corner in range(3):
        vertex = indices[triangle, corner]
        if uv1[vertex, 0] < 0.5:
            if vertex not in extra:
                extra[vertex] = len(positions) + len(extra)
            indices[triangle, corner] = extra[vertex]
if extra:
    copies = np.fromiter(extra.keys(), dtype=np.int64)
    positions = np.concatenate([positions, positions[copies]])
    normals = np.concatenate([normals, normals[copies]])
    uv0 = np.concatenate([uv0, uv0[copies]])
    uv1 = np.concatenate([uv1, uv1[copies] + [1, 0]])
print(f'{len(positions)} vertices ({len(extra)} split at the back seam), {len(indices)} triangles')

# ---------- normal map, resized ----------
material = source['materials'][0]
image_index = source['textures'][material['normalTexture']['index']]['source']
image_view = source['bufferViews'][source['images'][image_index]['bufferView']]
image_start = image_view.get('byteOffset', 0)
normal_map = Image.open(io.BytesIO(binary_in[image_start:image_start + image_view['byteLength']])).convert('RGB')
normal_map = normal_map.resize((args.normal_size, args.normal_size), Image.LANCZOS)
encoded = io.BytesIO()
normal_map.save(encoded, 'PNG', optimize=True)
normal_bytes = encoded.getvalue()

# ---------- write ----------
gltf = {'asset': {'version': '2.0', 'generator': 'aas.glb dress, packed by convert_aas.py'},
        'scene': 0, 'scenes': [{'nodes': [0]}],
        'nodes': [{'name': 'fabric_dress', 'mesh': 0, 'extras': {'role': 'fabric'}}],
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

normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
gltf['images'].append({'bufferView': view(normal_bytes), 'mimeType': 'image/png', 'name': 'dress-normal'})
gltf['textures'].append({'sampler': 0, 'source': 0})
gltf['materials'].append({'name': 'fabric', 'doubleSided': True,
                          'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 0.8},
                          'normalTexture': {'index': 0, 'scale': 1}, 'extras': {'role': 'fabric'}})
gltf['meshes'].append({'name': 'fabric_dress', 'primitives': [{
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
(args.output_dir / 'model.glb').write_bytes(glb)

# ---------- Wear it measurements ----------
# In the viewer's units: centred, then scaled to 0.75 tall (or 0.66 wide).
scale = min(0.75 / height, 0.66 / (high[0] - low[0]))
top = high[1]
shoulder_band = positions[np.abs(positions[:, 1] - (top - height * 0.06)) < height * 0.015]
shoulder_width = np.ptp(shoulder_band[:, 0])
# The waist seam: the narrowest point of the body front-to-back (sleeves hang
# at the sides, so only the middle of the body is measured).
centre_strip = positions[np.abs(positions[:, 0] - axis[0]) < shoulder_width * 0.2]
levels = np.linspace(top - height * 0.2, top - height * 0.55, 40)
depths = [np.ptp(centre_strip[np.abs(centre_strip[:, 1] - level) < height * 0.01, 2]) for level in levels]
waist = levels[int(np.argmin(depths))]
hip = waist - 0.45 * (top - waist)
print(json.dumps({'bytes': len(glb), 'fit': {
    'shoulderWidth': round(shoulder_width * scale, 3),
    'torsoLength': round((top - hip) * scale, 3),
    'shoulderY': round((top - axis[1]) * scale, 3)}}))
