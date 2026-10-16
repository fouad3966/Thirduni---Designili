"""Packs sheos.glb (an AI-generated low-top sneaker) as the site's shoe model.

The source is 87 MB / 1.5 million triangles with 4096 px PBR textures. Two
steps make it usable:

1. Slim the mesh to about 90,000 triangles (glTF-Transform, meshoptimizer):

    npx @gltf-transform/cli weld sheos.glb weld.glb
    npx @gltf-transform/cli simplify weld.glb simple.glb --ratio 0.06 --error 0.0015

2. Pack it for the site (this script, needs numpy and Pillow):

    python3 public/garments/shoes/convert_shoes.py --source simple.glb

Unlike the dress, the shoe keeps its own printed look: it is black, white and
grey, so the viewer tints it with the chosen colour (white panels and the sole
take the colour, black lines stay black) instead of painting one flat colour
over sole, laces and upper. This step:
  * bakes the upright rotation into the vertices (Y up, toe towards +X, the
    outer side of the shoe facing +Z);
  * names the mesh `fabric_shoes` with role "fabric" so the viewer colours it;
  * keeps the colour texture (2048 px JPEG) and the normal map (2048 px JPEG),
    and drops the roughness/metal map and the glossy specular extension;
  * adds TEXCOORD_1, a projection from the side, for AI designs: a print reads
    correctly on the shoe's profile, which is how shoes are shown.
"""
from pathlib import Path
import argparse, io, json, struct
import numpy as np
from PIL import Image

parser = argparse.ArgumentParser(description='Pack the slimmed sheos.glb sneaker for the site.')
parser.add_argument('--source', required=True, type=Path, help='Slimmed glb from step 1')
parser.add_argument('--output-dir', default=Path(__file__).resolve().parent, type=Path)
parser.add_argument('--texture-size', default=2048, type=int)
args = parser.parse_args()

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

def image(texture_index, mode):
    meta = source['images'][source['textures'][texture_index]['source']]
    view = source['bufferViews'][meta['bufferView']]
    start = view.get('byteOffset', 0)
    picture = Image.open(io.BytesIO(binary_in[start:start + view['byteLength']])).convert(mode)
    picture = picture.resize((args.texture_size, args.texture_size), Image.LANCZOS)
    encoded = io.BytesIO()
    picture.save(encoded, 'JPEG', quality=90, optimize=True)
    return encoded.getvalue()

primitive = source['meshes'][0]['primitives'][0]
positions = read(primitive['attributes']['POSITION']).astype(np.float64)
normals = read(primitive['attributes']['NORMAL']).astype(np.float64)
uv0 = read(primitive['attributes']['TEXCOORD_0']).astype(np.float64)
indices = read(primitive['indices']).astype(np.int64).ravel()

# The source node turns the shoe upright (+90 degrees about X): bake it in.
upright = lambda v: np.stack([v[:, 0], -v[:, 2], v[:, 1]], axis=1)
positions, normals = upright(positions), upright(normals)
normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)

# TEXCOORD_1: projected from the side, the same scale both ways so a print is
# not stretched; both sides of the shoe show it, mirrored.
low, high = positions.min(axis=0), positions.max(axis=0)
length = high[0] - low[0]
uv1 = np.stack([(positions[:, 0] - low[0]) / length, (positions[:, 1] - low[1]) / length], axis=1)

material = source['materials'][0]
colour_bytes = image(material['pbrMetallicRoughness']['baseColorTexture']['index'], 'RGB')
normal_bytes = image(material['normalTexture']['index'], 'RGB')

gltf = {'asset': {'version': '2.0', 'generator': 'sheos.glb sneaker, packed by convert_shoes.py'},
        'scene': 0, 'scenes': [{'nodes': [0]}],
        'nodes': [{'name': 'fabric_shoes', 'mesh': 0, 'extras': {'role': 'fabric'}}],
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

for name, payload in (('shoe-colour', colour_bytes), ('shoe-normal', normal_bytes)):
    gltf['images'].append({'bufferView': view(payload), 'mimeType': 'image/jpeg', 'name': name})
    gltf['textures'].append({'sampler': 0, 'source': len(gltf['images']) - 1})
gltf['materials'].append({'name': 'fabric', 'doubleSided': True,
                          'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'baseColorFactor': [1, 1, 1, 1],
                                                   'metallicFactor': 0, 'roughnessFactor': 0.7},
                          'normalTexture': {'index': 1, 'scale': 1}, 'extras': {'role': 'fabric'}})
gltf['meshes'].append({'name': 'fabric_shoes', 'primitives': [{
    'attributes': {'POSITION': accessor(positions, 'VEC3', bounds=True), 'NORMAL': accessor(normals, 'VEC3'),
                   'TEXCOORD_0': accessor(uv0, 'VEC2'), 'TEXCOORD_1': accessor(uv1, 'VEC2')},
    'indices': accessor(indices, 'SCALAR', 5125), 'material': 0}]})

gltf['buffers'][0]['byteLength'] = len(binary)
while len(binary) % 4:
    binary.append(0)
metadata = json.dumps(gltf, separators=(',', ':')).encode()
metadata += b' ' * ((-len(metadata)) % 4)
total = 12 + 8 + len(metadata) + 8 + len(binary)
glb = (struct.pack('<III', 0x46546C67, 2, total) + struct.pack('<II', len(metadata), 0x4E4F534A) + metadata
       + struct.pack('<II', len(binary), 0x004E4942) + binary)
args.output_dir.mkdir(parents=True, exist_ok=True)
(args.output_dir / 'model.glb').write_bytes(glb)
print(json.dumps({'vertices': len(positions), 'triangles': len(indices) // 3, 'bytes': len(glb),
                  'size': np.round(high - low, 3).tolist()}))
