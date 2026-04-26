import { GeoObject } from "./GeoObject";
import type { WebGLBufferExt, WebGLTextureExt } from "../../webgl/Handler";
import { loadImage, makeArrayTyped, prepareTextureImage } from "../../utils/shared";
import type { TypedArray } from "../../utils/shared";
import { ShaderProgram } from "../../webgl/ShaderProgram";
import { GeoObjectHandler } from "./GeoObjectHandler";
import {
    VERTEX_BUFFER,
    RTC_POSITION_BUFFER,
    RGBA_BUFFER,
    NORMALS_BUFFER,
    INDEX_BUFFER,
    QROT_BUFFER,
    SIZE_BUFFER,
    PICKINGCOLOR_BUFFER,
    VISIBLE_BUFFER,
    TEXCOORD_BUFFER,
    TRANSLATE_BUFFER,
    LOCALPOSITION_BUFFER
} from "./GeoObjectHandler";

const AMBIENT_OCCLUSION = 0;
const ROUGHNESS = 1;
const METALLIC = 2;

export class InstanceData {
    public isFree: boolean;

    public _geoObjectHandler: GeoObjectHandler;

    public geoObjects: GeoObject[];

    public numInstances: number;
    public _opaqueInstanceCount: number;

    public _colorTexture: WebGLTextureExt | null;
    public _normalTexture: WebGLTextureExt | null;
    public _metallicTexture: WebGLTextureExt | null;
    public _roughnessTexture: WebGLTextureExt | null;
    public _metallicRoughnessTexture: WebGLTextureExt | null;

    public _colorTextureSrc: string | null;
    public _normalTextureSrc: string | null;
    public _metallicTextureSrc: string | null;
    public _roughnessTextureSrc: string | null;
    public _metallicRoughnessTextureSrc: string | null;
    public _colorTextureImage: HTMLImageElement | null;
    public _normalTextureImage: HTMLImageElement | null;
    public _metallicTextureImage: HTMLImageElement | null;
    public _roughnessTextureImage: HTMLImageElement | null;
    public _metallicRoughnessTextureImage: HTMLImageElement | null;

    public _objectSrc?: string;

    public _sizeArr: number[] | TypedArray;
    public _translateArr: number[] | TypedArray;
    public _vertexArr: number[] | TypedArray;

    public _rtcPositionHighArr: number[] | TypedArray;
    public _rtcPositionLowArr: number[] | TypedArray;

    public _qRotArr: number[] | TypedArray;
    public _rgbaArr: number[] | TypedArray;
    public _normalsArr: number[] | TypedArray;
    public _indicesArr: number[] | TypedArray;
    public _pickingColorArr: number[] | TypedArray;
    public _visibleArr: number[] | TypedArray;
    public _texCoordArr: number[] | TypedArray;

    public _localPositionArr: number[] | TypedArray;

    public _sizeBuffer: WebGLBufferExt | null;
    public _translateBuffer: WebGLBufferExt | null;
    public _vertexBuffer: WebGLBufferExt | null;
    public _rtcPositionHighBuffer: WebGLBufferExt | null;
    public _rtcPositionLowBuffer: WebGLBufferExt | null;
    public _qRotBuffer: WebGLBufferExt | null;
    public _rgbaBuffer: WebGLBufferExt | null;
    public _normalsBuffer: WebGLBufferExt | null;
    public _indicesBuffer: WebGLBufferExt | null;
    public _pickingColorBuffer: WebGLBufferExt | null;
    public _visibleBuffer: WebGLBufferExt | null;
    public _texCoordBuffer: WebGLBufferExt | null;
    public _localPositionBuffer: WebGLBufferExt | null;

    public _buffersUpdateCallbacks: Function[];

    public _changedBuffers: boolean[];

    public _materialProperties: Float32Array;

