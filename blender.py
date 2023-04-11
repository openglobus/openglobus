import bpy
import bmesh
import os
import sys
import json
import math
import mathutils

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

            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bm.normal_update()

            for face in bm.faces:
                for vert, loop in zip(face.verts, face.loops):
                    indices.append(loop.index + vertex_index_offset)
                    vertex = matrix @ vert.co
                    vertices.append(vertex.x)
                    vertices.append(vertex.z)
                    vertices.append(-vertex.y)
                    # average the normals of each adjacent face to get vertex normal
                    normal = mathutils.Vector()
                    for other_face in vert.link_faces:
                        if other_face.normal.dot(face.normal) > 0:
                            normal += other_face.normal
                    if normal.length_squared > 0:
                        normal.normalize()
                    normals.append(normal.x)
                    normals.append(normal.z)
                    normals.append(-normal.y)
                    uv_layer = obj.data.uv_layers.active.data[loop.index]
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
