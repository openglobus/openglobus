"use strict";

/**
 * @module og/entity/ShapeHandler
 */
import * as shaders from "../shaders/geoObject.js";
import { concatTypedArrays, spliceTypedArray } from "../utils/shared.js";

const VERTEX_BUFFER = 0,
    POSITION_BUFFER = 1,
    RGBA_BUFFER = 2,
    NORMALS_BUFFER = 3,
    INDECIES_BUFFER = 4,
    DIRECTION_BUFFER = 5,
    PITCH_ROLL_BUFFER = 6,
    SIZE_BUFFER = 7,
    PICKINGCOLOR_BUFFER = 8;

const setParametersToArray = (arr = [], index = 0, length, itemSize, ...params) => {
    //console.time("a");
    const currIndex = index * length;
    for (let i = currIndex; i < currIndex + length; i++) {
        arr[i] = params[i % itemSize];
    }
    //console.timeEnd("a");
    return arr;
};
// function setParametersToArray() {
//     // console.time("a");
//     const arr = arguments[0] || [],
//         index = arguments[1] || 0,
//         length = arguments[2],
//         itemSize = arguments[3];
//     const currIndex = index * length;
//     for (let i = currIndex; i < currIndex + length; i++) {
//         arr[i] = arguments[(i % itemSize) + 4];
//     }
//     // console.timeEnd("a");
//     return arr;
// }
class GeoObjectHandler {
    constructor(entityCollection) {
        /**
         * Picking rendering option.
         * @public
         * @type {boolean}
         */
        this.pickingEnabled = true;

        this._entityCollection = entityCollection;
        this._renderer = null;
        this._planet = null;

        this._geoObjects = [];
        this._pitchRollArr = new Float32Array();
        this._sizeArr = new Float32Array();
        this._vertexArr = new Float32Array();
        this._positionHighArr = new Float32Array();
        this._positionLowArr = new Float32Array();
        this._directionArr = new Float32Array();
        this._rgbaArr = new Float32Array();
        this._normalsArr = new Float32Array();
        this._indicesArr = new Uint16Array();
        this._pickingColorArr = new Float32Array();

        this.__staticId = GeoObjectHandler._staticCounter++;

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

        this._changedBuffers = new Array(this._buffersUpdateCallbacks.length);
    }

    getObjectByIndex(index) {
        return this._geoObjects[index];
    }

