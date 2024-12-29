import * as shaders from "../shaders/geoObject";
import {concatArrays, loadImage, spliceArray, TypedArray} from "../utils/shared";
import {EntityCollection} from "./EntityCollection";
import {GeoObject} from "./GeoObject";
import {Vec3} from "../math/Vec3";
import {Vec4} from "../math/Vec4";
import {Quat} from "../math/Quat";
import {Object3d} from "../Object3d";
import {InstanceData} from "./InstanceData";
import {Renderer} from "../renderer/Renderer";
import {RenderNode} from "../scene/RenderNode";

//@todo: enums, i know...nah...
export const VERTEX_BUFFER = 0;
export const RTC_POSITION_BUFFER = 1;
export const RGBA_BUFFER = 2;
export const NORMALS_BUFFER = 3;
export const INDEX_BUFFER = 4;
export const QROT_BUFFER = 5;
export const SIZE_BUFFER = 6;
export const PICKINGCOLOR_BUFFER = 7;
export const VISIBLE_BUFFER = 8;
export const TEXCOORD_BUFFER = 9;
export const TRANSLATE_BUFFER = 10;

function setParametersToArray(arr: number[] | TypedArray, index: number = 0, length: number = 0, itemSize: number = 1, ...params: number[]): number[] | TypedArray {
    const currIndex = index * length;
    for (let i = currIndex, len = currIndex + length; i < len; i++) {
        arr[i] = params[i % itemSize];
    }
    return arr;
}

export class GeoObjectHandler {
    static __counter__ = 0;

    protected __id: number;

    /**
     * Picking rendering option.
     * @public
     * @type {boolean}
     */
    public pickingEnabled: boolean;

    protected _entityCollection: EntityCollection;

    public _renderNode: RenderNode | null;
    public _renderer: Renderer | null;

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

        this._renderNode = null;
        this._renderer = null;

        this._geoObjects = [];

        this._instanceDataMap = new Map<string, InstanceData>();
        this._instanceDataMapValues = [];

        this._dataTagUpdateQueue = [];

        this._relativeCenter = new Vec3();

        this._rtcEyePositionHigh = new Float32Array([0, 0, 0]);
        this._rtcEyePositionLow = new Float32Array([0, 0, 0]);
    }

    public initProgram() {
        if (this._renderer) {
            if (!this._renderer.handler.programs.geo_object) {
                this._renderer.handler.addProgram(shaders.geo_object());
            }
            if (!this._renderer.handler.programs.geo_object_picking) {
                this._renderer.handler.addProgram(shaders.geo_object_picking());
            }
            if (!this._renderer.handler.programs.geo_object_depth) {
                this._renderer.handler.addProgram(shaders.geo_object_depth());
            }
        }
    }

    public setRenderNode(renderNode: RenderNode) {

        this._renderNode = renderNode;

        this._renderer = renderNode.renderer;

        this.initProgram();

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

        let r = this._renderer!,
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
        gl.uniform3fv(u.sunPosition, this._renderNode!._lightPosition);

    }

    public _displayOpaquePASS() {

        let r = this._renderer!,
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
        let r = this._renderer!,
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
        let r = this._renderer!,
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
        let r = this._renderer!,
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
        if (this._renderer && tagData._colorTextureSrc) {
            const image = await loadImage(tagData._colorTextureSrc);
            tagData.createColorTexture(image);
        }
    }

    async _loadNormalTexture(tagData: InstanceData) {
        if (this._renderer && tagData._normalTextureSrc) {
            const image = await loadImage(tagData._normalTextureSrc);
            tagData.createNormalTexture(image);
        }
    }

    async _loadMetallicRoughnessTexture(tagData: InstanceData) {
        if (this._renderer && tagData._metallicRoughnessTextureSrc) {
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
        let r = this._renderer!;
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
