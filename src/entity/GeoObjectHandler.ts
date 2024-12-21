import * as shaders from "../shaders/geoObject";
import {concatArrays, loadImage, makeArrayTyped, spliceArray, TypedArray} from "../utils/shared";
import {EntityCollection} from "./EntityCollection";
import {GeoObject} from "./GeoObject";
import {Planet} from "../scene/Planet";
import {Vec3, NumberArray3} from "../math/Vec3";
import {Vec4} from "../math/Vec4";
import {Quat} from "../math/Quat";
import {WebGLBufferExt, WebGLTextureExt} from "../webgl/Handler";
import {Object3d} from "../Object3d";
import {Program} from "../webgl/Program";

const VERTEX_BUFFER = 0;
const RTC_POSITION_BUFFER = 1;
const RGBA_BUFFER = 2;
const NORMALS_BUFFER = 3;
const INDEX_BUFFER = 4;
const QROT_BUFFER = 5;
const SIZE_BUFFER = 6;
const PICKINGCOLOR_BUFFER = 7;
const VISIBLE_BUFFER = 8;
const TEXCOORD_BUFFER = 9;
const TRANSLATE_BUFFER = 10;

const AMBIENT_R = 0;
const AMBIENT_G = 1;
const AMBIENT_B = 2;
const DIFFUSE_R = 3;
const DIFFUSE_G = 4;
const DIFFUSE_B = 5;
const SPECULAR_R = 6;
const SPECULAR_G = 7;
const SPECULAR_B = 8;

function setParametersToArray(arr: number[] | TypedArray, index: number = 0, length: number = 0, itemSize: number = 1, ...params: number[]): number[] | TypedArray {
    const currIndex = index * length;
    for (let i = currIndex, len = currIndex + length; i < len; i++) {
        arr[i] = params[i % itemSize];
    }
    return arr;
}

class InstanceData {

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

