import {DecoderModule} from "draco3d";
import {Entity} from "../../entity";
import {Quat} from "../../math/Quat";
import {Vec3} from "../../math/Vec3";
import {Mat4, NumberArray16} from "../../math/Mat4";
import {Object3d} from "../../Object3d";
import {Glb} from "./glbParser";
import {
    Accessor,
    AccessorComponentType,
    AccessorDataType,
    GltfData,
    TextureImage,
    Material,
    Mesh,
    Primitive,
    PrimitiveMode,
    MimeType,
    GltfNode,
    GltfMesh,
    GltfPrimitive
} from "./types";

export class Gltf {
    private static _dracoDecoderModule: DecoderModule | null = null;

    public static connectDracoDecoderModule(decoder: any): void {
        Gltf._dracoDecoderModule = decoder;
    }

    public static async loadGlb(url: string) {
        const data = await Glb.load(url);
        return new Gltf(data);
    }

    private _materials: Material[] = [];
    private _images: TextureImage[] = [];
    public meshes: Mesh[] = [];

    constructor(private gltf: GltfData) {
        if (
            gltf.gltf.extensionsRequired?.includes("KHR_draco_mesh_compression") &&
            Gltf._dracoDecoderModule === null
        ) {
            throw new Error("Unable to import GLTF. Draco decoder module is not connected");
        }
        this._initImages();
        this._initMaterials();
        this._initMeshes();
    }

    public getObjects3d(): Object3d[] {
        const result: Object3d[] = [];
        for (let m = 0; m < this.meshes.length; m++) {
            for (let p = 0; p < this.meshes[m].primitives.length; p++) {
                if (this.meshes[m].primitives[p].object3d !== undefined) {
                    result.push(this.meshes[m].primitives[p].object3d!);
                }
            }
        }
        return result;
    }

    public toEntities(): Entity[] {
        const result: Entity[] = [];
        for (const scene of this.gltf.gltf.scenes) {
            if (scene === undefined || scene.nodes === undefined) {
                return [];
            }
            for (const node of scene.nodes) {
                const nodeData = this.gltf.gltf.nodes[node];
                if (nodeData.mesh === undefined && nodeData.children === undefined) {
                    continue;
                }
                result.push(this._nodeToEntity(nodeData));
            }
        }

        return result;
    }

    private _nodeToEntity(node: GltfNode, parent?: Entity): Entity {
        const entity = new Entity({
            name: node.name,
            cartesian: new Vec3(0, 0, 0),
            relativePosition: parent !== undefined,
        });
        let meshEntity: Entity | null = null;
        if (node.mesh !== undefined) {
            meshEntity = this.meshToEntity(this.meshes[node.mesh], parent);
            entity.appendChild(meshEntity);
        }
        if (node.matrix !== undefined) {
            const mat = new Mat4();
            mat.set(node.matrix as NumberArray16);
            entity.setCartesian3v(mat.getPosition());
            entity.setDirectQuaternionRotation(mat.getQuat());
            entity.setScale3v(mat.getScaling());
        }
        if (node.translation !== undefined && node.matrix === undefined) {
            entity.relativePosition = true;
            entity.setCartesian(node.translation[0], node.translation[1], node.translation[2]);
        }
        if (node.rotation !== undefined && node.matrix === undefined) {
            entity.setDirectQuaternionRotation(new Quat(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]));
        }
        if (node.scale !== undefined && node.matrix === undefined) {
            entity.setScale3v(new Vec3(node.scale[0], node.scale[1], node.scale[2]));
        }

