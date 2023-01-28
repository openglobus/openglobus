#!/usr/bin/env python
# blender --background ~/blender/Landspot.blend -P ~/projects/utm/frontend/external/og/blender.py -- ~/projects/test.json
import bpy
import bmesh
import os
import sys

filepath = bpy.data.filepath
[path, name] = os.path.split(filepath)
[filename, ext] = name.split('.')
filename += '.json'

try:
    args = list(reversed(sys.argv))
    idx = args.index("--")
    params = args[:idx][::-1]

except ValueError:
    params = []

if len(params) > 0:
    filename = params[0]

verts = []
normals = []
indices = []
uvs = []
uvs_uniq = []
uvs_idx = []
uvs_map = {}


def triangulate_object(obj):
    bm = bmesh.new()
    me = obj.data
    bm.from_mesh(me)
    bpy.ops.object.mode_set(mode='OBJECT')
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()


def flatten(l):
    return [item for sublist in l for item in sublist]


def write_to_json(name, i, v, n, t, ti):
    with open(name, "w") as outfile:
        outfile.write("{\n\t\"indices\": [\n\t\t")
        outfile.write(",".join(str(item) for item in i))
        outfile.write("\n\t],\n\t\"vertices\": [\n\t\t")
        outfile.write(",".join(str(item) for item in v))
        outfile.write("\n\t],\n\t\"normals\": [\n\t\t")
        outfile.write(",".join(str(item) for item in n))
        outfile.write("\n\t],\n\t\"texCoords\": [\n\t\t")
        outfile.write(",".join(str(item) for item in t))
        outfile.write("\n\t]\n}")


for collection in bpy.data.collections:
    for obj in collection.all_objects:
        if obj.type == "MESH":
            triangulate_object(obj)
            matrix = obj.matrix_world
            maxIndex = max(indices) + 1 if len(indices) > 0 else 0

            for vert in obj.data.vertices:
                gCoords = matrix @ vert.co
                verts += list(gCoords.xyz)
                normals += list(vert.normal)

            for face in obj.data.polygons:
                indices += map(lambda x: x + maxIndex, list(face.vertices),)


                for vert_idx, loop_idx in zip(face.vertices, face.loop_indices):
                    uvs_map[vert_idx + maxIndex] = list(obj.data.uv_layers.active.data[loop_idx].uv)
                    print(obj.data.uv_layers)

        temp_uvs = list(uvs_map.keys())
        for key, attr in uvs_map.items():
            temp_uvs[key] = [uvs_map[key][0],1.0 - uvs_map[key][1]]



write_to_json(filename, indices, verts, normals, sum(temp_uvs,[]), uvs_idx)
