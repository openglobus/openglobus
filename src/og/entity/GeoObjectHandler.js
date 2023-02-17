"use strict";

/**
 * @module og/entity/ShapeHandler
 */
import * as shaders from "../shaders/geoObject.js";
import { concatArrays, loadImage, makeArrayTyped, spliceArray } from "../utils/shared.js";

const VERTEX_BUFFER = 0;
const POSITION_BUFFER = 1;
const RGBA_BUFFER = 2;
const NORMALS_BUFFER = 3;
const INDECIES_BUFFER = 4;
const DIRECTION_BUFFER = 5;
const PITCH_ROLL_BUFFER = 6;
const SIZE_BUFFER = 7;
const PICKINGCOLOR_BUFFER = 8;
const VISIBLE_BUFFER = 9;
const TEXCOORD_BUFFER = 10;

const setParametersToArray = (arr = [], index = 0, length, itemSize, ...params) => {
    const currIndex = index * length;
    for (let i = currIndex, len = currIndex + length; i < len; i++) {
        arr[i] = params[i % itemSize];
    }
    return arr;
};

const setParametersToArrayArr = (arr = [], index = 0, length, itemSize, paramsArr) => {
    const currIndex = index * length;
    for (let i = currIndex, len = currIndex + length; i < len; i++) {
        arr[i] = paramsArr[i % itemSize];
    }
    return arr;
};

class InstanceData {
    constructor(geoObjectHandler) {

        this.isFree = true;

        this._geoObjectHandler = geoObjectHandler;

        this.geoObjects = [];

        this.numInstances = 0;

        this._texture = null;

        this._pitchRollArr = [];
        this._sizeArr = [];
        this._vertexArr = [];
        this._positionHighArr = [];
        this._positionLowArr = [];
        this._directionArr = [];
        this._rgbaArr = [];
        this._normalsArr = [];
        this._indicesArr = [];
        this._pickingColorArr = [];
        this._visibleArr = [];
        this._texCoordArr = [];

        this._pitchRollBuffer = null;
        this._sizeBuffer = null;
        this._vertexBuffer = null;
        this._positionHighBuffer = null;
        this._positionLowBuffer = null;
        this._directionBuffer = null;
        this._rgbaBuffer = null;
        this._normalsBuffer = null;
        this._indicesBuffer = null;
        this._pickingColorBuffer = null;
        this._visibleBuffer = null;
        this._texCoordBuffer = null;

        this._buffersUpdateCallbacks = [];
        this._buffersUpdateCallbacks[PICKINGCOLOR_BUFFER] = this.createPickingColorBuffer;
        this._buffersUpdateCallbacks[POSITION_BUFFER] = this.createPositionBuffer;
        this._buffersUpdateCallbacks[DIRECTION_BUFFER] = this.createDirectionBuffer;
        this._buffersUpdateCallbacks[NORMALS_BUFFER] = this.createNormalsBuffer;
        this._buffersUpdateCallbacks[RGBA_BUFFER] = this.createRgbaBuffer;
        this._buffersUpdateCallbacks[INDECIES_BUFFER] = this.createIndicesBuffer;
        this._buffersUpdateCallbacks[VERTEX_BUFFER] = this.createVertexBuffer;
        this._buffersUpdateCallbacks[SIZE_BUFFER] = this.createSizeBuffer;
        this._buffersUpdateCallbacks[PITCH_ROLL_BUFFER] = this.createPitchRollBuffer;
        this._buffersUpdateCallbacks[VISIBLE_BUFFER] = this.createVisibleBuffer;
        this._buffersUpdateCallbacks[TEXCOORD_BUFFER] = this.createTexCoordBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
    }

    createVertexBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._vertexBuffer && h.gl.deleteBuffer(this._vertexBuffer);
        this._vertexArr = makeArrayTyped(this._vertexArr);
        this._vertexBuffer = h.createArrayBuffer(this._vertexArr, 3, this._vertexArr.length / 3);
    }

    createPitchRollBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._pitchRollBuffer && h.gl.deleteBuffer(this._pitchRollBuffer);
        this._pitchRollArr = makeArrayTyped(this._pitchRollArr);
        this._pitchRollBuffer = h.createArrayBuffer(this._pitchRollArr, 2, this._pitchRollArr.length / 2);
    }

    createVisibleBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._visibleBuffer && h.gl.deleteBuffer(this._visibleBuffer);
        this._visibleArr = makeArrayTyped(this._visibleArr);
        this._visibleBuffer = h.createArrayBuffer(this._visibleArr, 1, this._visibleArr.length);
    }

    createSizeBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._sizeBuffer && h.gl.deleteBuffer(this._sizeBuffer);
        this._sizeArr = makeArrayTyped(this._sizeArr);
        this._sizeBuffer = h.createArrayBuffer(this._sizeArr, 1, this._sizeArr.length);
    }

    createTexCoordBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._texCoordBuffer && h.gl.deleteBuffer(this._texCoordBuffer);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._texCoordBuffer = h.createArrayBuffer(this._texCoordArr, 2, this._texCoordArr.length / 2);
    }

    createPositionBuffer() {
        let h = this._geoObjectHandler._renderer.handler;
        h.gl.deleteBuffer(this._positionHighBuffer);
        h.gl.deleteBuffer(this._positionLowBuffer);

        this._positionHighArr = makeArrayTyped(this._positionHighArr);
        this._positionHighBuffer = h.createArrayBuffer(this._positionHighArr, 3, this._positionHighArr.length / 3);

        this._positionLowArr = makeArrayTyped(this._positionLowArr);
        this._positionLowBuffer = h.createArrayBuffer(this._positionLowArr, 3, this._positionLowArr.length / 3);
    }

    createRgbaBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._rgbaBuffer && h.gl.deleteBuffer(this._rgbaBuffer);
        this._rgbaArr = makeArrayTyped(this._rgbaArr);
        this._rgbaBuffer = h.createArrayBuffer(this._rgbaArr, 4, this._rgbaArr.length / 4);
    }

    createDirectionBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._directionBuffer && h.gl.deleteBuffer(this._directionBuffer);
        this._directionArr = makeArrayTyped(this._directionArr);
        this._directionBuffer = h.createArrayBuffer(this._directionArr, 3, this._directionArr.length / 3);
    }

    createNormalsBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._normalsBuffer && h.gl.deleteBuffer(this._normalsBuffer);
        this._normalsArr = makeArrayTyped(this._normalsArr);
        this._normalsBuffer = h.createArrayBuffer(this._normalsArr, 3, this._normalsArr.length / 3);
    }

    createIndicesBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._indicesBuffer && h.gl.deleteBuffer(this._indicesBuffer);
        this._indicesArr = makeArrayTyped(this._indicesArr, Uint16Array);
        this._indicesBuffer = h.createElementArrayBuffer(this._indicesArr, 1, this._indicesArr.length);
    }

    createPickingColorBuffer() {
        const h = this._geoObjectHandler._renderer.handler;
        this._pickingColorBuffer && h.gl.deleteBuffer(this._pickingColorBuffer);
        this._pickingColorArr = makeArrayTyped(this._pickingColorArr);
        this._pickingColorBuffer = h.createArrayBuffer(this._pickingColorArr, 3, this._pickingColorArr.length / 3);
    }

    refresh() {
        let i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    update() {
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

class GeoObjectHandler {
    constructor(entityCollection) {

        this.__staticId = GeoObjectHandler._staticCounter++;

        /**
         * Picking rendering option.
         * @public
         * @type {boolean}
         */
        this.pickingEnabled = true;

        this._entityCollection = entityCollection;
        this._renderer = undefined;
        this._planet = undefined;

        this._geoObjects = [];

        this._instanceDataMap = new Map();

        this._dataTagUpdateQueue = [];
    }

    //Create buffers

    static get _staticCounter() {
        if (!this._counter && this._counter !== 0) {
            this._counter = 0;
        }
        return this._counter;
    }

    static set _staticCounter(n) {
        this._counter = n;
    }

    initProgram() {
        if (this._renderer.handler) {
            if (!this._renderer.handler.programs.geo_object) {
                this._renderer.handler.addProgram(shaders.geo_object());
            }
            if (!this._renderer.handler.programs.geo_object_picking) {
                this._renderer.handler.addProgram(shaders.geo_object_picking());
            }
        }
    }

    setRenderNode(renderNode) {
        this._renderer = renderNode.renderer;
        this._planet = renderNode;
        this.initProgram();
    }

    setRenderer(planet) {
        super.setRenderer(planet);
    }

    _addGeoObjectToArray(geoObject) {
        const tag = geoObject.tag;

        let tagData = this._instanceDataMap.get(tag);

        if (!tagData) {
            tagData = new InstanceData(this);
            this._instanceDataMap.set(tag, tagData);

            tagData._vertexArr = geoObject.vertices
            tagData._normalsArr = geoObject.normals;
            tagData._indicesArr = geoObject.indexes;
            tagData._texCoordArr = geoObject.texCoords;

            this._applyTexture(geoObject, tagData);
        }

        geoObject._tagDataIndex = tagData.numInstances++;
        geoObject._tagData = tagData;
        tagData.geoObjects.push(geoObject);

        let itemSize = 3;

        tagData._visibleArr = concatArrays(tagData._visibleArr, setParametersToArray([], 0, 1, 1, geoObject._visibility ? 1 : 0));

        let x = geoObject._positionHigh.x,
            y = geoObject._positionHigh.y,
            z = geoObject._positionHigh.z,
            w;
        tagData._positionHighArr = concatArrays(tagData._positionHighArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z));

        x = geoObject._positionLow.x;
        y = geoObject._positionLow.y;
        z = geoObject._positionLow.z;
        tagData._positionLowArr = concatArrays(tagData._positionLowArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z));

        x = geoObject._entity._pickingColor.x / 255;
        y = geoObject._entity._pickingColor.y / 255;
        z = geoObject._entity._pickingColor.z / 255;
        tagData._pickingColorArr = concatArrays(tagData._pickingColorArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z));

        x = geoObject._direction.x;
        y = geoObject._direction.y;
        z = geoObject._direction.z;
        tagData._directionArr = concatArrays(tagData._directionArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z));

        itemSize = 4;

        x = geoObject._color.x;
        y = geoObject._color.y;
        z = geoObject._color.z;
        w = geoObject._color.w;
        tagData._rgbaArr = concatArrays(tagData._rgbaArr, setParametersToArray([], 0, itemSize, itemSize, x, y, z, w));

        itemSize = 2;

        x = geoObject._pitch;
        y = geoObject._roll;
        tagData._pitchRollArr = concatArrays(tagData._pitchRollArr, setParametersToArray([], 0, itemSize, itemSize, x, y));

        itemSize = 1;

        tagData._sizeArr = concatArrays(tagData._sizeArr, setParametersToArray([], 0, itemSize, itemSize, geoObject.scale));
    }

    _displayPASS() {
        let r = this._renderer,
            sh = r.handler.programs.geo_object,
            p = sh._program,
            u = p.uniforms,
            a = p.attributes,
            gl = r.handler.gl,
            ec = this._entityCollection;

        sh.activate();

        gl.enable(gl.CULL_FACE);
        gl.uniform3fv(u.uScaleByDistance, ec.scaleByDistance);

        gl.uniform3fv(u.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(u.eyePositionLow, r.activeCamera.eyeLow);

        gl.uniformMatrix4fv(u.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniformMatrix4fv(u.viewMatrix, false, r.activeCamera.getViewMatrix());

        gl.uniform3fv(u.lightsPositions, this._planet._lightsPositions);
        gl.uniform3fv(u.lightsParamsv, this._planet._lightsParamsv);
        gl.uniform1fv(u.lightsParamsf, this._planet._lightsParamsf);

        for (const tagData of this._instanceDataMap.values()) {

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._normalsBuffer);
            gl.vertexAttribPointer(a.aVertexNormal, tagData._normalsBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._vertexBuffer);
            gl.vertexAttribPointer(a.aVertexPosition, tagData._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tagData._texture || r.handler.defaultTexture);
            gl.uniform1i(u.uTexture, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._texCoordBuffer);
            gl.vertexAttribPointer(a.aTexCoord, tagData._texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._directionBuffer);
            gl.vertexAttribPointer(a.aDirection, tagData._directionBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._sizeBuffer);
            gl.vertexAttribPointer(a.aScale, tagData._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._pitchRollBuffer);
            gl.vertexAttribPointer(a.aPitchRoll, tagData._pitchRollBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._rgbaBuffer);
            gl.vertexAttribPointer(a.aColor, tagData._rgbaBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._visibleBuffer);
            gl.vertexAttribPointer(a.aDispose, tagData._visibleBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.uniform1f(u.uUseTexture, tagData._texture ? 1 : 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._positionHighBuffer);
            gl.vertexAttribPointer(a.aPositionHigh, tagData._positionHighBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._positionLowBuffer);
            gl.vertexAttribPointer(a.aPositionLow, tagData._positionLowBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tagData._indicesBuffer);
            p.drawElementsInstanced(gl.TRIANGLES, tagData._indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0, tagData.numInstances);
        }
        gl.disable(gl.CULL_FACE);
    }

    drawPicking() {
        if (this._geoObjects.length && this.pickingEnabled) {
            this._pickingPASS();
        }
    }

    _pickingPASS() {
        let r = this._renderer,
            sh = r.handler.programs.geo_object_picking,
            p = sh._program,
            u = p.uniforms,
            a = p.attributes,
            gl = r.handler.gl,
            ec = this._entityCollection;

        sh.activate();

        gl.enable(gl.CULL_FACE);
        gl.uniform3fv(u.uScaleByDistance, ec.scaleByDistance);

        gl.uniform1f(u.pickingScale, ec.pickingScale);

        gl.uniform3fv(u.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(u.eyePositionLow, r.activeCamera.eyeLow);

        gl.uniformMatrix4fv(u.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniformMatrix4fv(u.viewMatrix, false, r.activeCamera.getViewMatrix());

        for (const tagData of this._instanceDataMap.values()) {

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._vertexBuffer);
            gl.vertexAttribPointer(a.aVertexPosition, tagData._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._directionBuffer);
            gl.vertexAttribPointer(a.aDirection, tagData._directionBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._sizeBuffer);
            gl.vertexAttribPointer(a.aScale, tagData._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._pitchRollBuffer);
            gl.vertexAttribPointer(a.aPitchRoll, tagData._pitchRollBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._pickingColorBuffer);
            gl.vertexAttribPointer(a.aPickingColor, tagData._pickingColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._positionHighBuffer);
            gl.vertexAttribPointer(a.aPositionHigh, tagData._positionHighBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._positionLowBuffer);
            gl.vertexAttribPointer(a.aPositionLow, tagData._positionLowBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._visibleBuffer);
            gl.vertexAttribPointer(a.aDispose, tagData._visibleBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tagData._indicesBuffer);
            p.drawElementsInstanced(gl.TRIANGLES, tagData._indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0, tagData.numInstances);
        }
        gl.disable(gl.CULL_FACE);
    }

    async _applyTexture(geoObject, tagData) {
        const src = geoObject._src;
        if (src) {
            const image = await loadImage(src);
            tagData._texture = this._renderer.handler.createTextureDefault(image);
        }
        // else {
        //     tagData._texture = this._renderer.handler.defaultTexture;
        // }
        tagData._changedBuffers[TEXCOORD_BUFFER] = true;
        this._updateTag(tagData);
    }

    setDirectionArr(tagData, tagDataIndex, direction) {
        setParametersToArray(tagData._directionArr, tagDataIndex, 3, 3, direction.x, direction.y, direction.z);
        tagData._changedBuffers[DIRECTION_BUFFER] = true;
        this._updateTag(tagData);
    }

    setVisibility(tagData, tagDataIndex, visibility) {
        setParametersToArray(tagData._visibleArr, tagDataIndex, 1, 1, visibility ? 1 : 0);
        tagData._changedBuffers[VISIBLE_BUFFER] = true;
        this._updateTag(tagData);
    }

    setPositionArr(tagData, tagDataIndex, positionHigh, positionLow) {
        setParametersToArray(tagData._positionHighArr, tagDataIndex, 3, 3, positionHigh.x, positionHigh.y, positionHigh.z);
        setParametersToArray(tagData._positionLowArr, tagDataIndex, 3, 3, positionLow.x, positionLow.y, positionLow.z);
        tagData._changedBuffers[POSITION_BUFFER] = true;
        this._updateTag(tagData);
    }

    setRgbaArr(tagData, tagDataIndex, rgba) {
        setParametersToArray(tagData._rgbaArr, tagDataIndex, 4, 4, rgba.x, rgba.y, rgba.z, rgba.w);
        tagData._changedBuffers[RGBA_BUFFER] = true;
        this._updateTag(tagData);
    }

    setPickingColorArr(tagData, tagDataIndex, color) {
        setParametersToArray(tagData._pickingColorArr, tagDataIndex, 3, 3, color.x / 255, color.y / 255, color.z / 255);
        tagData._changedBuffers[PICKINGCOLOR_BUFFER] = true;
        this._updateTag(tagData);
    }

    setTexCoordArr(tagData, tagDataIndex, tcoordArr) {
        //TODO: doesnt work
        //setParametersToArray(tagData._texCoordArr, tagDataIndex, 2, 2, ...tcoordArr);
        tagData._changedBuffers[TEXCOORD_BUFFER] = true;
        this._updateTag(tagData);
    }

    setPitchRollArr(tagData, tagDataIndex, pitch, roll) {
        setParametersToArray(tagData._pitchRollArr, tagDataIndex, 2, 2, pitch, roll);
        tagData._changedBuffers[PITCH_ROLL_BUFFER] = true;
        this._updateTag(tagData);
    }

    setScaleArr(tagData, tagDataIndex, scale) {
        setParametersToArray(tagData._sizeArr, tagDataIndex, 1, 1, scale);
        tagData._changedBuffers[SIZE_BUFFER] = true;
        this._updateTag(tagData);
    }

    refresh() {
        let i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    _updateTag(dataTag) {
        if (dataTag.isFree) {
            dataTag.isFree = false;
            this._dataTagUpdateQueue.push(dataTag);
        }
    }

    update() {
        for (let i = 0, len = this._dataTagUpdateQueue.length; i < len; i++) {
            this._dataTagUpdateQueue[i].update();
        }
        this._dataTagUpdateQueue = [];
    }

    _removeAll() {
        let i = this._geoObjects.length;
        while (i--) {

            const bi = this._geoObjects[i];

            bi._tagDataIndex = -1;
            bi._tagData = undefined;

            bi._handlerIndex = -1;
            bi._handler = undefined;
        }
        this._geoObjects.length = 0;
        this._geoObjects = [];
    }

    clear() {
        this._removeAll();
        this._deleteBuffers();
        this.refresh();
    }

    _deleteBuffers() {

    }

    draw() {
        if (this._geoObjects.length) {
            this.update();
            this._displayPASS();
        }
    }

    add(geoObject) {
        if (geoObject._handlerIndex === -1) {
            geoObject._handler = this;
            geoObject._handlerIndex = this._geoObjects.length;
            this._geoObjects.push(geoObject);
            this._addGeoObjectToArray(geoObject);
            geoObject._tagData.refresh();
            this._updateTag(geoObject._tagData);
        }
    }

    remove(geoObject) {
        if (geoObject._handler && this.__staticId == geoObject._handler.__staticId) {
            this._removeGeoObject(geoObject);
        }
    }

    _removeGeoObject(geoObject) {

        let tagData = geoObject._tagData;
        let tag = geoObject.tag;

        tagData.numInstances--;

        if (tagData.numInstances === 0) {
            //
            //TODO: tagData mem clear
            //
            this._instanceDataMap.delete(tag);
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
        tagData._positionHighArr = spliceArray(tagData._positionHighArr, tdi * 3, 3);
        tagData._positionLowArr = spliceArray(tagData._positionLowArr, tdi * 3, 3);
        tagData._directionArr = spliceArray(tagData._directionArr, tdi * 3, 3);
        tagData._pickingColorArr = spliceArray(tagData._pickingColorArr, tdi * 3, 3);
        tagData._pitchRollArr = spliceArray(tagData._pitchRollArr, tdi * 2, 2);
        tagData._sizeArr = spliceArray(tagData._sizeArr, tdi, 1);
        tagData._visibleArr = spliceArray(tagData._visibleArr, tdi, 1);

        geoObject._handlerIndex = -1;
        geoObject._handler = undefined;

        geoObject._tagDataIndex = -1;
        geoObject._tagData = undefined;

        tagData.refresh();
        this._updateTag(tagData);
    }
}

export { GeoObjectHandler };