        if (node.children !== undefined) {
            for (const child of node.children) {
                const childEntity = this._nodeToEntity(this.gltf.gltf.nodes[child], entity);
                if (meshEntity) {
                    meshEntity.appendChild(childEntity);
                } else {
                    entity.appendChild(childEntity);
                }
            }
        }
        return entity;
    }

    public meshToEntity(mesh: Mesh, parent?: Entity): Entity {
        const entity = new Entity({
            name: mesh.name,
            cartesian: new Vec3(0, 0, 0),
            relativePosition: true,
            independentPicking: true
        });
        mesh.primitives.map((primitive) => {
            entity.appendChild(
                new Entity({
                    name: primitive.name,
                    relativePosition: true,
                    geoObject: {
                        object3d: primitive.object3d,
                        tag: primitive.name
                    }
                })
            );
        });
        return entity;
    }

    private _initImages() {
        if (!this.gltf.gltf.images) {
            return;
        }
        for (const image of this.gltf.gltf.images) {
            this._images.push({
                src: image.uri,
                element: this._getImage(image.mimeType, image.bufferView),
                mimeType: image.mimeType,
                name: image.name
            });
        }
    }

    private _getImage(mimeType?: MimeType, bufferView?: number): HTMLImageElement | undefined {
        if (bufferView && mimeType) {
            const view = this.gltf.gltf.bufferViews[bufferView];
            const url = URL.createObjectURL(
                new Blob(
                    [
                        this.gltf.bin[view.buffer].slice(
                            view.byteOffset,
                            view.byteOffset + view.byteLength
                        )
                    ],
                    {
                        type: mimeType
                    }
                )
            );
            const img = new Image();
            img.src = url;
            return img;
        }
    }

    private _initMaterials() {
        if (!this.gltf.gltf.materials) {
            return;
        }
        for (const material of this.gltf.gltf.materials) {
            const mat: Material = {
                name: material.name,
                emissiveFactor: material.emissiveFactor,
                alphaMode: material.alphaMode,
                alphaCutoff: material.alphaCutoff,
                doubleSided: material.doubleSided
            };
            if (material.pbrMetallicRoughness) {
                if (material.pbrMetallicRoughness.baseColorFactor) {
                    mat.baseColorFactor = material.pbrMetallicRoughness.baseColorFactor;
                }
                if (material.pbrMetallicRoughness.baseColorTexture) {
                    const source =
                        this.gltf.gltf.textures[
                            material.pbrMetallicRoughness.baseColorTexture.index
                            ].source;
                    if (source !== undefined) {
                        mat.baseColorTexture = {
                            image: this._images[source],
                            texCoord: material.pbrMetallicRoughness.baseColorTexture.texCoord
                        };
                    }
                }
                if (material.pbrMetallicRoughness.metallicRoughnessTexture) {
                    const source =
                        this.gltf.gltf.textures[
                            material.pbrMetallicRoughness.metallicRoughnessTexture.index
                            ].source;
                    if (source !== undefined) {
                        mat.metallicRoughnessTexture = {
                            image: this._images[source],
                            texCoord:
                            material.pbrMetallicRoughness.metallicRoughnessTexture.texCoord
                        };
                    }
                }
            }
            if (material.normalTexture) {
                const source = this.gltf.gltf.textures[material.normalTexture.index].source;
                if (source !== undefined) {
                    mat.normalTexture = {
                        image: this._images[source],
                        texCoord: material.normalTexture.texCoord,
                        scale: material.normalTexture.scale
                    };
                }
            }
            if (material.occlusionTexture) {
                const source = this.gltf.gltf.textures[material.occlusionTexture.index].source;
                if (source !== undefined) {
                    mat.occlusionTexture = {
                        image: this._images[source],
                        texCoord: material.occlusionTexture.texCoord,
                        strength: material.occlusionTexture.strength
                    };
                }
            }
            if (material.emissiveTexture) {
                const source = this.gltf.gltf.textures[material.emissiveTexture.index].source;
                if (source !== undefined) {
                    mat.emissiveTexture = {
                        image: this._images[source],
                        texCoord: material.emissiveTexture.texCoord
                    };
                }
            }
            this._materials.push(mat);
        }
    }

    private _initMeshes() {
        this.meshes = [];
        for (let m = 0; m < this.gltf.gltf.meshes.length; m++) {
            const meshData = this.gltf.gltf.meshes[m];
            const mesh: Mesh = {
                name: meshData.name,
                primitives: []
            };
            for (let i = 0; i < meshData.primitives.length; i++) {
                mesh.primitives.push(
                    this._buildPrimitive(meshData, meshData.primitives[i], `${m}-${i}`)
                );
            }
            this.meshes.push(mesh);
        }
    }

    private _buildPrimitive(
        meshData: GltfMesh,
        primitiveData: GltfPrimitive,
        index: string
    ): Primitive {
        let primitive: Primitive | null = null;
        const material = this._materials[primitiveData.material || 0];
        const texcoord = material.baseColorTexture?.texCoord
            ? `TEXCOORD_${material.baseColorTexture.texCoord}`
            : `TEXCOORD_0`;
        if (primitiveData.extensions?.KHR_draco_mesh_compression) {
            const dracoExt = primitiveData.extensions.KHR_draco_mesh_compression;
            const bufferView = this.gltf.gltf.bufferViews[dracoExt.bufferView];
            const bvOffset = bufferView.byteOffset || 0;
            const draco: DecoderModule = Gltf._dracoDecoderModule as DecoderModule;
            const decoder = new draco.Decoder();
            const decoderBuffer = new draco.DecoderBuffer();
            decoderBuffer.Init(
                new Int8Array(
                    this.gltf.bin[bufferView.buffer].slice(
                        bvOffset,
                        bvOffset + bufferView.byteLength
                    )
                ),
                bufferView.byteLength
            );

            const geometryType = decoder.GetEncodedGeometryType(decoderBuffer);
            if (geometryType !== draco.TRIANGULAR_MESH) {
                throw new Error("Draco compressed data is not a mesh");
            }

            const mesh = new draco.Mesh();
            const status = decoder.DecodeBufferToMesh(decoderBuffer, mesh);
            if (!status.ok() || mesh.ptr === 0) {
                throw new Error("Failed to decode Draco mesh");
            }

            const numFaces = mesh.num_faces();
            const numIndices = numFaces * 3;
            const indices = new Uint32Array(numIndices);
            const ia = new draco.DracoInt32Array();
            for (let i = 0; i < numFaces; i++) {
                decoder.GetFaceFromMesh(mesh, i, ia);
                indices[i * 3] = ia.GetValue(0);
                indices[i * 3 + 1] = ia.GetValue(1);
                indices[i * 3 + 2] = ia.GetValue(2);
            }
            draco.destroy(ia);

            const attributes: { [name: string]: Float32Array } = {};
            for (const gltfAttrName in dracoExt.attributes) {
                const attrId = dracoExt.attributes[gltfAttrName];
                const dracoAttr = decoder.GetAttributeByUniqueId(mesh, attrId);
                const numPoints = mesh.num_points();
                const numComponents = dracoAttr.num_components(); // 3 for POSITION, 2 for UVs, etc.

                const attrArray = new draco.DracoFloat32Array();
                decoder.GetAttributeFloatForAllPoints(mesh, dracoAttr, attrArray);

                const typedArray = new Float32Array(numPoints * numComponents);
                for (let i = 0; i < typedArray.length; i++) {
                    typedArray[i] = attrArray.GetValue(i);
                }
                draco.destroy(attrArray);

                attributes[gltfAttrName] = typedArray;
            }

            // Cleanup
            draco.destroy(mesh);
            draco.destroy(decoderBuffer);
            draco.destroy(decoder);

            primitive = {
                name: `${meshData.name}/${material.name}/${index}`,
                vertices: attributes.POSITION,
                indices: indices,
                mode: primitiveData.mode ? primitiveData.mode : PrimitiveMode.triangles,
                material: this._materials[primitiveData.material || 0] || undefined,
                normals: attributes.NORMAL,
                texCoords: undefined
            };
        } else {
            const texcoordAccessorKey = texcoord ? primitiveData.attributes[texcoord] : undefined;
            const texcoordAccessor = texcoordAccessorKey
                ? this.gltf.gltf.accessors[texcoordAccessorKey]
                : undefined;
            primitive = {
                name: `${meshData.name}/${material.name}/${index}`,
                indices: primitiveData.indices
                    ? Gltf._access(this.gltf.gltf.accessors[primitiveData.indices], this.gltf)
                    : undefined,
                mode: primitiveData.mode ? primitiveData.mode : PrimitiveMode.triangles,
                material: this._materials[primitiveData.material || 0] || undefined,
                vertices: Gltf._access(
                    this.gltf.gltf.accessors[primitiveData.attributes.POSITION],
                    this.gltf
                ),
                normals: Gltf._access(
                    this.gltf.gltf.accessors[primitiveData.attributes.NORMAL],
                    this.gltf
                ),
                texCoords: texcoordAccessor ? Gltf._access(texcoordAccessor, this.gltf) : undefined
            };
        }
        if (primitive === null) {
            throw new Error("Unable to build primitive");
        }
        primitive.object3d = Gltf._toObject3d(primitive);
        return primitive;
    }

    private static _toObject3d(primitive: Primitive): Object3d {
        return new Object3d({
            name: primitive.name,
            vertices: Array.from(primitive.vertices as Float32Array),
            normals: Array.from(primitive.normals as Float32Array),
            texCoords: primitive.texCoords
                ? Array.from(primitive.texCoords as Float32Array)
                : undefined,
            indices: Array.from(primitive.indices as Uint8Array),
            normalTextureImage: primitive.material?.normalTexture?.image.element,
            normalTextureSrc: primitive.material?.normalTexture?.image.src,
            colorTextureImage: primitive.material?.baseColorTexture?.image.element,
            colorTextureSrc: primitive.material?.baseColorTexture?.image.src,
            metallicRoughnessTextureImage: primitive.material?.occlusionTexture?.image.element,
            metallicRoughnessTextureSrc: primitive.material?.occlusionTexture?.image.src,
            color: primitive.material?.baseColorFactor
        });
    }

    private static _access(accessor: Accessor, gltf: GltfData): ArrayBufferLike {
        const bufferView = gltf.gltf.bufferViews[accessor.bufferView];
        const arrbuff = gltf.bin[bufferView.buffer];
        let offset = bufferView.byteOffset || 0;
        if (accessor.byteOffset !== undefined) {
            offset += accessor.byteOffset;
        }
        const dv = arrbuff.slice(offset, offset + bufferView.byteLength);
        switch (accessor.type) {
            case AccessorDataType.scalar:
                return this._getTensor(dv, accessor, 1, bufferView.byteStride);
            case AccessorDataType.vec2:
                return this._getTensor(dv, accessor, 2, bufferView.byteStride);
            case AccessorDataType.vec3:
                return this._getTensor(dv, accessor, 3, bufferView.byteStride);
            case AccessorDataType.vec4:
            case AccessorDataType.mat2:
                return this._getTensor(dv, accessor, 4, bufferView.byteStride);
            case AccessorDataType.mat3:
                return this._getTensor(dv, accessor, 9, bufferView.byteStride);
            case AccessorDataType.mat4:
                return this._getTensor(dv, accessor, 16, bufferView.byteStride);
            default:
                throw new Error("Unknown accessor type");
        }
    }

    private static _getTensor(
        buffer: ArrayBuffer,
        accessor: Accessor,
        numOfComponents: number,
        byteStride?: number // TODO: implement byteStride handling if data not tightly packed
    ): ArrayBufferLike {
        if (accessor.componentType === AccessorComponentType.ushort) {
            return new Uint16Array(buffer, 0, accessor.count * numOfComponents);
        }
        if (accessor.componentType === AccessorComponentType.short) {
            return new Int16Array(buffer, 0, accessor.count * numOfComponents);
        }
        if (accessor.componentType === AccessorComponentType.uint) {
            return new Uint32Array(buffer, 0, accessor.count * numOfComponents);
        }
        if (accessor.componentType === AccessorComponentType.float) {
            return new Float32Array(buffer, 0, accessor.count * numOfComponents);
        }
        if (accessor.componentType === AccessorComponentType.ubyte) {
            return new Uint8Array(buffer, 0, accessor.count * numOfComponents);
        }
        if (accessor.componentType === AccessorComponentType.byte) {
            return new Int8Array(buffer, 0, accessor.count * numOfComponents);
        }
        throw new Error("Unknown component type");
    }
}
