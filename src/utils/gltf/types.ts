import { Object3d } from "../../Object3d";

export interface GltfData {
    bin: ArrayBuffer[];
    gltf: GltfMetadata;
}

export interface GltfMetadata {
    accessors: Accessor[];
    bufferViews: BufferView[];
    meshes: GltfMesh[];
    materials: {
        name: string;
        pbrMetallicRoughness?: {
            baseColorFactor?: number[];
            metallicFactor?: number;
            roughnessFactor?: number;
            baseColorTexture?: {
                index: number;
                texCoord?: number;
            };
            metallicRoughnessTexture?: {
                index: number;
                texCoord?: number;
            };
        };
        normalTexture?: {
            index: number;
            texCoord?: number;
            scale?: number;
        };
        occlusionTexture?: {
            index: number;
            texCoord?: number;
            strength?: number;
        };
        emissiveTexture?: {
            index: number;
            texCoord?: number;
        };
        emissiveFactor?: number[];
        alphaMode?: AlphaMode;
        alphaCutoff?: number;
        doubleSided?: boolean;
    }[];
    textures: {
        sampler?: number;
        source?: number;
        name?: string;
    }[];
    images?: {
        uri?: string;
        mimeType?: MimeType;
        bufferView?: number;
        name?: string;
    }[];
    scene: number;
    scenes: {
        nodes?: number[];
        name?: string;
    }[];
    nodes: GltfNode[];
    extensionsRequired?: string[];
    extensionsUsed?: string[];
}

export interface GltfMesh {
    name: string;
    primitives: GltfPrimitive[];
}

export interface GltfPrimitive {
    indices?: number;
    material?: number;
    mode?: PrimitiveMode;
    attributes: PrimitiveAttributes;
    extensions?: {
        [key: string]: any;
        KHR_draco_mesh_compression?: {
            bufferView: number;
            attributes: PrimitiveAttributes;
        };
    };
}

export type PrimitiveAttributes = {
    POSITION: number;
    NORMAL: number;
} & Record<string, number>;

export interface GltfNode {
    camera?: number;
    children?: number[];
    skin?: number;
    matrix?: number[];
    mesh?: number;
    rotation?: number[];
    scale?: number[];
    translation?: number[];
    weights?: number[];
    name?: string;
}

export enum MimeType {
    JPEG = "image/jpeg",
    PNG = "image/png"
}

export interface Accessor {
    bufferView: number;
    byteOffset?: number;
    componentType: AccessorComponentType;
    count: number;
    type: AccessorDataType;
    max: number[];
    min: number[];
}

export interface BufferView {
    buffer: number;
    byteLength: number;
    byteOffset: number;
    target?: BufferViewTarget;
    byteStride?: number;
}

export enum BufferViewTarget {
    ARRAY_BUFFER = 34962,
    ELEMENT_ARRAY_BUFFER = 34963
}

export enum AccessorComponentType {
    byte = 5120,
    ubyte = 5121,
    short = 5122,
    ushort = 5123,
    uint = 5125,
    float = 5126
}

export enum AccessorDataType {
    scalar = "SCALAR",
    vec2 = "VEC2",
    vec3 = "VEC3",
    vec4 = "VEC4",
    mat2 = "MAT2",
    mat3 = "MAT3",
    mat4 = "MAT4"
}

export interface Mesh {
    name: string;
    primitives: Primitive[];
}

export interface Primitive {
    name: string;
    indices?: ArrayBufferLike;
    vertices: ArrayBufferLike;
    normals: ArrayBufferLike;
    texCoords?: ArrayBufferLike;
    material?: Material;
    mode: PrimitiveMode;
    object3d?: Object3d;
}

export interface Material {
    name: string;
    baseColorFactor?: number[];
    baseColorTexture?: Texture;
    metallicRoughnessTexture?: Texture;
    normalTexture?: NormalTexture;
    occlusionTexture?: OcclusionTexture;
    emissiveTexture?: Texture;
    emissiveFactor?: number[];
    alphaMode?: AlphaMode;
    alphaCutoff?: number;
    doubleSided?: boolean;
}

export interface Texture {
    image: TextureImage;
    texCoord?: number;
}

export interface NormalTexture extends Texture {
    scale?: number;
}

export interface OcclusionTexture extends Texture {
    strength?: number;
}

export interface TextureImage {
    src?: string;
    element?: HTMLImageElement;
    mimeType?: MimeType;
    name?: string;
}

export enum AlphaMode {
    OPAQUE = "OPAQUE",
    MASK = "MASK",
    BLEND = "BLEND"
}

export enum PrimitiveMode {
    points = 0,
    lines = 1,
    lineLoop = 2,
    lineStrip = 3,
    triangles = 4,
    triangleStrip = 5,
    triangleFan = 6
}
