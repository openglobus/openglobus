import { Entity } from "../../entity";
import { Quat } from "../../math/Quat";
import { Vec3 } from "../../math/Vec3";
import { Object3d } from "../../Object3d";
import { Glb } from "./glbParser";
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
    Texture,
    MimeType,
    GltfNode,
    GltfMesh,
    GltfPrimitive
} from "./types";

export class Gltf {
    private static dracoDecoderModule: any = null;
    public static connectDracoDecoderModule(decoder: any): void {
        this.dracoDecoderModule = decoder;
    }
    public static async loadGlb(url: string) {
        const data = await Glb.load(url);
        if (this.dracoDecoderModule !== null) {
            await this.dracoDecoderModule.ready;
        }
        return new Gltf(data);
    }

    private materials: Material[] = [];
    private images: TextureImage[] = [];
    public meshes: Mesh[] = [];

    constructor(private gltf: GltfData) {
        if (
            gltf.gltf.extensionsRequired?.includes("KHR_draco_mesh_compression") &&
            Gltf.dracoDecoderModule === null
        ) {
            throw new Error("Unable to import GLTF. Draco decoder module is not connected");
        }
        this.initImages();
        this.initMaterials();
        this.initMeshes();
    }

    public getObjects3d(): Object3d[] {
        return this.meshes
            .map((mesh) => mesh.primitives.map((primitive) => Gltf.toObject3d(primitive)))
            .flat();
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
                result.push(this.nodeToEntity(nodeData));
            }
        }

        return result;
    }

    private nodeToEntity(node: GltfNode, parent?: Entity): Entity {
        const entity = new Entity({
            name: `node_${node.name}`,
            cartesian: new Vec3(0, 0, 0),
            relativePosition: true
        });
        let meshEntity: Entity | null = null;
        if (node.mesh !== undefined) {
            meshEntity = this.meshToEntity(this.meshes[node.mesh], parent);
            entity.appendChild(meshEntity);
        }
        if (node.matrix !== undefined) {
            entity.setCartesian3v(new Vec3(node.matrix[12], node.matrix[13], node.matrix[14]));
            entity.setRotation(this.getRotation(node.matrix));
            entity.setScale3v(this.getScaling(node.matrix));
        }
        if (node.translation !== undefined && node.matrix === undefined) {
            entity.relativePosition = true;
            entity.setCartesian(node.translation[0], node.translation[1], node.translation[2]);
        }
        if (node.rotation !== undefined && node.matrix === undefined) {
            // TODO: implement rotation by quaternion
        }
        if (node.scale !== undefined && node.matrix === undefined) {
            entity.setScale3v(new Vec3(node.scale[0], node.scale[1], node.scale[2]));
        }

        if (node.children !== undefined) {
            for (const child of node.children) {
                const childEntity = this.nodeToEntity(this.gltf.gltf.nodes[child], entity);
                if (meshEntity) {
                    meshEntity.appendChild(childEntity);
                } else {
                    entity.appendChild(childEntity);
                }
            }
        }
        return entity;
    }

    private getScaling(mat: number[]): Vec3 {
        let m11 = mat[0];
        let m12 = mat[1];
        let m13 = mat[2];
        let m21 = mat[4];
        let m22 = mat[5];
        let m23 = mat[6];
        let m31 = mat[8];
        let m32 = mat[9];
        let m33 = mat[10];

        return new Vec3(
            Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13),
            Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23),
            Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33)
        );
    }

    private getRotation(mat: number[]): Quat {
        let scaling = this.getScaling(mat);
        const out = [0, 0, 0, 1];

        let is1 = 1 / scaling.x;
        let is2 = 1 / scaling.y;
        let is3 = 1 / scaling.z;

        let sm11 = mat[0] * is1;
        let sm12 = mat[1] * is2;
        let sm13 = mat[2] * is3;
        let sm21 = mat[4] * is1;
        let sm22 = mat[5] * is2;
        let sm23 = mat[6] * is3;
        let sm31 = mat[8] * is1;
        let sm32 = mat[9] * is2;
        let sm33 = mat[10] * is3;

        let trace = sm11 + sm22 + sm33;
        let S = 0;

        if (trace > 0) {
            S = Math.sqrt(trace + 1.0) * 2;
            out[3] = 0.25 * S;
            out[0] = (sm23 - sm32) / S;
            out[1] = (sm31 - sm13) / S;
            out[2] = (sm12 - sm21) / S;
        } else if (sm11 > sm22 && sm11 > sm33) {
            S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
            out[3] = (sm23 - sm32) / S;
            out[0] = 0.25 * S;
            out[1] = (sm12 + sm21) / S;
            out[2] = (sm31 + sm13) / S;
        } else if (sm22 > sm33) {
            S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
            out[3] = (sm31 - sm13) / S;
            out[0] = (sm12 + sm21) / S;
            out[1] = 0.25 * S;
            out[2] = (sm23 + sm32) / S;
        } else {
            S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
            out[3] = (sm12 - sm21) / S;
            out[0] = (sm31 + sm13) / S;
            out[1] = (sm23 + sm32) / S;
            out[2] = 0.25 * S;
        }
        return new Quat(out[0], out[1], out[2], out[3]);
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

    private initImages() {
        if (!this.gltf.gltf.images) {
            return;
        }
        for (const image of this.gltf.gltf.images) {
            this.images.push({
                src: image.uri,
                element: this.getImage(image.mimeType, image.bufferView),
                mimeType: image.mimeType,
                name: image.name
            });
        }
    }

    private getImage(mimeType?: MimeType, bufferView?: number): HTMLImageElement | undefined {
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

    private initMaterials() {
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
                            image: this.images[source],
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
                            image: this.images[source],
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
                        image: this.images[source],
                        texCoord: material.normalTexture.texCoord,
                        scale: material.normalTexture.scale
                    };
                }
            }
            if (material.occlusionTexture) {
                const source = this.gltf.gltf.textures[material.occlusionTexture.index].source;
                if (source !== undefined) {
                    mat.occlusionTexture = {
                        image: this.images[source],
                        texCoord: material.occlusionTexture.texCoord,
                        strength: material.occlusionTexture.strength
                    };
                }
            }
            if (material.emissiveTexture) {
                const source = this.gltf.gltf.textures[material.emissiveTexture.index].source;
                if (source !== undefined) {
                    mat.emissiveTexture = {
                        image: this.images[source],
                        texCoord: material.emissiveTexture.texCoord
                    };
                }
            }
            this.materials.push(mat);
        }
    }

    private initMeshes() {
        this.meshes = [];
        for (let m = 0; m < this.gltf.gltf.meshes.length; m++) {
            const meshData = this.gltf.gltf.meshes[m];
            const mesh: Mesh = {
                name: meshData.name,
                primitives: []
            };
            for (let i = 0; i < meshData.primitives.length; i++) {
                mesh.primitives.push(
                    this.buildPrimitive(meshData, meshData.primitives[i], `${m}-${i}`)
                );
            }
            this.meshes.push(mesh);
        }
    }

    private buildPrimitive(
        meshData: GltfMesh,
        primitiveData: GltfPrimitive,
        index: string
    ): Primitive {
        let primitive: Primitive | null = null;
        const material = this.materials[primitiveData.material || 0];
        const texcoord = material.baseColorTexture?.texCoord
            ? `TEXCOORD_${material.baseColorTexture.texCoord}`
            : `TEXCOORD_0`;
        if (primitiveData.extensions?.KHR_draco_mesh_compression) {
            const dracoExt = primitiveData.extensions.KHR_draco_mesh_compression;
            const bufferView = this.gltf.gltf.bufferViews[dracoExt.bufferView];
            const bvOffset = bufferView.byteOffset || 0;
            const draco = Gltf.dracoDecoderModule;
            const decoder = new draco.Decoder();
            const decoderBuffer = new draco.DecoderBuffer();
            decoderBuffer.Init(
                new Uint8Array(
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
                name: `${meshData.name}_${material.name}_${index}`,
                vertices: attributes.POSITION,
                indices: indices,
                mode: primitiveData.mode ? primitiveData.mode : PrimitiveMode.triangles,
                material: this.materials[primitiveData.material || 0] || undefined,
                normals: attributes.NORMAL,
                texCoords: undefined
            };
        } else {
            const texcoordAccessorKey = texcoord ? primitiveData.attributes[texcoord] : undefined;
            const texcoordAccessor = texcoordAccessorKey
                ? this.gltf.gltf.accessors[texcoordAccessorKey]
                : undefined;
            primitive = {
                name: `${meshData.name}_${material.name}_${index}`,
                indices: primitiveData.indices
                    ? Gltf.access(this.gltf.gltf.accessors[primitiveData.indices], this.gltf)
                    : undefined,
                mode: primitiveData.mode ? primitiveData.mode : PrimitiveMode.triangles,
                material: this.materials[primitiveData.material || 0] || undefined,
                vertices: Gltf.access(
                    this.gltf.gltf.accessors[primitiveData.attributes.POSITION],
                    this.gltf
                ),
                normals: Gltf.access(
                    this.gltf.gltf.accessors[primitiveData.attributes.NORMAL],
                    this.gltf
                ),
                texCoords: texcoordAccessor ? Gltf.access(texcoordAccessor, this.gltf) : undefined
            };
        }
        if (primitive === null) {
            throw new Error("Unable to build primitive");
        }
        primitive.object3d = Gltf.toObject3d(primitive);
        return primitive;
    }

    private static toObject3d(primitive: Primitive): Object3d {
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

    private static access(accessor: Accessor, gltf: GltfData): ArrayBufferLike {
        const bufferView = gltf.gltf.bufferViews[accessor.bufferView];
        const arrbuff = gltf.bin[bufferView.buffer];
        let offset = bufferView.byteOffset || 0;
        if (accessor.byteOffset !== undefined) {
            offset += accessor.byteOffset;
        }
        const dv = arrbuff.slice(offset, offset + bufferView.byteLength);
        switch (accessor.type) {
            case AccessorDataType.scalar:
                return this.getTensor(dv, accessor, 1, bufferView.byteStride);
            case AccessorDataType.vec2:
                return this.getTensor(dv, accessor, 2, bufferView.byteStride);
            case AccessorDataType.vec3:
                return this.getTensor(dv, accessor, 3, bufferView.byteStride);
            case AccessorDataType.vec4:
            case AccessorDataType.mat2:
                return this.getTensor(dv, accessor, 4, bufferView.byteStride);
            case AccessorDataType.mat3:
                return this.getTensor(dv, accessor, 9, bufferView.byteStride);
            case AccessorDataType.mat4:
                return this.getTensor(dv, accessor, 16, bufferView.byteStride);
            default:
                throw new Error("Unknown accessor type");
        }
    }

    private static getTensor(
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
