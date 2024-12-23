import {GeoObject} from "./GeoObject";
import {WebGLBufferExt, WebGLTextureExt} from "../webgl/Handler";
import {makeArrayTyped, TypedArray} from "../utils/shared";
import {Program} from "../webgl/Program";
import {GeoObjectHandler} from "./GeoObjectHandler";
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
    TRANSLATE_BUFFER
} from "./GeoObjectHandler";

const AMBIENT_R = 0;
const AMBIENT_G = 1;
const AMBIENT_B = 2;
const DIFFUSE_R = 3;
const DIFFUSE_G = 4;
const DIFFUSE_B = 5;
const SPECULAR_R = 6;
const SPECULAR_G = 7;
const SPECULAR_B = 8;

export class InstanceData {

    public isFree: boolean;

    public _geoObjectHandler: GeoObjectHandler;

    public geoObjects: GeoObject[];

    public numInstances: number;

    public _colorTexture: WebGLTextureExt | null;
    public _normalTexture: WebGLTextureExt | null;
    public _metallicRoughnessTexture: WebGLTextureExt | null;

    public _colorTextureSrc: string | null;
    public _normalTextureSrc: string | null;
    public _metallicRoughnessTextureSrc: string | null;

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

    public _buffersUpdateCallbacks: Function[];

    public _changedBuffers: boolean[];

    public _materialParams: Float32Array;
    public _materialShininess: number;

    constructor(geoObjectHandler: GeoObjectHandler) {

        this.isFree = true;

        this._geoObjectHandler = geoObjectHandler;

        this.geoObjects = [];

        this.numInstances = 0;

        this._colorTexture = null;
        this._colorTextureSrc = null;

        this._normalTexture = null;
        this._normalTextureSrc = null;

        this._metallicRoughnessTexture = null;
        this._metallicRoughnessTextureSrc = null;

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

        this._materialParams = new Float32Array(9);
        this._materialShininess = 0;

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

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
    }

    public setMaterialAmbient(r: number, g: number, b: number) {
        this._materialParams[AMBIENT_R] = r;
        this._materialParams[AMBIENT_G] = g;
        this._materialParams[AMBIENT_B] = b;
    }

    public setMaterialDiffuse(r: number, g: number, b: number) {
        this._materialParams[DIFFUSE_R] = r;
        this._materialParams[DIFFUSE_G] = g;
        this._materialParams[DIFFUSE_B] = b;
    }

    public setMaterialSpecular(r: number, g: number, b: number) {
        this._materialParams[SPECULAR_R] = r;
        this._materialParams[SPECULAR_G] = g;
        this._materialParams[SPECULAR_B] = b;
    }

    public setMaterialShininess(shininess: number) {
        this._materialShininess = shininess;
    }

    public setMaterialParams(ambient: Float32Array, diffuse: Float32Array, specular: Float32Array, shininess: number) {
        this.setMaterialAmbient(ambient[0], ambient[1], ambient[2]);
        this.setMaterialDiffuse(diffuse[0], diffuse[1], diffuse[2]);
        this.setMaterialSpecular(specular[0], specular[1], specular[2]);
        this.setMaterialShininess(shininess);
    }

    //
    //  Instance individual data
    //
    public drawOpaque(p: Program) {

        let gl = p.gl!,
            u = p.uniforms,
            a = p.attributes;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._qRotBuffer!);
        gl.vertexAttribPointer(a.qRot, this._qRotBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer!);
        gl.vertexAttribPointer(a.aScale, this._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._translateBuffer!);
        gl.vertexAttribPointer(a.aTranslate, this._translateBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._visibleBuffer!);
        gl.vertexAttribPointer(a.aDispose, this._visibleBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform1f(u.uUseTexture, this._colorTexture ? 1 : 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer!);
        gl.vertexAttribPointer(a.aColor, this._rgbaBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform3fv(u.materialParams, this._materialParams);
        gl.uniform1f(u.materialShininess, this._materialShininess);


        this._drawElementsInstanced(p);
    }

    //
    //  Instance individual data
    //
    public drawTransparent(p: Program) {

        let gl = p.gl!,
            u = p.uniforms,
            a = p.attributes;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._qRotBuffer!);
        gl.vertexAttribPointer(a.qRot, this._qRotBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer!);
        gl.vertexAttribPointer(a.aScale, this._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._translateBuffer!);
        gl.vertexAttribPointer(a.aTranslate, this._translateBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._visibleBuffer!);
        gl.vertexAttribPointer(a.aDispose, this._visibleBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.uniform1f(u.uUseTexture, this._colorTexture ? 1 : 0);

        gl.uniform3fv(u.materialParams, this._materialParams);
        gl.uniform1f(u.materialShininess, this._materialShininess);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer!);
        gl.vertexAttribPointer(a.aColor, this._rgbaBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        this._drawElementsInstanced(p);
    }

    //
    // Instance common data(could be in VAO)
    //
    protected _drawElementsInstanced(p: Program) {

        let gl = p.gl!,
            u = p.uniforms,
            a = p.attributes;

        let r = this._geoObjectHandler!._renderer!;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rtcPositionHighBuffer!);
        gl.vertexAttribPointer(a.aRTCPositionHigh, this._rtcPositionHighBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rtcPositionLowBuffer!);
        gl.vertexAttribPointer(a.aRTCPositionLow, this._rtcPositionLowBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._normalsBuffer!);
        gl.vertexAttribPointer(a.aVertexNormal, this._normalsBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer!);
        gl.vertexAttribPointer(a.aVertexPosition, this._vertexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._colorTexture || r.handler.defaultTexture);
        gl.uniform1i(u.uTexture, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer!);
        gl.vertexAttribPointer(a.aTexCoord, this._texCoordBuffer!.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indicesBuffer!);
        p.drawElementsInstanced!(gl.TRIANGLES, this._indicesBuffer!.numItems, gl.UNSIGNED_INT, 0, this.numInstances);
    }

    public createColorTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {
            this._colorTexture = this._geoObjectHandler._renderer!.handler.createTextureDefault(image);
        }
    }

    public createNormalTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {
            this._normalTexture = this._geoObjectHandler._renderer!.handler.createTextureDefault(image);
        }
    }

    public createMetallicRoughnessTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {
            this._metallicRoughnessTexture = this._geoObjectHandler._renderer!.handler.createTextureDefault(image);
        }
    }

    public clear() {

        this.numInstances = 0;

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

        this._deleteBuffers();

        this.isFree = false;

        //this._geoObjectHandler = null;
    }

    public _deleteBuffers() {

        if (this._geoObjectHandler && this._geoObjectHandler._renderer) {

            let h = this._geoObjectHandler._renderer.handler,
                gl = h.gl!;

            h.deleteTexture(this._colorTexture);
            h.deleteTexture(this._normalTexture);
            h.deleteTexture(this._metallicRoughnessTexture);

            this._colorTexture = null;
            this._normalTexture = null;
            this._metallicRoughnessTexture = null;

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
        this._pickingColorBuffer = h.createArrayBuffer(this._pickingColorArr as Uint8Array, 3, this._pickingColorArr.length / 3);
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
}