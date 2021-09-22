"use strict";

/**
 * @module og/entity/ShapeHandler
 */
import * as shaders from "../shaders/geoObject.js";
import { concatArrays, makeArrayTyped, spliceArray } from "../utils/shared.js";

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
    const currIndex = index * length;
    for (let i = currIndex; i < currIndex + length; i++) {
        arr[i] = params[i % itemSize];
    }
    return arr;
};

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
        this._pitchRollArr = [[]];
        this._sizeArr = [[]];
        this._vertexArr = [[]];
        this._positionHighArr = [[]];
        this._positionLowArr = [[]];
        this._directionArr = [[]];
        this._rgbaArr = [[]];
        this._normalsArr = [[]];
        this._indicesArr = [[]];
        this._pickingColorArr = [[]];

        this._pitchRollBuffer = [];
        this._sizeBuffer = [];
        this._vertexBuffer = [];
        this._positionHighBuffer = [];
        this._positionLowBuffer = [];
        this._directionBuffer = [];
        this._rgbaBuffer = [];
        this._normalsBuffer = [];
        this._indicesBuffer = [];
        this._pickingColorBuffer = [];

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

        this.instancedTags = new Map();
        this.instancedTags.set('none', {
            index: 0
        });
    }

    getObjectByIndex(index) {
        return this._geoObjects[index];
    }

    //Create buffers
    createVertexBuffer() {
        var h = this._renderer.handler;
        for (let i = 0; i < this._vertexArr.length; i++) {
            this._vertexBuffer && h.gl.deleteBuffer(this._vertexBuffer[i]);
            this._vertexArr[i] = makeArrayTyped(this._vertexArr[i]);
            this._vertexBuffer[i] = h.createArrayBuffer(this._vertexArr[i], 3, this._vertexArr[i].length / 3);
        }
    }

    createPitchRollBuffer() {
        var h = this._renderer.handler;
        for (let i = 0; i < this._pitchRollArr.length; i++) {
            this._pitchRollBuffer && h.gl.deleteBuffer(this._pitchRollBuffer[i]);
            this._pitchRollArr[i] = makeArrayTyped(this._pitchRollArr[i]);
            this._pitchRollBuffer[i] = h.createArrayBuffer(
                this._pitchRollArr[i],
                2,
                this._pitchRollArr[i].length / 2
            );
        }
    }

    createSizeBuffer() {
        var h = this._renderer.handler;
        for (let i = 0; i < this._sizeArr.length; i++) {
            this._sizeBuffer && h.gl.deleteBuffer(this._sizeBuffer[i]);
            this._sizeArr[i] = makeArrayTyped(this._sizeArr[i]);
            this._sizeBuffer[i] = h.createArrayBuffer(this._sizeArr[i], 1, this._sizeArr[i].length);
        }
    }

    createPositionBuffer() {
        let h = this._renderer.handler;
        for (let i = 0; i < this._positionHighArr.length; i++) {
            this._positionHighBuffer && h.gl.deleteBuffer(this._positionHighBuffer[i]);
            this._positionHighArr[i] = makeArrayTyped(this._positionHighArr[i]);
            this._positionHighBuffer[i] = h.createArrayBuffer(
                this._positionHighArr[i],
                3,
                this._positionHighArr[i].length / 3
            );
        }
        for (let i = 0; i < this._positionLowArr.length; i++) {
            this._positionLowBuffer && h.gl.deleteBuffer(this._positionLowBuffer[i]);
            this._positionLowArr[i] = makeArrayTyped(this._positionLowArr[i]);
            this._positionLowBuffer[i] = h.createArrayBuffer(
                this._positionLowArr[i],
                3,
                this._positionLowArr[i].length / 3
            );
        }
    }

    createRgbaBuffer() {
        var h = this._renderer.handler;
        for (let i = 0; i < this._rgbaArr.length; i++) {
            this._rgbaBuffer && h.gl.deleteBuffer(this._rgbaBuffer[i]);
            this._rgbaArr[i] = makeArrayTyped(this._rgbaArr[i]);
            this._rgbaBuffer[i] = h.createArrayBuffer(this._rgbaArr[i], 4, this._rgbaArr[i].length / 4);
        }
    }

    createDirectionBuffer() {
        var h = this._renderer.handler;
        for (let i = 0; i < this._directionArr.length; i++) {
            this._directionBuffer && h.gl.deleteBuffer(this._directionBuffer[i]);
            this._directionArr[i] = makeArrayTyped(this._directionArr[i]);
            this._directionBuffer[i] = h.createArrayBuffer(
                this._directionArr[i],
                3,
                this._directionArr[i].length / 3
            );
        }

    }

    createNormalsBuffer() {
        var h = this._renderer.handler;
        for (let i = 0; i < this._normalsArr.length; i++) {
            this._normalsBuffer && h.gl.deleteBuffer(this._normalsBuffer[i]);
            this._normalsArr[i] = makeArrayTyped(this._normalsArr[i]);
            this._normalsBuffer[i] = h.createArrayBuffer(this._normalsArr[i], 3, this._normalsArr[i].length / 3);
        }
    }

    createIndicesBuffer() {
        var h = this._renderer.handler;
        for (let i = 0; i < this._indicesArr.length; i++) {
            this._indicesBuffer && h.gl.deleteBuffer(this._indicesBuffer[i]);
            this._indicesArr[i] = makeArrayTyped(this._indicesArr[i], Uint16Array);
            this._indicesBuffer[i] = h.createElementArrayBuffer(
                this._indicesArr[i],
                1,
                this._indicesArr[i].length
            );

        }
    }

    createPickingColorBuffer() {
        // var h = this._renderer.handler;
        // for (let i = 0; i < this._pickingColorArr.length; i++) {
        //     this._pickingColorBuffer && h.gl.deleteBuffer(this._pickingColorBuffer[i]);
        //     this._pickingColorArr[i] = makeArrayTyped(this._pickingColorArr[i]);
        //     this._pickingColorBuffer[i] = h.createArrayBuffer(
        //         this._pickingColorArr[i],
        //         3,
        //         this._pickingColorArr[i].length / 3
        //     );
        // }
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

    _addInstancedGeoObjectToArray(geoObject) {
        var itemSize = 3;

        var tag = geoObject.tag,
            alreadyAdded = this.instancedTags.has(tag);

        if (!alreadyAdded) {
            this.instancedTags.set(tag, {
                vCounts: geoObject._verticesCount * itemSize,
                iCounts: 1,
                iSize: geoObject._indices.length,
                index: this.instancedTags.size
            });

        } else {
            const prevState = this.instancedTags.get(tag),
                nextCount = prevState.iCounts + 1;
            this.instancedTags.set(tag, {
                vCounts: geoObject._verticesCount * itemSize,
                iCounts: nextCount,
                iSize: prevState.iSize,
                index: prevState.index
            });
        }
        const tagData = this.instancedTags.get(tag),
            ti = tagData.index;

        /**
         * mark object by index for recalc indices array
         */
        geoObject._tagIndex = tagData.iCounts - 1;
        if (geoObject._visibility) {
            if (!alreadyAdded) {
                this._vertexArr[ti] = concatArrays(
                    this._vertexArr[ti],
                    setParametersToArray(
                        [],
                        0,
                        geoObject._verticesCount * itemSize,
                        geoObject._verticesCount * itemSize,
                        ...geoObject._vertices
                    )
                );
                this._normalsArr[ti] = concatArrays(
                    this._normalsArr[ti],
                    setParametersToArray(
                        [],
                        0,
                        geoObject._verticesCount * itemSize,
                        geoObject._verticesCount * itemSize,
                        ...geoObject._normals
                        // ...getTriangleNormals(geoObject._vertices, geoObject._indices)
                    )
                );
            }
        } else {
            this._vertexArr[ti] = concatArrays(
                this._vertexArr[ti],
                setParametersToArray([], 0, geoObject._verticesCount * itemSize, 1, 0)
            );
        }
        var x = geoObject._positionHigh.x,
            y = geoObject._positionHigh.y,
            z = geoObject._positionHigh.z,
            w;

        this._positionHighArr[ti] = concatArrays(
            this._positionHighArr[ti],
            setParametersToArray([], 0, itemSize, itemSize, x, y, z)
        );
        x = geoObject._positionLow.x;
        y = geoObject._positionLow.y;
        z = geoObject._positionLow.z;
        this._positionLowArr[ti] = concatArrays(
            this._positionLowArr[ti],
            setParametersToArray([], 0, itemSize, itemSize, x, y, z)
        );

        x = geoObject._entity._pickingColor.x / 255;
        y = geoObject._entity._pickingColor.y / 255;
        z = geoObject._entity._pickingColor.z / 255;
        this._pickingColorArr[ti] = concatArrays(
            this._pickingColorArr[ti],
            setParametersToArray([], 0, itemSize, itemSize, x, y, z)
        );

        x = geoObject._direction.x;
        y = geoObject._direction.y;
        z = geoObject._direction.z;
        this._directionArr[ti] = concatArrays(
            this._directionArr[ti],
            setParametersToArray([], 0, itemSize, itemSize, x, y, z)
        );

        itemSize = 4;

        x = geoObject._color.x;
        y = geoObject._color.y;
        z = geoObject._color.z;
        w = geoObject._color.w;
        this._rgbaArr[ti] = concatArrays(
            this._rgbaArr[ti],
            setParametersToArray([], 0, itemSize, itemSize, x, y, z, w)
        );

        this._indicesArr[ti] = concatArrays(this._indicesArr[ti], geoObject._indices);

        x = geoObject._pitch;
        y = geoObject._roll;

        itemSize = 2;

        this._pitchRollArr[ti] = concatArrays(
            this._pitchRollArr[ti],
            setParametersToArray([], 0, itemSize, itemSize, x, y)
        );

        itemSize = 1;

        this._sizeArr[ti] = concatArrays(
            this._sizeArr[ti],
            setParametersToArray([], 0, itemSize, itemSize, geoObject.scale)
        );
        this.recalculateIndices();
    }

    _addGeoObjectToArrays(geoObject) {
        let itemSize = 3;
        if (geoObject._visibility) {
            this._vertexArr[0] = concatArrays(
                this._vertexArr[0],
                setParametersToArray(
                    [],
                    0,
                    geoObject._verticesCount * itemSize,
                    geoObject._verticesCount * itemSize,
                    ...geoObject._vertices
                )
            );
        } else {
            this._vertexArr[0] = concatArrays(
                this._vertexArr[0],
                setParametersToArray([], 0, geoObject._verticesCount * itemSize, 1, 0)
            );
        }

        var x = geoObject._positionHigh.x,
            y = geoObject._positionHigh.y,
            z = geoObject._positionHigh.z,
            w;

        this._positionHighArr[0] = concatArrays(
            this._positionHighArr[0],
            setParametersToArray([], 0, geoObject._verticesCount * itemSize, itemSize, x, y, z)
        );

        x = geoObject._positionLow.x;
        y = geoObject._positionLow.y;
        z = geoObject._positionLow.z;
        this._positionLowArr[0] = concatArrays(
            this._positionLowArr[0],
            setParametersToArray([], 0, geoObject._verticesCount * itemSize, itemSize, x, y, z)
        );

        x = geoObject._entity._pickingColor.x / 255;
        y = geoObject._entity._pickingColor.y / 255;
        z = geoObject._entity._pickingColor.z / 255;
        this._pickingColorArr[0] = concatArrays(this._pickingColorArr[0], [x, y, z]);

        x = geoObject._direction.x;
        y = geoObject._direction.y;
        z = geoObject._direction.z;
        this._directionArr[0] = concatArrays(
            this._directionArr[0],
            setParametersToArray(
                [],
                geoObject._handlerIndex,
                geoObject._verticesCount * itemSize,
                itemSize,
                x,
                y,
                z
            )
        );

        this._normalsArr[0] = concatArrays(
            this._normalsArr[0],
            setParametersToArray(
                [],
                0,
                geoObject._verticesCount * itemSize,
                geoObject._verticesCount * itemSize,
                ...geoObject._normals
            )
        );

        itemSize = 4;

        x = geoObject._color.x;
        y = geoObject._color.y;
        z = geoObject._color.z;
        w = geoObject._color.w;
        this._rgbaArr[0] = concatArrays(
            this._rgbaArr[0],
            setParametersToArray([], 0, geoObject._verticesCount * itemSize, itemSize, x, y, z, w)
        );

        this._indicesArr[0] = concatArrays(this._indicesArr[0], geoObject._indices);

        x = geoObject._pitch;
        y = geoObject._roll;
        itemSize = 6;
        this._pitchRollArr[0] = concatArrays(
            this._pitchRollArr[0],
            setParametersToArray([], 0, geoObject._verticesCount * itemSize, itemSize, x, y)
        );

        itemSize = 3;
        this._sizeArr[0] = concatArrays(
            this._sizeArr[0],
            setParametersToArray(
                [],
                0,
                geoObject._verticesCount * itemSize,
                itemSize,
                geoObject.scale
            )
        );
    }

    _displayPASS() {
        const r = this._renderer,
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
        gl.uniformMatrix3fv(u.normalMatrix, false, r.activeCamera._normalMatrix._m);

        gl.uniform4fv(u.lightsPositions, this._planet._lightsTransformedPositions);
        gl.uniform3fv(u.lightsParamsv, this._planet._lightsParamsv);
        gl.uniform1fv(u.lightsParamsf, this._planet._lightsParamsf);

        for (const tag of this.instancedTags) {
            const tagData = tag[1],
                ti = tagData.index;

            gl.bindBuffer(gl.ARRAY_BUFFER, this._normalsBuffer[ti]);
            gl.vertexAttribPointer(
                a.aVertexNormal,
                this._normalsBuffer[ti].itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer[ti]);
            gl.vertexAttribPointer(
                a.aVertexPosition,
                this._vertexBuffer[ti].itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, this._directionBuffer[ti]);
            gl.vertexAttribPointer(
                a.aDirection,
                this._directionBuffer[ti].itemSize,
                gl.FLOAT,
                false, 0, 0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, this._sizeBuffer[ti]);
            gl.vertexAttribPointer(
                a.aScale,
                this._sizeBuffer[ti].itemSize,
                gl.FLOAT,
                false, 0, 0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, this._pitchRollBuffer[ti]);
            gl.vertexAttribPointer(
                a.aPitchRoll,
                this._pitchRollBuffer[ti].itemSize,
                gl.FLOAT,
                false, 0, 0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer[ti]);
            gl.vertexAttribPointer(
                a.aColor,
                this._rgbaBuffer[ti].itemSize,
                gl.FLOAT,
                false, 0, 0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, this._positionHighBuffer[ti]);
            gl.vertexAttribPointer(
                a.aPositionHigh,
                this._positionHighBuffer[ti].itemSize,
                gl.FLOAT,
                false, 0, 0
            );

            gl.bindBuffer(gl.ARRAY_BUFFER, this._positionLowBuffer[ti]);
            gl.vertexAttribPointer(
                a.aPositionLow,
                this._positionLowBuffer[ti].itemSize,
                gl.FLOAT,
                false, 0, 0
            );

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indicesBuffer[ti]);

            if (tagData.iCounts) {
                gl.drawElementsInstanced(
                    gl.TRIANGLES,
                    this._indicesBuffer[ti].numItems / tagData.iCounts,
                    gl.UNSIGNED_SHORT,
                    0,
                    tagData.iCounts
                );
            } else {
                gl.drawElements(gl.TRIANGLES, this._indicesBuffer[ti].numItems, gl.UNSIGNED_SHORT, 0);
            }
        }
        gl.disable(gl.CULL_FACE);
    }

    recalculateIndices() {
        const allIndices = this._indicesArr,
            goArr = this._geoObjects,
            maxIndicesByTags = new Array(this.instancedTags.size).fill(0);

        for (let gi = 0; gi < goArr.length; gi++) {
            const go = goArr[gi],
                ti = this.getTagIndexByObjectIndex(go._handlerIndex),
                gIndices = go._indices;

            for (let ii = 0; ii < gIndices.length; ii++) {
                const gIndex = gIndices[ii];

                const i = go._indicesCount * go._tagIndex + ii;
                if (go._tagIndex > 0) {
                    allIndices[ti][i] = gIndex + maxIndicesByTags[ti];
                    if (allIndices[ti][i] > maxIndicesByTags[ti]) {
                        maxIndicesByTags[ti] = allIndices[ti][i] + 1;
                    }
                } else {
                    allIndices[ti][i] = gIndex;
                    if (gIndex > maxIndicesByTags[ti]) {
                        maxIndicesByTags[ti] = gIndex + 1;
                    }
                }
            }
        }
        return this._indicesArr;
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
            ob = this.getObjectByIndex(index),
            ti = this.getTagIndexByObjectIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(
            this._directionArr[ti],
            ob._tagIndex,
            length,
            itemSize,
            direction.x,
            direction.y,
            direction.z
        );
        this._changedBuffers[DIRECTION_BUFFER] = true;
    }

    setVisibility(index, visibility) {
        const ob = this.getObjectByIndex(index),
            ti = this.getTagIndexByObjectIndex(index);
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
            ob = this.getObjectByIndex(index),
            ti = this.getTagIndexByObjectIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(
            this._positionHighArr[ti],
            ob._tagIndex,
            length,
            itemSize,
            positionHigh.x,
            positionHigh.y,
            positionHigh.z
        );

        // Low
        setParametersToArray(
            this._positionLowArr[ti],
            ob._tagIndex,
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
            ob = this.getObjectByIndex(index),
            ti = this.getTagIndexByObjectIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(
            this._rgbaArr[ti],
            ob._tagIndex,
            length,
            itemSize,
            rgba.x,
            rgba.y,
            rgba.z,
            rgba.w
        );

        this._changedBuffers[RGBA_BUFFER] = true;
    }

    getTagIndexByObjectIndex(index) {
        return this.instancedTags.get(this.getObjectByIndex(index).tag).index;
    }

    getTagDataByObjectIndex(index) {
        return this.instancedTags.get(this.getObjectByIndex(index).tag);
    }

    setPickingColorArr(index, color) {
        var i = index * 9,
            ti = this.getTagIndexByObjectIndex(index);
        var a = this._pickingColorArr[ti],
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
            ti = this.getTagIndexByObjectIndex(index),
            ob = this.getObjectByIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(this._pitchRollArr[ti], ob._tagIndex, length, itemSize, pitch, roll);
        this._changedBuffers[PITCH_ROLL_BUFFER] = true;
    }

    setSizeArr(index, scale) {
        const itemSize = 1,
            ti = this.getTagIndexByObjectIndex(index),
            ob = this.getObjectByIndex(index);
        let length = ob._verticesCount * itemSize;

        if (ob.instanced) {
            length = itemSize;
        }

        setParametersToArray(this._sizeArr[ti], ob._tagIndex, length, itemSize, scale);
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

    reindexGeoObjects(startIndex, tag) {
        var b = this._geoObjects;

        for (var i = startIndex; i < b.length; i++) {

            const go = b[i];

            b[i]._handlerIndex = i;
            if (tag === go.tag) {
                --b[i]._tagIndex;
            }
        }
    }

    add(geoObject) {
        if (geoObject._handlerIndex === -1) {
            geoObject._handler = this;
            geoObject._handlerIndex = this._geoObjects.length;
            this._geoObjects.push(geoObject);
            if (geoObject.instanced) {
                this._addInstancedGeoObjectToArray(geoObject);
            } else {
                this._addGeoObjectToArrays(geoObject);
            }
            this.refresh();
        }
    }

    remove(geoObject) {
        if (geoObject._handler && this.__staticId == geoObject._handler.__staticId) {
            if (geoObject.instanced) {
                this._removeInstancedGeoObject(geoObject);
            } else {
                this._removeGeoObject(geoObject);
            }
        }
    }

    _removeInstancedGeoObject(geoObject) {
        var gi = geoObject._handlerIndex,
            tag = geoObject.tag,
            ti = this.getTagIndexByObjectIndex(gi),
            prevState = this.instancedTags.get(tag);

        this.instancedTags.set(tag, {
            vCounts: geoObject._verticesCount * 3,
            iCounts: prevState.iCounts - 1,
            iSize: geoObject._indicesCount,
            index: prevState.index
        });

        this._geoObjects.splice(gi, 1);

        var i = gi * 4;
        this._rgbaArr[ti] = spliceArray(this._rgbaArr[ti], i, 4);

        i = gi * 3;
        if (prevState.iCounts <= 1) {
            this._vertexArr[ti] = spliceArray(this._vertexArr[ti], 0, geoObject._verticesCount * 3);
            this._normalsArr[ti] = spliceArray(this._normalsArr[ti], 0, geoObject._verticesCount * 3);
        }
        this._positionHighArr[ti] = spliceArray(this._positionHighArr[ti], i, 3);
        this._positionLowArr[ti] = spliceArray(this._positionLowArr[ti], i, 3);
        this._directionArr[ti] = spliceArray(this._directionArr[ti], i, 3);
        this._pickingColorArr[ti] = spliceArray(this._pickingColorArr[ti], i, 3);

        i = gi * 2;
        this._pitchRollArr[ti] = spliceArray(this._pitchRollArr[ti], i, 2);
        this._indicesArr[ti] = spliceArray(this._indicesArr[ti], i, geoObject._indicesCount);
        i = gi * 1;
        this._sizeArr[ti] = spliceArray(this._sizeArr[ti], i, 1);

        this.reindexGeoObjects(gi, tag);
        this.recalculateIndices();
        this.refresh();

        geoObject._handlerIndex = -1;
        geoObject._handler = null;
    }

    _removeGeoObject(geoObject) {
        var gi = geoObject._handlerIndex;

        this._geoObjects.splice(gi, 1);

        var i = gi * 12;
        this._rgbaArr[0] = spliceArray(this._rgbaArr[0], i, 12);

        i = gi * 9;
        this._vertexArr[0] = spliceArray(this._vertexArr[0], i, 9);
        this._positionHighArr[0] = spliceArray(this._positionHighArr[0], i, 9);
        this._positionLowArr[0] = spliceArray(this._positionLowArr[0], i, 9);
        this._directionArr[0] = spliceArray(this._directionArr[0], i, 9);
        this._normalsArr[0] = spliceArray(this._normalsArr[0], i, 9);
        this._pickingColorArr[0] = spliceArray(this._pickingColorArr[0], i, 9);

        i = gi * 6;
        this._pitchRollArr[0] = spliceArray(this._pitchRollArr[0], i, 6);
        this._indicesArr[0] = spliceArray(this._indicesArr[0], i, 6);
        i = gi * 3;
        this._sizeArr[0] = spliceArray(this._sizeArr[0], i, 3);

        this.reindexGeoObjects(gi);
        this.refresh();

        geoObject._handlerIndex = -1;
        geoObject._handler = null;
    }
}

export { GeoObjectHandler };