    constructor(geoObjectHandler: GeoObjectHandler) {
        this.isFree = true;

        this._geoObjectHandler = geoObjectHandler;

        this.geoObjects = [];

        this.numInstances = 0;
        this._opaqueInstanceCount = 0;

        this._colorTexture = null;
        this._colorTextureSrc = null;
        this._colorTextureImage = null;

        this._normalTexture = null;
        this._normalTextureSrc = null;
        this._normalTextureImage = null;

        this._metallicTexture = null;
        this._metallicTextureSrc = null;
        this._metallicTextureImage = null;

        this._roughnessTexture = null;
        this._roughnessTextureSrc = null;
        this._roughnessTextureImage = null;

        this._metallicRoughnessTexture = null;
        this._metallicRoughnessTextureSrc = null;
        this._metallicRoughnessTextureImage = null;

        this._sizeArr = [];
        this._translateArr = [];
        this._vertexArr = [];
        this._rtcPositionHighArr = [];
        this._rtcPositionLowArr = [];
        this._qRotArr = [];
        this._rgbaArr = [];
        this._normalsArr = [];
        this._indicesArr = [];
        this._pickingColorArr = [];
        this._visibleArr = [];
        this._texCoordArr = [];
        this._localPositionArr = [];

        this._sizeBuffer = null;
        this._translateBuffer = null;
        this._vertexBuffer = null;
        this._rtcPositionHighBuffer = null;
        this._rtcPositionLowBuffer = null;
        this._qRotBuffer = null;
        this._rgbaBuffer = null;
        this._normalsBuffer = null;
        this._indicesBuffer = null;
        this._pickingColorBuffer = null;
        this._visibleBuffer = null;
        this._texCoordBuffer = null;
        this._localPositionBuffer = null;

        this._materialProperties = new Float32Array(3);

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[PICKINGCOLOR_BUFFER] = this.createPickingColorBuffer;
        this._buffersUpdateCallbacks[NORMALS_BUFFER] = this.createNormalsBuffer;
        this._buffersUpdateCallbacks[RGBA_BUFFER] = this.createRgbaBuffer;
        this._buffersUpdateCallbacks[INDEX_BUFFER] = this.createIndicesBuffer;
        this._buffersUpdateCallbacks[VERTEX_BUFFER] = this.createVertexBuffer;
        this._buffersUpdateCallbacks[SIZE_BUFFER] = this.createSizeBuffer;
        this._buffersUpdateCallbacks[VISIBLE_BUFFER] = this.createVisibleBuffer;
        this._buffersUpdateCallbacks[TEXCOORD_BUFFER] = this.createTexCoordBuffer;
        this._buffersUpdateCallbacks[QROT_BUFFER] = this.createQRotBuffer;
        this._buffersUpdateCallbacks[TRANSLATE_BUFFER] = this.createTranslateBuffer;
        this._buffersUpdateCallbacks[RTC_POSITION_BUFFER] = this.createRTCPositionBuffer;
        this._buffersUpdateCallbacks[LOCALPOSITION_BUFFER] = this.createLocalPositionBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
    }

    public setMetallic(metallic: number) {
        this._materialProperties[METALLIC] = metallic;
    }

    public setRoughness(roughness: number) {
        this._materialProperties[ROUGHNESS] = roughness;
    }

    public setAmbientOcclusion(ambientOcclusion: number) {
        this._materialProperties[AMBIENT_OCCLUSION] = ambientOcclusion;
    }

    public setMaterialProperties(ambientOcclusion: number, roughness: number, metallic: number) {
        this.setAmbientOcclusion(ambientOcclusion);
        this.setRoughness(roughness);
        this.setMetallic(metallic);
    }

    //
    //  Instance individual data
    //
    public drawOpaque(p: ShaderProgram) {
        const instanceCount = this._opaqueInstanceCount;
        if (instanceCount <= 0) {
            return;
        }

        let gl = p.gl!,
            u = p.uniforms,
            a = p.attributes;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._qRotBuffer!);
        gl.vertexAttribPointer(a.qRot, this._qRotBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer!);
        gl.vertexAttribPointer(a.aScale, this._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._translateBuffer!);
        gl.vertexAttribPointer(a.aTranslate, this._translateBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._localPositionBuffer!);
        gl.vertexAttribPointer(a.aLocalPosition, this._localPositionBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._visibleBuffer!);
        gl.vertexAttribPointer(a.aDispose, this._visibleBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer!);
        gl.vertexAttribPointer(a.aColor, this._rgbaBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform3fv(u.materialProperties, this._materialProperties);

        this._drawElementsInstanced(p, 0, instanceCount);
    }