    //Create buffers
    createVertexBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._vertexBuffer);
        this._vertexBuffer = h.createArrayBuffer(this._vertexArr, 3, this._vertexArr.length / 3);
    }

    createPitchRollBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._pitchRollBuffer);
        this._pitchRollBuffer = h.createArrayBuffer(
            this._pitchRollArr,
            2,
            this._pitchRollArr.length / 2
        );
    }

    createSizeBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._sizeBuffer);
        this._sizeBuffer = h.createArrayBuffer(this._sizeArr, 1, this._sizeArr.length);
    }

    // createPositionBuffer() {
    //     let h = this._renderer.handler,
    //         numItems = this._positionHighArr.length / 3;
    //
    //     if (!this._positionHighBuffer || this._positionHighBuffer.numItems !== numItems) {
    //         h.gl.deleteBuffer(this._positionHighBuffer);
    //         h.gl.deleteBuffer(this._positionLowBuffer);
    //         this._positionHighBuffer = h.createStreamArrayBuffer(3, numItems);
    //         this._positionLowBuffer = h.createStreamArrayBuffer(3, numItems);
    //     }
    //
    //     h.setStreamArrayBuffer(this._positionHighBuffer, this._positionHighArr);
    //     h.setStreamArrayBuffer(this._positionLowBuffer, this._positionLowArr);
    // }

    createPositionBuffer() {
        let h = this._renderer.handler;

        h.gl.deleteBuffer(this._positionHighBuffer);
        this._positionHighBuffer = h.createArrayBuffer(
            this._positionHighArr,
            3,
            this._positionHighArr.length / 3
        );
        h.gl.deleteBuffer(this._positionLowBuffer);
        this._positionLowBuffer = h.createArrayBuffer(
            this._positionLowArr,
            3,
            this._positionLowArr.length / 3
        );
    }

    createRgbaBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._rgbaBuffer);
        this._rgbaBuffer = h.createArrayBuffer(this._rgbaArr, 4, this._rgbaArr.length / 4);
    }

    createDirectionBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._directionBuffer);
        this._directionBuffer = h.createArrayBuffer(
            this._directionArr,
            3,
            this._directionArr.length / 3
        );
    }

    createNormalsBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._normalsBuffer);
        this._normalsBuffer = h.createArrayBuffer(this._normalsArr, 3, this._normalsArr.length / 3);
    }

    createIndicesBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._indicesBuffer);
        this._indicesBuffer = h.createElementArrayBuffer(
            new Uint16Array(this._indicesArr),
            1,
            this._indicesArr.length
        );
    }

    createPickingColorBuffer() {
        var h = this._renderer.handler;
        h.gl.deleteBuffer(this._pickingColorBuffer);
        this._pickingColorBuffer = h.createArrayBuffer(
            this._pickingColorArr,
            3,
            this._pickingColorArr.length / 3
        );
    }

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

    _addGeoObjectToArrays(geoObject) {
        // addGeoObjectDataSetter;

        const instanced = geoObject.instanced;
        if (geoObject._visibility) {
            if (instanced) {
                if (!this._vertexArr.length) {
                    this._vertexArr = new Float32Array(geoObject._vertices);
                }
            } else {
                this._vertexArr = concatTypedArrays(this._vertexArr, geoObject._vertices);
            }
        } else {
            this._vertexArr = concatTypedArrays(
                this._vertexArr,
                setParametersToArray([], 0, geoObject._verticesCount * 3, 1, 0)
            );
        }

        let itemSize = 3,
            length = geoObject._verticesCount;

        if (instanced) {
            length = itemSize;
        } else {
            length = geoObject._verticesCount * itemSize;
        }

        var x = geoObject._positionHigh.x,
            y = geoObject._positionHigh.y,
            z = geoObject._positionHigh.z,
            w;

        this._positionHighArr = concatTypedArrays(
            this._positionHighArr,
            setParametersToArray([], 0, length, itemSize, x, y, z)
        );

        x = geoObject._positionLow.x;
        y = geoObject._positionLow.y;
        z = geoObject._positionLow.z;
        this._positionLowArr = concatTypedArrays(
            this._positionLowArr,
            setParametersToArray([], geoObject._handlerIndex, length, itemSize, x, y, z)
        );

        x = geoObject._entity._pickingColor.x / 255;
        y = geoObject._entity._pickingColor.y / 255;
        z = geoObject._entity._pickingColor.z / 255;
        this._pickingColorArr = concatTypedArrays(this._pickingColorArr, [x, y, z]);

        x = geoObject._direction.x;
        y = geoObject._direction.y;
        z = geoObject._direction.z;
        this._directionArr = concatTypedArrays(
            this._directionArr,
            setParametersToArray([], geoObject._handlerIndex, length, itemSize, x, y, z)
        );

        this._normalsArr = concatTypedArrays(
            this._normalsArr,
            setParametersToArray([], 0, length, itemSize, 0.0, 1.0, 0.0)
        );

        itemSize = 4;
        if (instanced) {
            length = itemSize;
        } else {
            length = geoObject._verticesCount * itemSize;
        }

        x = geoObject._color.x;
        y = geoObject._color.y;
        z = geoObject._color.z;
        w = geoObject._color.w;
        this._rgbaArr = concatTypedArrays(
            this._rgbaArr,
            setParametersToArray([], 0, length, itemSize, x, y, z, w)
        );

        geoObject.recalculateIndices();
        this._indicesArr = concatTypedArrays(this._indicesArr, geoObject._indices);

        x = geoObject._pitch;
        y = geoObject._roll;
        itemSize = 2;
        if (instanced) {
            length = itemSize;
        } else {
            length = geoObject._verticesCount * itemSize;
        }
        this._pitchRollArr = concatTypedArrays(
            this._pitchRollArr,
            setParametersToArray([], 0, length, itemSize, x, y)
        );

        itemSize = 1;
        if (instanced) {
            length = itemSize;
        } else {
            length = geoObject._verticesCount * itemSize;
        }
        this._sizeArr = concatTypedArrays(
            this._sizeArr,
            setParametersToArray([], 0, length, itemSize, geoObject.scale)
        );
    }

    _displayPASS() {
        var r = this._renderer;
        var sh = r.handler.programs.geo_object;
        var p = sh._program,
            u = p.uniforms,
            a = p.attributes;
        var gl = r.handler.gl,
            ec = this._entityCollection;

        sh.activate();

        gl.enable(gl.CULL_FACE);
        gl.uniform3fv(u.uScaleByDistance, ec.scaleByDistance);

        gl.uniform3fv(u.eyePositionHigh, r.activeCamera.eyeHigh);
        gl.uniform3fv(u.eyePositionLow, r.activeCamera.eyeLow);

        gl.uniformMatrix4fv(u.projectionMatrix, false, r.activeCamera.getProjectionMatrix());
        gl.uniformMatrix4fv(u.viewMatrix, false, r.activeCamera.getViewMatrix());
        gl.uniformMatrix3fv(u.normalMatrix, false, r.activeCamera._normalMatrix._m);

        gl.uniform4fv(u.lightsPositions, this._planet._lightsTransformedPositions);
        gl.uniform3fv(u.lightsParamsv, this._planet._lightsParamsv);
        gl.uniform1fv(u.lightsParamsf, this._planet._lightsParamsf);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._normalsBuffer);
        gl.vertexAttribPointer(
            a.aVertexNormal,
            this._normalsBuffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(
            a.aVertexPosition,
            this._vertexBuffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._directionBuffer);
        gl.vertexAttribPointer(a.aDirection, this._directionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer);
        gl.vertexAttribPointer(a.aScale, this._sizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._pitchRollBuffer);
        gl.vertexAttribPointer(a.aPitchRoll, this._pitchRollBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer);
        gl.vertexAttribPointer(a.aColor, this._rgbaBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionHighBuffer);
        gl.vertexAttribPointer(
            a.aPositionHigh,
            this._positionHighBuffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionLowBuffer);
        gl.vertexAttribPointer(
            a.aPositionLow,
            this._positionLowBuffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indicesBuffer);

        gl.drawElementsInstanced(
            gl.TRIANGLES,
            this._geoObjects[0]._indicesCount,
            gl.UNSIGNED_SHORT,
            0,
            this._geoObjects.length
        );

        gl.disable(gl.CULL_FACE);
    }

    //todo refactor for support instancing
    setVertexArr(index, vertexArr) {
        // var i = index * 9;
        // var a = this._vertexArr;
        //
        // a[i] = vertexArr[0];
        // a[i + 1] = vertexArr[1];
        // a[i + 2] = vertexArr[2];
        //
        // a[i + 3] = vertexArr[3];
        // a[i + 4] = vertexArr[4];
        // a[i + 5] = vertexArr[5];
        //
        // a[i + 6] = vertexArr[6];
        // a[i + 7] = vertexArr[7];
        // a[i + 8] = vertexArr[8];
        this._vertexArr = [-0.5, 0.0, 0.5, -0.5, 0.0, -0.5, 0.5, 0.0, -0.5, 0.5, 0.0, 0.5];
        this._changedBuffers[VERTEX_BUFFER] = true;
    }

    setDirectionArr(index, direction) {
        const itemSize = 3,
            ob = this.getObjectByIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(
            this._directionArr,
            index,
            length,
            itemSize,
            direction.x,
            direction.y,
            direction.z
        );
        this._changedBuffers[DIRECTION_BUFFER] = true;
    }

    setVisibility(index, visibility) {
        const ob = this.getObjectByIndex(index);
        var vArr;
        if (visibility) {
            vArr = ob._vertices;
        } else {
            vArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
        this.setVertexArr(index, vArr);
    }

    setPositionArr(index, positionHigh, positionLow) {
        const itemSize = 3,
            ob = this.getObjectByIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(
            this._positionHighArr,
            index,
            length,
            itemSize,
            positionHigh.x,
            positionHigh.y,
            positionHigh.z
        );

        // Low
        setParametersToArray(
            this._positionLowArr,
            index,
            length,
            itemSize,
            positionLow.x,
            positionLow.y,
            positionLow.z
        );

        this._changedBuffers[POSITION_BUFFER] = true;
    }

    setRgbaArr(index, rgba) {
        const itemSize = 4,
            ob = this.getObjectByIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(
            this._rgbaArr,
            index,
            length,
            itemSize,
            rgba.x,
            rgba.y,
            rgba.z,
            rgba.w
        );

        this._changedBuffers[RGBA_BUFFER] = true;
    }

    // setNormalsArr(index) {
    //     const ob = this.getObjectByIndex(index);
    //     let i = 0,
    //         a = this._normalsArr,
    //         x = 0.0,
    //         y = 1.0,
    //         z = 0.0;
    //
    //     if (ob.instanced) {
    //         i = index * 3;
    //         a[i] = x;
    //         a[i + 1] = y;
    //         a[i + 2] = z;
    //     } else {
    //         i = index * 12;
    //         a[i] = x;
    //         a[i + 1] = y;
    //         a[i + 2] = z;
    //
    //         a[i + 3] = x;
    //         a[i + 4] = y;
    //         a[i + 5] = z;
    //
    //         a[i + 6] = x;
    //         a[i + 7] = y;
    //         a[i + 8] = z;
    //     }
    //
    //     this._changedBuffers[NORMALS_BUFFER] = true;
    // }

    setPickingColorArr(index, color) {
        var i = index * 9;
        var a = this._pickingColorArr,
            x = color.x / 255,
            y = color.y / 255,
            z = color.z / 255;

        a[i] = x;
        a[i + 1] = y;
        a[i + 2] = z;

        a[i + 3] = x;
        a[i + 4] = y;
        a[i + 5] = z;

        a[i + 6] = x;
        a[i + 7] = y;
        a[i + 8] = z;

        this._changedBuffers[PICKINGCOLOR_BUFFER] = true;
    }

    setPitchRollArr(index, pitch, roll) {
        const itemSize = 2,
            ob = this.getObjectByIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(this._pitchRollArr, index, length, itemSize, pitch, roll);
        this._changedBuffers[PITCH_ROLL_BUFFER] = true;
    }

    setSizeArr(index, scale) {
        const itemSize = 1,
            ob = this.getObjectByIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(this._sizeArr, index, length, itemSize, scale);
        this._changedBuffers[SIZE_BUFFER] = true;
    }

    refresh() {
        var i = this._changedBuffers.length;
        while (i--) {
            this._changedBuffers[i] = true;
        }
    }

    _removeGeoObjects() {
        var i = this._geoObjects.length;
        while (i--) {
            var bi = this._geoObjects[i];
            bi._handlerIndex = -1;
            bi._handler = null;
        }
        this._geoObjects.length = 0;
        this._geoObjects = [];
    }

    clear() {
        this._sizeArr = null;
        this._pitchRollArr = null;
        this._vertexArr = null;
        this._positionHighArr = null;
        this._positionLowArr = null;
        this._directionArr = null;
        this._rgbaArr = null;
        this._normalsArr = null;
        this._indicesArr = null;
        this._pickingColorArr = null;

        this._pitchRollArr = new Float32Array();
        this._sizeArr = new Float32Array();
        this._vertexArr = new Float32Array();
        this._positionHighArr = new Float32Array();
        this._positionLowArr = new Float32Array();
        this._rgbaArr = new Float32Array();
        this._directionArr = new Float32Array();
        this._normalsArr = new Float32Array();
        this._indicesArr = new Uint16Array();
        this._pickingColorArr = new Float32Array();

        this._removeGeoObjects();
        this._deleteBuffers();
        this.refresh();
    }

    _deleteBuffers() {
        if (this._renderer) {
            var gl = this._renderer.handler.gl;
            gl.deleteBuffer(this._sizeBuffer);
            gl.deleteBuffer(this._pitchRollBuffer);
            gl.deleteBuffer(this._vertexBuffer);
            gl.deleteBuffer(this._positionHighBuffer);
            gl.deleteBuffer(this._positionLowBuffer);
            gl.deleteBuffer(this._rgbaBuffer);
            gl.deleteBuffer(this._indicesBuffer);
            gl.deleteBuffer(this._normalsBuffer);
            gl.deleteBuffer(this._directionBuffer);
            gl.deleteBuffer(this._pickingColorBuffer);
        }

        this._pitchRollBuffer = null;
        this._sizeBuffer = null;
        this._vertexBuffer = null;
        this._positionHighBuffer = null;
        this._positionLowBuffer = null;
        this._rgbaBuffer = null;
        this._indicesBuffer = null;
        this._normalsBuffer = null;
        this._directionBuffer = null;
        this._pickingColorBuffer = null;
    }

    update() {
        if (this._renderer) {
            var i = this._changedBuffers.length;
            while (i--) {
                if (this._changedBuffers[i]) {
                    this._buffersUpdateCallbacks[i].call(this);
                    this._changedBuffers[i] = false;
                }
            }
        }
    }

    draw() {
        if (this._geoObjects.length) {
            this.update();
            this._displayPASS();
        }
    }

    reindexGeoObjects(startIndex) {
        var b = this._geoObjects;
        for (var i = startIndex; i < b.length; i++) {
            b[i]._handlerIndex = i;
        }
    }

    add(geoObject) {
        if (geoObject._handlerIndex === -1) {
            geoObject._handler = this;
            geoObject._handlerIndex = this._geoObjects.length;
            this._geoObjects.push(geoObject);
            this._addGeoObjectToArrays(geoObject);
            this.refresh();
        }
    }

    remove(geoObject) {
        if (geoObject._handler && this.__staticId == geoObject._handler.__staticId) {
            this._removeGeoObject(geoObject);
        }
    }

    _removeGeoObject(geoObject) {
        var gi = geoObject._handlerIndex;

        this._geoObjects.splice(gi, 1);

        var i = gi * 12;
        this._rgbaArr = spliceTypedArray(this._rgbaArr, i, 12);

        i = gi * 9;
        this._vertexArr = spliceTypedArray(this._vertexArr, i, 9);
        this._positionHighArr = spliceTypedArray(this._positionHighArr, i, 9);
        this._positionLowArr = spliceTypedArray(this._positionLowArr, i, 9);
        this._directionArr = spliceTypedArray(this._directionArr, i, 9);
        this._normalsArr = spliceTypedArray(this._normalsArr, i, 9);
        this._pickingColorArr = spliceTypedArray(this._pickingColorArr, i, 9);

        i = gi * 6;
        this._pitchRollArr = spliceTypedArray(this._pitchRollArr, i, 6);
        this._indicesArr = spliceTypedArray(this._indicesArr, i, 6);
        i = gi * 3;
        this._sizeArr = spliceTypedArray(this._sizeArr, i, 3);

        this.reindexGeoObjects(gi);
        this.refresh();

        geoObject._handlerIndex = -1;
        geoObject._handler = null;
    }
}

export { GeoObjectHandler };
