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
const INDEX_BUFFER = 4;
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
        this._textureSrc = null;

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
        this._buffersUpdateCallbacks[INDEX_BUFFER] = this.createIndicesBuffer;
        this._buffersUpdateCallbacks[VERTEX_BUFFER] = this.createVertexBuffer;
        this._buffersUpdateCallbacks[SIZE_BUFFER] = this.createSizeBuffer;
        this._buffersUpdateCallbacks[PITCH_ROLL_BUFFER] = this.createPitchRollBuffer;
        this._buffersUpdateCallbacks[VISIBLE_BUFFER] = this.createVisibleBuffer;
        this._buffersUpdateCallbacks[TEXCOORD_BUFFER] = this.createTexCoordBuffer;

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
    }

    createTexture(image) {
        if (this._geoObjectHandler && this._geoObjectHandler._planet) {
            this._texture = this._geoObjectHandler._planet.renderer.handler.createTextureDefault(image);
        }
    }

    clear() {

        this.numInstances = 0;

        this.geoObjects = [];

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

        let h = this._geoObjectHandler._planet.renderer.handler, gl = h.gl;

        h.deleteTexture(this._texture);

        this._texture = null;

        gl.deleteBuffer(this._pitchRollBuffer);
        gl.deleteBuffer(this._sizeBuffer);
        gl.deleteBuffer(this._vertexBuffer);
        gl.deleteBuffer(this._positionHighBuffer);
        gl.deleteBuffer(this._positionLowBuffer);
        gl.deleteBuffer(this._directionBuffer);
        gl.deleteBuffer(this._rgbaBuffer);
        gl.deleteBuffer(this._normalsBuffer);
        gl.deleteBuffer(this._indicesBuffer);
        gl.deleteBuffer(this._pickingColorBuffer);
        gl.deleteBuffer(this._visibleBuffer);
        gl.deleteBuffer(this._texCoordBuffer);

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

        this.isFree = false;
        this._geoObjectHandler = null;
    }

    createVertexBuffer() {
        const h = this._geoObjectHandler._planet.renderer.handler;
        h.gl.deleteBuffer(this._vertexBuffer);
        this._vertexArr = makeArrayTyped(this._vertexArr);
        this._vertexBuffer = h.createArrayBuffer(this._vertexArr, 3, this._vertexArr.length / 3);
    }

    createPitchRollBuffer() {
        let h = this._geoObjectHandler._planet.renderer.handler, numItems = this._pitchRollArr.length / 2;

        if (!this._pitchRollBuffer || this._pitchRollBuffer.numItems !== numItems) {
            h.gl.deleteBuffer(this._pitchRollBuffer);
            this._pitchRollBuffer = h.createStreamArrayBuffer(2, numItems);
        }

        this._pitchRollArr = makeArrayTyped(this._pitchRollArr);

        h.setStreamArrayBuffer(this._pitchRollBuffer, this._pitchRollArr);
    }

    createVisibleBuffer() {
        const h = this._geoObjectHandler._planet.renderer.handler, numItems = this._visibleArr.length;

        if (!this._visibleBuffer || this._visibleBuffer.numItems !== numItems) {
            h.gl.deleteBuffer(this._visibleBuffer);
            this._visibleBuffer = h.createStreamArrayBuffer(1, numItems);
        }

        this._visibleArr = makeArrayTyped(this._visibleArr);

        h.setStreamArrayBuffer(this._visibleBuffer, this._visibleArr);
    }

    createSizeBuffer() {
        let h = this._geoObjectHandler._planet.renderer.handler, numItems = this._sizeArr.length;

        if (!this._sizeBuffer || this._sizeBuffer.numItems !== numItems) {
            h.gl.deleteBuffer(this._sizeBuffer);
            this._sizeBuffer = h.createStreamArrayBuffer(1, numItems);
        }

        this._sizeArr = makeArrayTyped(this._sizeArr);

        h.setStreamArrayBuffer(this._sizeBuffer, this._sizeArr);
    }

    createTexCoordBuffer() {
        const h = this._geoObjectHandler._planet.renderer.handler;
        h.gl.deleteBuffer(this._texCoordBuffer);
        this._texCoordArr = makeArrayTyped(this._texCoordArr);
        this._texCoordBuffer = h.createArrayBuffer(this._texCoordArr, 2, this._texCoordArr.length / 2);
    }

    createPositionBuffer() {
        let h = this._geoObjectHandler._planet.renderer.handler, numItems = this._positionHighArr.length / 3;

        if (!this._positionHighBuffer || this._positionHighBuffer.numItems !== numItems) {
            h.gl.deleteBuffer(this._positionHighBuffer);
            h.gl.deleteBuffer(this._positionLowBuffer);
            this._positionHighBuffer = h.createStreamArrayBuffer(3, numItems);
            this._positionLowBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._positionHighArr = makeArrayTyped(this._positionHighArr);
        this._positionLowArr = makeArrayTyped(this._positionLowArr);

        h.setStreamArrayBuffer(this._positionHighBuffer, this._positionHighArr);
        h.setStreamArrayBuffer(this._positionLowBuffer, this._positionLowArr);
    }

    createRgbaBuffer() {
        let h = this._geoObjectHandler._planet.renderer.handler, numItems = this._rgbaArr.length / 4;

        if (!this._rgbaBuffer || this._rgbaBuffer.numItems !== numItems) {
            h.gl.deleteBuffer(this._rgbaBuffer);
            this._rgbaBuffer = h.createStreamArrayBuffer(4, numItems);
        }

        this._rgbaArr = makeArrayTyped(this._rgbaArr);

        h.setStreamArrayBuffer(this._rgbaBuffer, this._rgbaArr);
    }

    createDirectionBuffer() {
        let h = this._geoObjectHandler._planet.renderer.handler, numItems = this._directionArr.length / 3;

        if (!this._directionBuffer || this._directionBuffer.numItems !== numItems) {
            h.gl.deleteBuffer(this._directionBuffer);
            this._directionBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        this._directionArr = makeArrayTyped(this._directionArr);

        h.setStreamArrayBuffer(this._directionBuffer, this._directionArr);
    }

    createNormalsBuffer() {
        const h = this._geoObjectHandler._planet.renderer.handler;
        h.gl.deleteBuffer(this._normalsBuffer);
        this._normalsArr = makeArrayTyped(this._normalsArr);
        this._normalsBuffer = h.createArrayBuffer(this._normalsArr, 3, this._normalsArr.length / 3);
    }

    createIndicesBuffer() {
        const h = this._geoObjectHandler._planet.renderer.handler;
        h.gl.deleteBuffer(this._indicesBuffer);
        this._indicesArr = makeArrayTyped(this._indicesArr, Uint16Array);
        this._indicesBuffer = h.createElementArrayBuffer(this._indicesArr, 1, this._indicesArr.length);
    }

    createPickingColorBuffer() {
        const h = this._geoObjectHandler._planet.renderer.handler;
        h.gl.deleteBuffer(this._pickingColorBuffer);
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
    constructor(entityCollection) {

        this.__staticId = GeoObjectHandler._staticCounter++;

        /**
         * Picking rendering option.
         * @public
         * @type {boolean}
         */
        this.pickingEnabled = true;

        this._entityCollection = entityCollection;

        this._planet = null;

        this._geoObjects = [];

        this._instanceDataMap = new Map();
        this._instanceDataMapValues = [];


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
        if (this._planet && this._planet.renderer) {
            if (!this._planet.renderer.handler.programs.geo_object) {
                this._planet.renderer.handler.addProgram(shaders.geo_object());
            }
            if (!this._planet.renderer.handler.programs.geo_object_picking) {
                this._planet.renderer.handler.addProgram(shaders.geo_object_picking());
            }
        }
    }

    setRenderNode(renderNode) {
        this._planet = renderNode;
        this.initProgram();

        //
        // in case of lazy initialization loading data here
        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            this._loadDataTagTexture(this._instanceDataMapValues[i]);
        }
    }

    _addGeoObjectToArray(geoObject) {
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
            tagData._textureSrc = geoObject.object3d.src;

            this._loadDataTagTexture(tagData);
        }

        geoObject._tagDataIndex = tagData.numInstances++;
        geoObject._tagData = tagData;
        tagData.geoObjects.push(geoObject);

        let itemSize = 3;

        tagData._visibleArr = concatArrays(tagData._visibleArr, setParametersToArray([], 0, 1, 1, geoObject._visibility ? 1 : 0));

        let x = geoObject._positionHigh.x, y = geoObject._positionHigh.y, z = geoObject._positionHigh.z, w;
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

        tagData._sizeArr = concatArrays(tagData._sizeArr, setParametersToArray([], 0, itemSize, itemSize, geoObject._scale));
    }

    _displayPASS() {
        let r = this._planet.renderer, sh = r.handler.programs.geo_object, p = sh._program, u = p.uniforms,
            a = p.attributes, gl = r.handler.gl, ec = this._entityCollection;

        sh.activate();

        //
        // Could be in VAO
        //
        gl.enable(gl.CULL_FACE);
        gl.uniform3fv(u.uScaleByDistance, ec.scaleByDistance);

        gl.uniform3fv(u.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(u.eyePositionLow, r.activeCamera.eyeLow);

        gl.uniformMatrix4fv(u.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniformMatrix4fv(u.viewMatrix, false, r.activeCamera.getViewMatrix());

        gl.uniform3fv(u.lightsPositions, this._planet._lightsPositions);
        gl.uniform3fv(u.lightsParamsv, this._planet._lightsParamsv);
        gl.uniform1fv(u.lightsParamsf, this._planet._lightsParamsf);

        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            let tagData = this._instanceDataMapValues[i];

            //
            //  Instance individual data
            //
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

            //
            // Instance common data(could be in VAO)
            //
            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._positionHighBuffer);
            gl.vertexAttribPointer(a.aPositionHigh, tagData._positionHighBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._positionLowBuffer);
            gl.vertexAttribPointer(a.aPositionLow, tagData._positionLowBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._normalsBuffer);
            gl.vertexAttribPointer(a.aVertexNormal, tagData._normalsBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._vertexBuffer);
            gl.vertexAttribPointer(a.aVertexPosition, tagData._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tagData._texture || r.handler.defaultTexture);
            gl.uniform1i(u.uTexture, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._texCoordBuffer);
            gl.vertexAttribPointer(a.aTexCoord, tagData._texCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);


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
        let r = this._planet.renderer, sh = r.handler.programs.geo_object_picking, p = sh._program, u = p.uniforms,
            a = p.attributes, gl = r.handler.gl, ec = this._entityCollection;

        sh.activate();

        gl.enable(gl.CULL_FACE);
        gl.uniform3fv(u.uScaleByDistance, ec.scaleByDistance);

        gl.uniform1f(u.pickingScale, ec.pickingScale);

        gl.uniform3fv(u.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(u.eyePositionLow, r.activeCamera.eyeLow);

        gl.uniformMatrix4fv(u.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniformMatrix4fv(u.viewMatrix, false, r.activeCamera.getViewMatrix());

        for (let i = 0; i < this._instanceDataMapValues.length; i++) {
            let tagData = this._instanceDataMapValues[i];

            //
            // Instance individual data
            //
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

            //
            // Instance common data(could be in VAO)
            //
            gl.bindBuffer(gl.ARRAY_BUFFER, tagData._vertexBuffer);
            gl.vertexAttribPointer(a.aVertexPosition, tagData._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tagData._indicesBuffer);
            p.drawElementsInstanced(gl.TRIANGLES, tagData._indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0, tagData.numInstances);
        }
        gl.disable(gl.CULL_FACE);
    }

    async _loadDataTagTexture(tagData) {
        if (this._planet && tagData._textureSrc) {
            const image = await loadImage(tagData._textureSrc);
            tagData.createTexture(image);
        }
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

    // setTexCoordArr(tagData, tagDataIndex, tcoordArr) {
    //     setParametersToArray(tagData._texCoordArr, tagDataIndex, 2, 2, ...tcoordArr);
    //     tagData._changedBuffers[TEXCOORD_BUFFER] = true;
    //     this._updateTag(tagData);
    // }

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
            const gi = this._geoObjects[i];

            gi._tagDataIndex = -1;
            gi._tagData = undefined;

            gi._handlerIndex = -1;
            gi._handler = undefined;
        }
        this._geoObjects.length = 0;
        this._geoObjects = [];

        for (let i = 0; this._instanceDataMapValues.length; i++) {
            this._instanceDataMapValues[i].clear();
        }

        this._instanceDataMap.clear();
        this._instanceDataMapValues = [];
    }

    clear() {
        this._removeAll();
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

    _clearDataTagQueue() {
        this._dataTagUpdateQueue = [];
    }


    _removeGeoObject(geoObject) {

        let tagData = geoObject._tagData;
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

        if (!isEmpty) {
            tagData.refresh();
            this._updateTag(tagData);
        }
    }
}

export { GeoObjectHandler };