    //
    //  All instances in forward pass(opaque + transparent)
    //
    public drawForwardAll(p: ShaderProgram) {
        const instanceCount = this.numInstances;
        if (instanceCount <= 0) {
            return;
        }

        let gl = p.gl!,
            u = p.uniforms,
            a = p.attributes;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._qRotBuffer!);
        gl.vertexAttribPointer(a.qRot, this._qRotBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer!);
        gl.vertexAttribPointer(a.aScale, this._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._translateBuffer!);
        gl.vertexAttribPointer(a.aTranslate, this._translateBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._localPositionBuffer!);
        gl.vertexAttribPointer(a.aLocalPosition, this._localPositionBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._visibleBuffer!);
        gl.vertexAttribPointer(a.aDispose, this._visibleBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer!);
        gl.vertexAttribPointer(a.aColor, this._rgbaBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform3fv(u.materialProperties, this._materialProperties);

        this._drawElementsInstanced(p, 0, instanceCount);
    }

    //
    //  Instance individual data
    //
    public drawTransparent(p: ShaderProgram) {
        const startInstance = this._opaqueInstanceCount;
        const instanceCount = this.numInstances - startInstance;
        if (instanceCount <= 0) {
            return;
        }

        let gl = p.gl!,
            u = p.uniforms,
            a = p.attributes;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._qRotBuffer!);
        gl.vertexAttribPointer(
            a.qRot,
            this._qRotBuffer!.itemSize,
            gl.FLOAT,
            false,
            0,
            startInstance * this._qRotBuffer!.itemSize * Float32Array.BYTES_PER_ELEMENT
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer!);
        gl.vertexAttribPointer(
            a.aScale,
            this._sizeBuffer!.itemSize,
            gl.FLOAT,
            false,
            0,
            startInstance * this._sizeBuffer!.itemSize * Float32Array.BYTES_PER_ELEMENT
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._translateBuffer!);
        gl.vertexAttribPointer(
            a.aTranslate,
            this._translateBuffer!.itemSize,
            gl.FLOAT,
            false,
            0,
            startInstance * this._translateBuffer!.itemSize * Float32Array.BYTES_PER_ELEMENT
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._localPositionBuffer!);
        gl.vertexAttribPointer(
            a.aLocalPosition,
            this._localPositionBuffer!.itemSize,
            gl.FLOAT,
            false,
            0,
            startInstance * this._localPositionBuffer!.itemSize * Float32Array.BYTES_PER_ELEMENT
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._visibleBuffer!);
        gl.vertexAttribPointer(
            a.aDispose,
            this._visibleBuffer!.itemSize,
            gl.FLOAT,
            false,
            0,
            startInstance * this._visibleBuffer!.itemSize * Float32Array.BYTES_PER_ELEMENT
        );

