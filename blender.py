#!/usr/bin/env python
# blender --background ~/blender/Landspot.blend -P ~/projects/utm/frontend/external/og/blender.py -- ~/projects/test.json
import bpy
import bmesh
import os
import sys
import json
import math

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

vertices = []
normals = []
indices = []
texcoords = []
vertex_index_offset = 0

def triangulate_object(obj):
    bm = bmesh.new()
    me = obj.data
    bm.from_mesh(me)
    bpy.ops.object.mode_set(mode='OBJECT')
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()


for collection in bpy.data.collections:
    for obj in collection.all_objects:
        obj.rotation_euler[2] += math.radians(-90)
        if obj.type == "MESH":
            triangulate_object(obj)
            matrix = obj.matrix_world
            maxIndex = max(indices) + 1 if len(indices) > 0 else 0

            for face in obj.data.polygons:
                for vert_idx, loop_idx in zip(face.vertices, face.loop_indices):
                    indices.append(loop_idx + vertex_index_offset)
                    vertex = matrix @ obj.data.vertices[vert_idx].co
                    vertices.append(vertex.x)
                    vertices.append(vertex.z)
                    vertices.append(-vertex.y)
                    normals.append(face.normal.x)
                    normals.append(face.normal.z)
                    normals.append(-face.normal.y)
                    uv_layer = obj.data.uv_layers.active.data[loop_idx]
                    texcoords.append(uv_layer.uv.x)
                    texcoords.append(1 - uv_layer.uv.y)

            vertex_index_offset += maxIndex


data = {
    "indices": indices,
    "vertices": vertices,
    "normals": normals,
    "texCoords" : texcoords
}

with open(filename, "w") as outfile:
    json.dump(data, outfile)