        let r = this._geoObjectHandler!._planet!.renderer!;

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
        if (this._geoObjectHandler && this._geoObjectHandler._planet) {
            this._colorTexture = this._geoObjectHandler._planet.renderer!.handler.createTextureDefault(image);
        }
    }

    public createNormalTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._planet) {
            this._normalTexture = this._geoObjectHandler._planet.renderer!.handler.createTextureDefault(image);
        }
    }

    public createMetallicRoughnessTexture(image: HTMLCanvasElement | ImageBitmap | ImageData | HTMLImageElement) {
        if (this._geoObjectHandler && this._geoObjectHandler._planet) {
            this._metallicRoughnessTexture = this._geoObjectHandler._planet.renderer!.handler.createTextureDefault(image);
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

        if (this._geoObjectHandler && this._geoObjectHandler._planet && this._geoObjectHandler._planet.renderer) {

            let h = this._geoObjectHandler._planet.renderer.handler,
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
        const h = this._geoObjectHandler._planet!.renderer!.handler;
        h.gl!.deleteBuffer(this._vertexBuffer!);
        this._vertexArr = makeArrayTyped(this._vertexArr);
        this._vertexBuffer = h.createArrayBuffer(this._vertexArr as Float32Array, 3, this._vertexArr.length / 3);
    }

    public createVisibleBuffer() {

        const h = this._geoObjectHandler._planet!.renderer!.handler,
            numItems = this._visibleArr.length;

        if (!this._visibleBuffer || this._visibleBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._visibleBuffer!);
            this._visibleBuffer = h.createStreamArrayBuffer(1, numItems);
        }

        this._visibleArr = makeArrayTyped(this._visibleArr);

        h.setStreamArrayBuffer(this._visibleBuffer, this._visibleArr as Uint8Array);
    }

    public createSizeBuffer() {
        let h = this._geoObjectHandler._planet!.renderer!.handler,
            numItems = this._sizeArr.length / 3;

        if (!this._sizeBuffer || this._sizeBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._sizeBuffer!);
            this._sizeBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._sizeArr = makeArrayTyped(this._sizeArr);

        h.setStreamArrayBuffer(this._sizeBuffer, this._sizeArr as Float32Array);
    }

    public createTranslateBuffer() {
        let h = this._geoObjectHandler._planet!.renderer!.handler,
            numItems = this._translateArr.length / 3;

        if (!this._translateBuffer || this._translateBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._translateBuffer!);
            this._translateBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._translateArr = makeArrayTyped(this._translateArr);

        h.setStreamArrayBuffer(this._translateBuffer, this._translateArr as Float32Array);
    }

    public createTexCoordBuffer() {
        const h = this._geoObjectHandler._planet!.renderer!.handler;
        h.gl!.deleteBuffer(this._texCoordBuffer!);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._texCoordBuffer = h.createArrayBuffer(this._texCoordArr as Uint8Array, 2, this._texCoordArr.length / 2);
    }

    public createRTCPositionBuffer() {
        let h = this._geoObjectHandler._planet!.renderer!.handler,
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
        let h = this._geoObjectHandler._planet!.renderer!.handler,
            numItems = this._rgbaArr.length / 4;

        if (!this._rgbaBuffer || this._rgbaBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._rgbaBuffer!);
            this._rgbaBuffer = h.createStreamArrayBuffer(4, numItems);
        }

        this._rgbaArr = makeArrayTyped(this._rgbaArr);

        h.setStreamArrayBuffer(this._rgbaBuffer, this._rgbaArr as Uint8Array);
    }

    public createQRotBuffer() {
        let h = this._geoObjectHandler._planet!.renderer!.handler,
            numItems = this._qRotArr.length / 4;

        if (!this._qRotBuffer || this._qRotBuffer.numItems !== numItems) {
            h.gl!.deleteBuffer(this._qRotBuffer!);
            this._qRotBuffer = h.createStreamArrayBuffer(4, numItems);
        }

        this._qRotArr = makeArrayTyped(this._qRotArr);

        h.setStreamArrayBuffer(this._qRotBuffer, this._qRotArr as Float32Array);
    }

    public createNormalsBuffer() {
        const h = this._geoObjectHandler._planet!.renderer!.handler;
        h.gl!.deleteBuffer(this._normalsBuffer!);
        this._normalsArr = makeArrayTyped(this._normalsArr);
        this._normalsBuffer = h.createArrayBuffer(this._normalsArr as Uint8Array, 3, this._normalsArr.length / 3);
    }

    public createIndicesBuffer() {
        const h = this._geoObjectHandler._planet!.renderer!.handler;
        h.gl!.deleteBuffer(this._indicesBuffer!);
        this._indicesArr = makeArrayTyped(this._indicesArr, Uint32Array);
        this._indicesBuffer = h.createElementArrayBuffer(this._indicesArr as Uint32Array, 1, this._indicesArr.length);
    }

    public createPickingColorBuffer() {
        const h = this._geoObjectHandler._planet!.renderer!.handler;
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
        if (this._geoObjectHandler._planet) {
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

class GeoObjectHandler {
    static __counter__ = 0;

    protected __id: number;

    /**
     * Picking rendering option.
     * @public
     * @type {boolean}
     */
    public pickingEnabled: boolean;

    protected _entityCollection: EntityCollection;

    public _planet: Planet | null;

    protected _geoObjects: GeoObject[];

    protected _instanceDataMap: Map<string, InstanceData>;
    protected _instanceDataMapValues: InstanceData[];
    protected _dataTagUpdateQueue: InstanceData[];

    protected _relativeCenter: Vec3;

    protected _rtcEyePositionHigh: Float32Array;
    protected _rtcEyePositionLow: Float32Array;

    constructor(entityCollection: EntityCollection) {

        this.__id = GeoObjectHandler.__counter__++;

        this.pickingEnabled = true;

        this._entityCollection = entityCollection;

        this._planet = null;

        this._geoObjects = [];

        this._instanceDataMap = new Map<string, InstanceData>();
        this._instanceDataMapValues = [];

        this._dataTagUpdateQueue = [];

        this._relativeCenter = new Vec3();

        this._rtcEyePositionHigh = new Float32Array([0, 0, 0]);
        this._rtcEyePositionLow = new Float32Array([0, 0, 0]);
    }

    public initProgram() {
        if (this._planet && this._planet.renderer) {
            if (!this._planet.renderer.handler.programs.geo_object) {
                this._planet.renderer.handler.addProgram(shaders.geo_object());
            }
            if (!this._planet.renderer.handler.programs.geo_object_picking) {
                this._planet.renderer.handler.addProgram(shaders.geo_object_picking());
            }
            if (!this._planet.renderer.handler.programs.geo_object_depth) {
                this._planet.renderer.handler.addProgram(shaders.geo_object_depth());
            }
        }
    }

    public setRenderNode(renderNode: Planet) {

        this._planet = renderNode;

        this.initProgram();
        //this._initDistancePickingCallback();

        //
        // in case of lazy initialization loading data here
        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            this._loadColorTexture(this._instanceDataMapValues[i]);
            this._loadNormalTexture(this._instanceDataMapValues[i]);
            this._loadMetallicRoughnessTexture(this._instanceDataMapValues[i]);
        }

        for (let i = 0; i < this._geoObjects.length; i++) {
            this._geoObjects[i].updateRotation();
        }

        this.update();
    }

    public setColorTextureTag(src: string, tag: string) {
        const tagData = this._instanceDataMap.get(tag);
        if (tagData) {
            tagData._colorTextureSrc = src;
            this._instanceDataMap.set(tag, tagData);
            this._loadColorTexture(tagData);
        }
    }

    public setNormalTextureTag(src: string, tag: string) {
        const tagData = this._instanceDataMap.get(tag);
        if (tagData) {
            tagData._normalTextureSrc = src;
            this._instanceDataMap.set(tag, tagData);
            this._loadNormalTexture(tagData);
        }
    }

    public setMetallicRoughnessTextureTag(src: string, tag: string) {
        const tagData = this._instanceDataMap.get(tag);
        if (tagData) {
            tagData._metallicRoughnessTextureSrc = src;
            this._instanceDataMap.set(tag, tagData);
            this._loadMetallicRoughnessTexture(tagData);
        }
    }

    public setObjectSrc(src: string, tag: string) {
        const tagData = this._instanceDataMap.get(tag);
        if (src) {
            if (tagData && tagData._objectSrc !== src) {
                tagData._objectSrc = src;

                Object3d.loadObj(src).then((object3d) => {
                    this._updateInstanceData(object3d[0], tag);
                })
            }
        }
    }

    public _updateInstanceData(object: Object3d, tag: string) {
        const tagData = this._instanceDataMap.get(tag);
        if (tagData) {
            if (object.vertices.length !== tagData._vertexArr.length) {
                tagData._vertexArr = object.vertices;
                tagData._changedBuffers[VERTEX_BUFFER] = true;
            }
            if (object.normals.length !== tagData._normalsArr.length) {
                tagData._normalsArr = object.normals;
                tagData._changedBuffers[NORMALS_BUFFER] = true;
            }
            if (object.indices.length !== tagData._indicesArr.length) {
                tagData._indicesArr = object.indices;
                tagData._changedBuffers[INDEX_BUFFER] = true;
            }
            if (object.texCoords.length !== tagData._texCoordArr.length) {
                tagData._texCoordArr = object.texCoords;
                tagData._changedBuffers[TEXCOORD_BUFFER] = true;
            }

            tagData._colorTextureSrc = object.colorTexture;
            tagData._normalTextureSrc = object.normalTexture;
            tagData._metallicRoughnessTexture = object.metallicRoughnessTexture;

            this._loadColorTexture(tagData);
            this._loadNormalTexture(tagData);
            this._loadMetallicRoughnessTexture(tagData);

            this._updateTag(tagData);
            this._instanceDataMapValues = Array.from(this._instanceDataMap.values());
        }
    }

    protected _addGeoObjectToArray(geoObject: GeoObject) {
        const tag = geoObject.tag;

        let tagData = this._instanceDataMap.get(tag);

        if (!tagData) {
            tagData = new InstanceData(this);
            this._instanceDataMap.set(tag, tagData);
            this._instanceDataMapValues = Array.from(this._instanceDataMap.values());

            //
            // Setting instanced data
            tagData._vertexArr = geoObject.vertices
            tagData._normalsArr = geoObject.normals;
            tagData._indicesArr = geoObject.indices;
            tagData._texCoordArr = geoObject.texCoords;

            tagData._colorTextureSrc = geoObject.object3d.colorTexture;
            tagData._normalTextureSrc = geoObject.object3d.normalTexture;
            tagData._metallicRoughnessTextureSrc = geoObject.object3d.metallicRoughnessTexture;

            tagData.setMaterialParams(
                geoObject.object3d.ambient,
                geoObject.object3d.diffuse,
                geoObject.object3d.specular,
                geoObject.object3d.shininess
            );

            this._loadColorTexture(tagData);
            this._loadNormalTexture(tagData);
            this._loadMetallicRoughnessTexture(tagData);
        }

        geoObject._tagDataIndex = tagData.numInstances++;
        geoObject._tagData = tagData;
        tagData.geoObjects.push(geoObject);

        let itemSize = 3;

        tagData._visibleArr = concatArrays(tagData._visibleArr, setParametersToArray([], 0, 1, 1, geoObject.getVisibility() ? 1 : 0));

        //
        // Global coordinates
        this.getRTCPosition(geoObject.getPosition(), geoObject._rtcPositionHigh, geoObject._rtcPositionLow);

        let x = geoObject._rtcPositionHigh.x,
            y = geoObject._rtcPositionHigh.y,
            z = geoObject._rtcPositionHigh.z,
            w;

        tagData._rtcPositionHighArr = concatArrays(tagData._rtcPositionHighArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z));

        x = geoObject._rtcPositionLow.x;
        y = geoObject._rtcPositionLow.y;
        z = geoObject._rtcPositionLow.z;
        tagData._rtcPositionLowArr = concatArrays(tagData._rtcPositionLowArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z));


        x = geoObject._entity!._pickingColor.x / 255;
        y = geoObject._entity!._pickingColor.y / 255;
        z = geoObject._entity!._pickingColor.z / 255;
        tagData._pickingColorArr = concatArrays(tagData._pickingColorArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z));

        itemSize = 4;

        x = geoObject._qRot.x;
        y = geoObject._qRot.y;
        z = geoObject._qRot.z;
        w = geoObject._qRot.w;
        tagData._qRotArr = concatArrays(tagData._qRotArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z, w));

        x = geoObject._color.x;
        y = geoObject._color.y;
        z = geoObject._color.z;
        w = geoObject._color.w;
        tagData._rgbaArr = concatArrays(tagData._rgbaArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z, w));

        itemSize = 3;
        let scale = geoObject.getScale();
        x = scale.x;
        y = scale.y;
        z = scale.z;
        tagData._sizeArr = concatArrays(tagData._sizeArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z));

        let translate = geoObject.getTranslate();
        x = translate.x;
        y = translate.y;
        z = translate.z;
        tagData._translateArr = concatArrays(tagData._translateArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z));
    }

    //
    // Could be in VAO
    //
    protected _bindCommon() {

        let r = this._planet!.renderer!,
            sh = r.handler.programs.geo_object,
            p = sh._program,
            u = p.uniforms,
            gl = r.handler.gl!,
            ec = this._entityCollection;

        gl.uniform3fv(u.uScaleByDistance, ec.scaleByDistance);
        gl.uniform1f(u.useLighting, ec._useLighting);

        gl.uniform3fv(u.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(u.eyePositionLow, r.activeCamera.eyeLow);

        gl.uniform3fv(u.rtcEyePositionHigh, this._rtcEyePositionHigh);
        gl.uniform3fv(u.rtcEyePositionLow, this._rtcEyePositionLow);

        gl.uniformMatrix4fv(u.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniformMatrix4fv(u.viewMatrix, false, r.activeCamera.getViewMatrix());

        //
        // Global sun position
        gl.uniform3fv(u.sunPosition, this._planet!._lightPosition);

    }

    public _displayOpaquePASS() {

        let r = this._planet!.renderer!,
            sh = r.handler.programs.geo_object,
            p = sh._program;

        sh.activate();

        this._bindCommon();

        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            let instanceData = this._instanceDataMapValues[i];
            instanceData.drawOpaque(p);
        }
    }

    public _displayTransparentPASS() {
        let r = this._planet!.renderer!,
            sh = r.handler.programs.geo_object,
            p = sh._program;

        sh.activate();

        //gl.disable(gl.CULL_FACE);

        this._bindCommon();

        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            this._instanceDataMapValues[i].drawTransparent(p);
        }
    }

    protected _depthPASS() {
        let r = this._planet!.renderer!,
            sh = r.handler.programs.geo_object_depth,
            p = sh._program,
            u = p.uniforms,
            a = p.attributes,
            gl = r.handler.gl!,
            ec = this._entityCollection;

        let cam = r.activeCamera!;

        sh.activate();

        gl.uniform3fv(u.uScaleByDistance, ec.scaleByDistance);

        gl.uniform3fv(u.rtcEyePositionHigh, this._rtcEyePositionHigh);
        gl.uniform3fv(u.rtcEyePositionLow, this._rtcEyePositionLow);

        gl.uniformMatrix4fv(u.projectionMatrix, false, r.activeCamera!.getProjectionMatrix());
        gl.uniformMatrix4fv(u.viewMatrix, false, r.activeCamera!.getViewMatrix());

        gl.uniform1f(u.frustumPickingColor, cam.frustumColorIndex);

        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            let tagData = this._instanceDataMapValues[i];

            //
            // Instance individual data
            //
            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._qRotBuffer!);
            gl.vertexAttribPointer(a.qRot, tagData._qRotBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._sizeBuffer!);
            gl.vertexAttribPointer(a.aScale, tagData._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._translateBuffer!);
            gl.vertexAttribPointer(a.aTranslate, tagData._translateBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._rtcPositionHighBuffer!);
            gl.vertexAttribPointer(a.aRTCPositionHigh, tagData._rtcPositionHighBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._rtcPositionLowBuffer!);
            gl.vertexAttribPointer(a.aRTCPositionLow, tagData._rtcPositionLowBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._visibleBuffer!);
            gl.vertexAttribPointer(a.aDispose, tagData._visibleBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            //
            // Instance common data(could be in VAO)
            //
            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._vertexBuffer!);
            gl.vertexAttribPointer(a.aVertexPosition, tagData._vertexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tagData._indicesBuffer!);
            p.drawElementsInstanced!(gl.TRIANGLES, tagData._indicesBuffer!.numItems, gl.UNSIGNED_INT, 0, tagData.numInstances);
        }
    }

    public drawDepth() {
        if (this._geoObjects.length) {
            this._depthPASS();
        }
    }

    public drawPicking() {
        if (this._geoObjects.length && this.pickingEnabled) {
            this._pickingPASS();
        }
    }

    protected _pickingPASS() {
        let r = this._planet!.renderer!,
            sh = r.handler.programs.geo_object_picking,
            p = sh._program,
            u = p.uniforms,
            a = p.attributes,
            gl = r.handler.gl!,
            ec = this._entityCollection;

        sh.activate();

        gl.uniform3fv(u.uScaleByDistance, ec.scaleByDistance);
        gl.uniform3fv(u.pickingScale, ec.pickingScale);

        gl.uniform3fv(u.rtcEyePositionHigh, this._rtcEyePositionHigh);
        gl.uniform3fv(u.rtcEyePositionLow, this._rtcEyePositionLow);

        gl.uniformMatrix4fv(u.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniformMatrix4fv(u.viewMatrix, false, r.activeCamera.getViewMatrix());

        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            let tagData = this._instanceDataMapValues[i];

            //
            // Instance individual data
            //
            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._qRotBuffer!);
            gl.vertexAttribPointer(a.qRot, tagData._qRotBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._sizeBuffer!);
            gl.vertexAttribPointer(a.aScale, tagData._sizeBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._translateBuffer!);
            gl.vertexAttribPointer(a.aTranslate, tagData._translateBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._pickingColorBuffer!);
            gl.vertexAttribPointer(a.aPickingColor, tagData._pickingColorBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._rtcPositionHighBuffer!);
            gl.vertexAttribPointer(a.aRTCPositionHigh, tagData._rtcPositionHighBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._rtcPositionLowBuffer!);
            gl.vertexAttribPointer(a.aRTCPositionLow, tagData._rtcPositionLowBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._visibleBuffer!);
            gl.vertexAttribPointer(a.aDispose, tagData._visibleBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            //
            // Instance common data(could be in VAO)
            //
            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._vertexBuffer!);
            gl.vertexAttribPointer(a.aVertexPosition, tagData._vertexBuffer!.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tagData._indicesBuffer!);
            p.drawElementsInstanced!(gl.TRIANGLES, tagData._indicesBuffer!.numItems, gl.UNSIGNED_INT, 0, tagData.numInstances);
        }
    }

    async _loadColorTexture(tagData: InstanceData) {
        if (this._planet && tagData._colorTextureSrc) {
            const image = await loadImage(tagData._colorTextureSrc);
            tagData.createColorTexture(image);
        }
    }

    async _loadNormalTexture(tagData: InstanceData) {
        if (this._planet && tagData._normalTextureSrc) {
            const image = await loadImage(tagData._normalTextureSrc);
            tagData.createNormalTexture(image);
        }
    }

    async _loadMetallicRoughnessTexture(tagData: InstanceData) {
        if (this._planet && tagData._metallicRoughnessTextureSrc) {
            const image = await loadImage(tagData._metallicRoughnessTextureSrc);
            tagData.createMetallicRoughnessTexture(image);
        }
    }

    public setQRotArr(tagData: InstanceData, tagDataIndex: number, qRot: Quat) {
        setParametersToArray(tagData._qRotArr, tagDataIndex, 4, 4, qRot.x, qRot.y, qRot.z, qRot.w);
        tagData._changedBuffers[QROT_BUFFER] = true;
        this._updateTag(tagData);
    }

    public setVisibility(tagData: InstanceData, tagDataIndex: number, visibility: boolean) {
        setParametersToArray(tagData._visibleArr, tagDataIndex, 1, 1, visibility ? 1 : 0);
        tagData._changedBuffers[VISIBLE_BUFFER] = true;
        this._updateTag(tagData);
    }

    public setRTCPositionArr(tagData: InstanceData, tagDataIndex: number, rtcPositionHigh: Vec3, rtcPositionLow: Vec3) {
        setParametersToArray(tagData._rtcPositionHighArr, tagDataIndex, 3, 3, rtcPositionHigh.x, rtcPositionHigh.y, rtcPositionHigh.z);
        setParametersToArray(tagData._rtcPositionLowArr, tagDataIndex, 3, 3, rtcPositionLow.x, rtcPositionLow.y, rtcPositionLow.z);
        tagData._changedBuffers[RTC_POSITION_BUFFER] = true;
        this._updateTag(tagData);
    }

    public setRgbaArr(tagData: InstanceData, tagDataIndex: number, rgba: Vec4) {
        setParametersToArray(tagData._rgbaArr, tagDataIndex, 4, 4, rgba.x, rgba.y, rgba.z, rgba.w);
        tagData._changedBuffers[RGBA_BUFFER] = true;
        this._updateTag(tagData);
    }

    public setPickingColorArr(tagData: InstanceData, tagDataIndex: number, color: Vec3) {
        setParametersToArray(tagData._pickingColorArr, tagDataIndex, 3, 3, color.x / 255, color.y / 255, color.z / 255);
        tagData._changedBuffers[PICKINGCOLOR_BUFFER] = true;
        this._updateTag(tagData);
    }

    // setTexCoordArr(tagData, tagDataIndex, tcoordArr) {
    //     setParametersToArray(tagData._texCoordArr, tagDataIndex, 2, 2, ...tcoordArr);
    //     tagData._changedBuffers[TEXCOORD_BUFFER] = true;
    //     this._updateTag(tagData);
    // }

    public setScaleArr(tagData: InstanceData, tagDataIndex: number, scale: Vec3) {
        setParametersToArray(tagData._sizeArr, tagDataIndex, 3, 3, scale.x, scale.y, scale.z);
        tagData._changedBuffers[SIZE_BUFFER] = true;
        this._updateTag(tagData);
    }

    public setTranslateArr(tagData: InstanceData, tagDataIndex: number, translate: Vec3) {
        setParametersToArray(tagData._translateArr, tagDataIndex, 3, 3, translate.x, translate.y, translate.z);
        tagData._changedBuffers[TRANSLATE_BUFFER] = true;
        this._updateTag(tagData);
    }

    protected _updateTag(dataTag: InstanceData) {
        if (dataTag.isFree) {
            dataTag.isFree = false;
            this._dataTagUpdateQueue.push(dataTag);
        }
    }

    public update() {

        for (let i = 0, len = this._dataTagUpdateQueue.length; i < len; i++) {
            this._dataTagUpdateQueue[i].update();
        }
        this._dataTagUpdateQueue = [];
    }

    public _removeAll() {
        let i = this._geoObjects.length;
        while (i--) {
            const gi = this._geoObjects[i];

            gi._tagDataIndex = -1;
            gi._tagData = null;

            gi._handlerIndex = -1;
            gi._handler = null;
        }
        this._geoObjects.length = 0;
        this._geoObjects = [];

        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            this._instanceDataMapValues[i].clear();
        }

        this._instanceDataMap.clear();
        this._instanceDataMapValues = [];
    }

    public clear() {
        this._removeAll();
    }

    public getRTCPosition(pos: Vec3, rtcPositionHigh: Vec3, rtcPositionLow: Vec3) {
        let rtcPosition = pos.sub(this._relativeCenter);
        Vec3.doubleToTwoFloats(rtcPosition, rtcPositionHigh, rtcPositionLow);
    }

    public setRelativeCenter(c: Vec3) {
        this._relativeCenter.copy(c);
        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            let instanceData = this._instanceDataMapValues[i];
            let geoObjects = instanceData.geoObjects;
            for (let j = 0; j < geoObjects.length; j++) {
                geoObjects[j].updateRTCPosition();
            }
        }
    }

    protected _updateRTCEyePosition() {
        let r = this._planet!.renderer!;
        if (r.activeCamera.isFirstPass) {
            let rtcEyePosition = r.activeCamera.eye.sub(this._relativeCenter);
            Vec3.doubleToTwoFloat32Array(rtcEyePosition, this._rtcEyePositionHigh, this._rtcEyePositionLow);
        }
    }

    public draw() {
        if (this._geoObjects.length) {
            this._updateRTCEyePosition();
            this.update();
            this._displayOpaquePASS();
        }
    }

    public drawTransparent() {
        if (this._geoObjects.length) {
            this._displayTransparentPASS();
        }
    }

    public add(geoObject: GeoObject) {

        if (geoObject._handlerIndex === -1) {

            geoObject._handler = this;
            geoObject._handlerIndex = this._geoObjects.length;

            this._geoObjects.push(geoObject);
            this._addGeoObjectToArray(geoObject);

            geoObject.updateRotation();

            geoObject._tagData!.refresh();

            this._updateTag(geoObject._tagData!);
            geoObject.setObjectSrc(geoObject._objectSrc!);
        }
    }

    public remove(geoObject: GeoObject) {
        if (geoObject._handler && this.__id == geoObject._handler.__id) {
            this._removeGeoObject(geoObject);
        }
    }

    public _clearDataTagQueue() {
        this._dataTagUpdateQueue = [];
    }


    public _removeGeoObject(geoObject: GeoObject) {

        let tagData = geoObject._tagData!;
        let tag = geoObject.tag;

        tagData.numInstances--;

        let isEmpty = false;
        // dataTag becomes empty, remove it from the rendering
        if (tagData.numInstances === 0) {
            tagData.clear();
            this._instanceDataMap.delete(tag);
            this._instanceDataMapValues = [];
            this._clearDataTagQueue();
            isEmpty = true;
        }

        this._geoObjects.splice(geoObject._handlerIndex, 1);
        for (let i = geoObject._handlerIndex, len = this._geoObjects.length; i < len; i++) {
            let gi = this._geoObjects[i];
            gi._handlerIndex = gi._handlerIndex - 1;
        }

        let tdi = geoObject._tagDataIndex;
        tagData.geoObjects.splice(tdi, 1);

        for (let i = geoObject._tagDataIndex, len = tagData.geoObjects.length; i < len; i++) {
            let gi = tagData.geoObjects[i];
            gi._tagDataIndex = gi._tagDataIndex - 1;
        }

        tagData._rgbaArr = spliceArray(tagData._rgbaArr, tdi * 4, 4);
        tagData._rtcPositionHighArr = spliceArray(tagData._rtcPositionHighArr, tdi * 3, 3);
        tagData._rtcPositionLowArr = spliceArray(tagData._rtcPositionLowArr, tdi * 3, 3);
        tagData._qRotArr = spliceArray(tagData._qRotArr, tdi * 4, 4);
        tagData._pickingColorArr = spliceArray(tagData._pickingColorArr, tdi * 3, 3);
        tagData._sizeArr = spliceArray(tagData._sizeArr, tdi * 3, 3);
        tagData._translateArr = spliceArray(tagData._translateArr, tdi * 3, 3);
        tagData._visibleArr = spliceArray(tagData._visibleArr, tdi, 1);

        geoObject._handlerIndex = -1;
        geoObject._handler = null;

        geoObject._tagDataIndex = -1;
        geoObject._tagData = null;

        if (!isEmpty) {
            tagData.refresh();
            this._updateTag(tagData);
        }
    }
}

export {GeoObjectHandler, InstanceData};