        gl.uniform3fv(u.materialProperties, this._materialProperties);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer!);
        gl.vertexAttribPointer(
            a.aColor,
            this._rgbaBuffer!.itemSize,
            gl.FLOAT,
            false,
            0,
            startInstance * this._rgbaBuffer!.itemSize * Float32Array.BYTES_PER_ELEMENT
        );

        this._drawElementsInstanced(p, startInstance, instanceCount);
    }

    //
    // Instance common data(could be in VAO)
    //
    protected _drawElementsInstanced(p: ShaderProgram, startInstance: number, instanceCount: number) {
        let gl = p.gl!,
            u = p.uniforms,
            a = p.attributes;

        let r = this._geoObjectHandler!._renderer!;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rtcPositionHighBuffer!);
        gl.vertexAttribPointer(
            a.aRTCPositionHigh,
            this._rtcPositionHighBuffer!.itemSize,
            gl.FLOAT,
            false,
            0,
            startInstance * this._rtcPositionHighBuffer!.itemSize * Float32Array.BYTES_PER_ELEMENT
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rtcPositionLowBuffer!);
        gl.vertexAttribPointer(
            a.aRTCPositionLow,
            this._rtcPositionLowBuffer!.itemSize,
            gl.FLOAT,
            false,
            0,
            startInstance * this._rtcPositionLowBuffer!.itemSize * Float32Array.BYTES_PER_ELEMENT
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._normalsBuffer!);
        gl.vertexAttribPointer(a.aVertexNormal, this._normalsBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer!);
        gl.vertexAttribPointer(a.aVertexPosition, this._vertexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform1f(u.uUseColorTexture, this._colorTexture ? 1 : 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._colorTexture || r.handler.defaultTexture);
        gl.uniform1i(u.uColorTexture, 0);

        gl.uniform1f(u.uUseNormalTexture, this._normalTexture ? 1 : 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this._normalTexture || r.handler.defaultTexture);
        gl.uniform1i(u.uNormalTexture, 1);

        gl.uniform1f(u.uUseMetallicTexture, this._metallicTexture ? 1 : 0);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this._metallicTexture || r.handler.defaultTexture);
        gl.uniform1i(u.uMetallicTexture, 2);

        gl.uniform1f(u.uUseRoughnessTexture, this._roughnessTexture ? 1 : 0);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this._roughnessTexture || r.handler.defaultTexture);
        gl.uniform1i(u.uRoughnessTexture, 3);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer!);
        gl.vertexAttribPointer(a.aTexCoord, this._texCoordBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indicesBuffer!);
        p.drawElementsInstanced!(gl.TRIANGLES, this._indicesBuffer!.numItems, gl.UNSIGNED_INT, 0, instanceCount);
    }

    public async loadColorTexture() {
        if (!this._geoObjectHandler._renderer) {
            return;
        }
        if (this._colorTextureSrc) {
            const image = await loadImage(this._colorTextureSrc);
            const textureImage = await prepareTextureImage(image);
            if (textureImage) {
                this._createColorTexture(textureImage);
            }
            return;
        }
        if (this._colorTextureImage) {
            const textureImage = await prepareTextureImage(this._colorTextureImage);
            if (textureImage) {
                this._createColorTexture(textureImage);
            }
            return;
        }
    }

    public async loadNormalTexture() {
        if (!this._geoObjectHandler._renderer) {
            return;
        }
        if (this._normalTextureSrc) {
            const image = await loadImage(this._normalTextureSrc);
            const textureImage = await prepareTextureImage(image);
            if (textureImage) {
                this._createNormalTexture(textureImage);
            }
            return;
        }
        if (this._normalTextureImage) {
            const textureImage = await prepareTextureImage(this._normalTextureImage);
            if (textureImage) {
                this._createNormalTexture(textureImage);
            }
            return;
        }
    }

    public async loadMetallicTexture() {
        if (!this._geoObjectHandler._renderer) {
            return;
        }
        if (this._metallicTextureSrc) {
            const image = await loadImage(this._metallicTextureSrc);
            const textureImage = await prepareTextureImage(image);
            if (textureImage) {
                this._createMetallicTexture(textureImage);
            }
            return;
        }
        if (this._metallicTextureImage) {
            const textureImage = await prepareTextureImage(this._metallicTextureImage);
            if (textureImage) {
                this._createMetallicTexture(textureImage);
            }
            return;
        }
    }

    public async loadRoughnessTexture() {
        if (!this._geoObjectHandler._renderer) {
            return;
        }
        if (this._roughnessTextureSrc) {
            const image = await loadImage(this._roughnessTextureSrc);
            const textureImage = await prepareTextureImage(image);
            if (textureImage) {
                this._createRoughnessTexture(textureImage);
            }
            return;
        }
        if (this._roughnessTextureImage) {
            const textureImage = await prepareTextureImage(this._roughnessTextureImage);
            if (textureImage) {
                this._createRoughnessTexture(textureImage);
            }
            return;
        }
    }

    public async loadMetallicRoughnessTexture() {
        if (!this._geoObjectHandler._renderer) {
            return;
        }
        if (this._metallicRoughnessTextureSrc) {
            const image = await loadImage(this._metallicRoughnessTextureSrc);
            const textureImage = await prepareTextureImage(image);
            if (textureImage) {
                this._createMetallicTexture(textureImage);
                this._createRoughnessTexture(textureImage);
                this._createMetallicRoughnessTexture(textureImage);
            }
            return;
        }
        if (this._metallicRoughnessTextureImage) {
            const textureImage = await prepareTextureImage(this._metallicRoughnessTextureImage);
            if (textureImage) {
                this._createMetallicTexture(textureImage);
                this._createRoughnessTexture(textureImage);
                this._createMetallicRoughnessTexture(textureImage);
            }
            return;
        }
    }

    public clear() {
        this.numInstances = 0;
        this._opaqueInstanceCount = 0;

        this.geoObjects = [];

        this._sizeArr = [];
        this._translateArr = [];
        this._vertexArr = [];
        this._rtcPositionHighArr = [];
        this._rtcPositionLowArr = [];
        this._qRotArr = [];
        this._rgbaArr = [];
        this._normalsArr = [];
        this._indicesArr = [];
        this._pickingColorArr = [];
        this._visibleArr = [];
        this._texCoordArr = [];
        this._localPositionArr = [];

        this._deleteBuffers();

        this.isFree = false;

        //this._geoObjectHandler = null;
    }

    public _deleteBuffers() {
        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {
            let h = this._geoObjectHandler._renderer.handler;

            if (h) {
                h.deleteTexture(this._colorTexture);
                h.deleteTexture(this._normalTexture);
                h.deleteTexture(this._metallicTexture);
                h.deleteTexture(this._roughnessTexture);
                h.deleteTexture(this._metallicRoughnessTexture);

                let gl = h.gl;
                if (gl) {
                    gl.deleteBuffer(this._sizeBuffer!);
                    gl.deleteBuffer(this._translateBuffer!);
                    gl.deleteBuffer(this._vertexBuffer!);
                    gl.deleteBuffer(this._rtcPositionHighBuffer!);
                    gl.deleteBuffer(this._rtcPositionLowBuffer!);
                    gl.deleteBuffer(this._qRotBuffer!);
                    gl.deleteBuffer(this._rgbaBuffer!);
                    gl.deleteBuffer(this._normalsBuffer!);
                    gl.deleteBuffer(this._indicesBuffer!);
                    gl.deleteBuffer(this._pickingColorBuffer!);
                    gl.deleteBuffer(this._visibleBuffer!);
                    gl.deleteBuffer(this._texCoordBuffer!);
                    gl.deleteBuffer(this._localPositionBuffer!);
                }
            }

            this._colorTexture = null;
            this._normalTexture = null;
            this._metallicTexture = null;
            this._roughnessTexture = null;
            this._metallicRoughnessTexture = null;
        }

        this._sizeBuffer = null;
        this._translateBuffer = null;
        this._vertexBuffer = null;
        this._rtcPositionHighBuffer = null;
        this._rtcPositionLowBuffer = null;
        this._qRotBuffer = null;
        this._rgbaBuffer = null;
        this._normalsBuffer = null;
        this._indicesBuffer = null;
        this._pickingColorBuffer = null;
        this._visibleBuffer = null;
        this._texCoordBuffer = null;
        this._localPositionBuffer = null;
    }

    public createVertexBuffer() {
        const h = this._geoObjectHandler._renderer!.handler;
        h.gl!.deleteBuffer(this._vertexBuffer!);
        this._vertexArr = makeArrayTyped(this._vertexArr);
        this._vertexBuffer = h.createArrayBuffer(this._vertexArr as Float32Array, 3, this._vertexArr.length / 3);
    }

    public createVisibleBuffer() {
        const h = this._geoObjectHandler._renderer!.handler,
            numItems = this._visibleArr.length;

        if (!this._visibleBuffer || this._visibleBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._visibleBuffer!);
            this._visibleBuffer = h.createStreamArrayBuffer(1, numItems);
        }

        this._visibleArr = makeArrayTyped(this._visibleArr);

        h.setStreamArrayBuffer(this._visibleBuffer, this._visibleArr as Uint8Array);
    }

    public createSizeBuffer() {
        let h = this._geoObjectHandler._renderer!.handler,
            numItems = this._sizeArr.length / 3;

        if (!this._sizeBuffer || this._sizeBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._sizeBuffer!);
            this._sizeBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._sizeArr = makeArrayTyped(this._sizeArr);
        h.setStreamArrayBuffer(this._sizeBuffer, this._sizeArr as Float32Array);
    }

    public createTranslateBuffer() {
        let h = this._geoObjectHandler._renderer!.handler,
            numItems = this._translateArr.length / 3;

        if (!this._translateBuffer || this._translateBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._translateBuffer!);
            this._translateBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._translateArr = makeArrayTyped(this._translateArr);

        h.setStreamArrayBuffer(this._translateBuffer, this._translateArr as Float32Array);
    }

    public createLocalPositionBuffer() {
        let h = this._geoObjectHandler._renderer!.handler,
            numItems = this._localPositionArr.length / 3;

        if (!this._localPositionBuffer || this._localPositionBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._localPositionBuffer!);
            this._localPositionBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._localPositionArr = makeArrayTyped(this._localPositionArr);

        h.setStreamArrayBuffer(this._localPositionBuffer, this._localPositionArr as Float32Array);
    }

    public createTexCoordBuffer() {
        const h = this._geoObjectHandler._renderer!.handler;
        h.gl!.deleteBuffer(this._texCoordBuffer!);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._texCoordBuffer = h.createArrayBuffer(this._texCoordArr as Uint8Array, 2, this._texCoordArr.length / 2);
    }

    public createRTCPositionBuffer() {
        let h = this._geoObjectHandler._renderer!.handler,
            numItems = this._rtcPositionHighArr.length / 3;

        if (!this._rtcPositionHighBuffer || this._rtcPositionHighBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._rtcPositionHighBuffer!);
            h.gl!.deleteBuffer(this._rtcPositionLowBuffer!);
            this._rtcPositionHighBuffer = h.createStreamArrayBuffer(3, numItems);
            this._rtcPositionLowBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._rtcPositionHighArr = makeArrayTyped(this._rtcPositionHighArr);
        this._rtcPositionLowArr = makeArrayTyped(this._rtcPositionLowArr);

        h.setStreamArrayBuffer(this._rtcPositionHighBuffer!, this._rtcPositionHighArr as Float32Array);
        h.setStreamArrayBuffer(this._rtcPositionLowBuffer!, this._rtcPositionLowArr as Float32Array);
    }

    public createRgbaBuffer() {
        let h = this._geoObjectHandler._renderer!.handler,
            numItems = this._rgbaArr.length / 4;

        if (!this._rgbaBuffer || this._rgbaBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._rgbaBuffer!);
            this._rgbaBuffer = h.createStreamArrayBuffer(4, numItems);
        }

        this._rgbaArr = makeArrayTyped(this._rgbaArr);

        h.setStreamArrayBuffer(this._rgbaBuffer, this._rgbaArr as Uint8Array);
    }

    public createQRotBuffer() {
        let h = this._geoObjectHandler._renderer!.handler,
            numItems = this._qRotArr.length / 4;

        if (!this._qRotBuffer || this._qRotBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._qRotBuffer!);
            this._qRotBuffer = h.createStreamArrayBuffer(4, numItems);
        }

        this._qRotArr = makeArrayTyped(this._qRotArr);

        h.setStreamArrayBuffer(this._qRotBuffer, this._qRotArr as Float32Array);
    }

    public createNormalsBuffer() {
        const h = this._geoObjectHandler._renderer!.handler;
        h.gl!.deleteBuffer(this._normalsBuffer!);
        this._normalsArr = makeArrayTyped(this._normalsArr);
        this._normalsBuffer = h.createArrayBuffer(this._normalsArr as Uint8Array, 3, this._normalsArr.length / 3);
    }

    public createIndicesBuffer() {
        const h = this._geoObjectHandler._renderer!.handler;
        h.gl!.deleteBuffer(this._indicesBuffer!);
        this._indicesArr = makeArrayTyped(this._indicesArr, Uint32Array);
        this._indicesBuffer = h.createElementArrayBuffer(this._indicesArr as Uint32Array, 1, this._indicesArr.length);
    }

    public createPickingColorBuffer() {
        const h = this._geoObjectHandler._renderer!.handler;
        h.gl!.deleteBuffer(this._pickingColorBuffer!);
        this._pickingColorArr = makeArrayTyped(this._pickingColorArr);
        this._pickingColorBuffer = h.createArrayBuffer(
            this._pickingColorArr as Uint8Array,
            3,
            this._pickingColorArr.length / 3
        );
    }

    public refresh() {
        let i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    public update() {
        if (this._geoObjectHandler._renderer) {
            let i = this._changedBuffers.length;
            while (i--) {
                if (this._changedBuffers[i]) {
                    this._buffersUpdateCallbacks[i].call(this);
                    this._changedBuffers[i] = false;
                }
            }
            this.isFree = true;
        }
    }

    private _createColorTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {
            let h = this._geoObjectHandler._renderer.handler;
            this._colorTexture = h.createTextureDefault(image, null, h.gl!.REPEAT);
        }
    }

    private _createNormalTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {
            let h = this._geoObjectHandler._renderer.handler;
            this._normalTexture = h.createTextureDefault(image, null, h.gl!.REPEAT);
        }
    }

    private _createMetallicTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {
            let h = this._geoObjectHandler._renderer.handler;
            this._metallicTexture = h.createTextureDefault(image, null, h.gl!.REPEAT);
        }
    }

    private _createRoughnessTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {
            let h = this._geoObjectHandler._renderer.handler;
            this._roughnessTexture = h.createTextureDefault(image, null, h.gl!.REPEAT);
        }
    }

    private _createMetallicRoughnessTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {
            let h = this._geoObjectHandler._renderer.handler;
            this._metallicRoughnessTexture = h.createTextureDefault(image, null, h.gl!.REPEAT);
        }
    }
}
