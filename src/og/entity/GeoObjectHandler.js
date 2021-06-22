"use strict";

/**
 * @module og/entity/ShapeHandler
 */
import * as shaders from "../shaders/geoObject.js";
import { AbstractHandler } from "./AbstractHandler.js";
import { concatTypedArrays } from "../utils/shared.js";

const VERTEX_BUFFER = 0;
const POSITION_HIGH_BUFFER = 1;
const POSITION_LOW_BUFFER = 2;
const RGBA_BUFFER = 3;
const NORMAL_BUFFER = 4;
const INDECIES_BUFFER = 5;
const DIRECTION_BUFFER = 6;
const PICKINGCOLOR_BUFFER = 7;

class GeoObjectHandler extends AbstractHandler {
    constructor(entityCollection) {
        super(entityCollection, '_geoObjects');

        this._planet = null;

        this.addBuffer('vertex', VERTEX_BUFFER, 3, 9);
        this.addBuffer('positionHigh', POSITION_HIGH_BUFFER, 3, 9, this.createPositionHighBuffer);
        this.addBuffer('positionLow', POSITION_LOW_BUFFER, 3, 9, this.createPositionLowBuffer);
        this.addBuffer('rgba', RGBA_BUFFER, 4, 12);
        this.addBuffer('normals', NORMAL_BUFFER, 3, 9);
        this.addBuffer('direction', DIRECTION_BUFFER, 3, 9);
        this.addBuffer('indices', INDECIES_BUFFER, 1, 6, () => {
            var h = this._renderer.handler;
            h.gl.deleteBuffer(this._indicesBuffer);
            this._indicesBuffer = h.createElementArrayBuffer(this._indicesArr, 1, this._indicesArr.length);
        });
        this.addBuffer('pickingColor', PICKINGCOLOR_BUFFER, 3, 9);
        this.initBufferDetection();

        this.__staticId = GeoObjectHandler._staticCounter++;

    }

    createPositionLowBuffer() {
        let h = this._renderer.handler,
            numItems = this._positionLowArr.length / 3;

        if (!this._positionLowBuffer || this._positionLowBuffer.numItems !== numItems) {
            h.gl.deleteBuffer(this._positionLowBuffer);
            this._positionLowBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        h.setStreamArrayBuffer(this._positionLowBuffer, this._positionLowArr);
    }

    createPositionHighBuffer() {
        let h = this._renderer.handler,
            numItems = this._positionHighArr.length / 3;

        if (!this._positionHighBuffer || this._positionHighBuffer.numItems !== numItems) {
            h.gl.deleteBuffer(this._positionHighBuffer);
            this._positionHighBuffer = h.createStreamArrayBuffer(3, numItems);
        }

        h.setStreamArrayBuffer(this._positionHighBuffer, this._positionHighArr);
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

    setRenderNode(planet) {
        super.setRenderNode(planet);
        this._planet = planet;
    }

    setRenderer(planet) {
        super.setRenderer(planet);
        // this._planet = planet;

    }

    _addInstanceToArrays(geoObject) {
        if (geoObject._visibility) {
            this._vertexArr = concatTypedArrays(this._vertexArr, [-1.0, 0.0, 0.5, 0.0, 0.0, -0.5, 1.0, 0.0, 0.5]);
        } else {
            this._vertexArr = concatTypedArrays(this._vertexArr, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
        }

        var x = geoObject._positionHigh.x, y = geoObject._positionHigh.y, z = geoObject._positionHigh.z, w;
        this._positionHighArr = concatTypedArrays(this._positionHighArr, [x, y, z, x, y, z, x, y, z]);

        x = geoObject._positionLow.x;
        y = geoObject._positionLow.y;
        z = geoObject._positionLow.z;
        this._positionLowArr = concatTypedArrays(this._positionLowArr, [x, y, z, x, y, z, x, y, z]);

        x = geoObject._color.x;
        y = geoObject._color.y;
        z = geoObject._color.z;
        w = geoObject._color.w;
        this._rgbaArr = concatTypedArrays(this._rgbaArr, [x, y, z, w, x, y, z, w, x, y, z, w]);

        x = geoObject._entity._pickingColor.x / 255;
        y = geoObject._entity._pickingColor.y / 255;
        z = geoObject._entity._pickingColor.z / 255;
        this._pickingColorArr = concatTypedArrays(this._pickingColorArr, [x, y, z, x, y, z, x, y, z]);

        x = geoObject._direction.x;
        y = geoObject._direction.y;
        z = geoObject._direction.z;
        this._directionArr = concatTypedArrays(this._directionArr, [x, y, z, x, y, z, x, y, z]);
        this._normalsArr = concatTypedArrays(this._normalsArr, [0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0]);
        this._indicesArr = concatTypedArrays(this._indicesArr, [0, 1, 2, 0, 2, 1]);
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
            p.attributes.aVertexNormal,
            this._normalsBuffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
        gl.vertexAttribPointer(a.aVertexPosition, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._directionBuffer);
        gl.vertexAttribPointer(u.direction, this._directionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionHighBuffer);
        gl.vertexAttribPointer(a.positionHigh, this._positionHighBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionLowBuffer);
        gl.vertexAttribPointer(a.positionLow, this._positionLowBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._rgbaBuffer);
        gl.vertexAttribPointer(a.color, this._rgbaBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indicesBuffer);
        gl.drawElements(gl.TRIANGLES, this._indicesBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    }

    setVertexArr(index, verticesArr) {
        AbstractHandler.setParametersToArray(
            this._vertexArr,
            index,
            9,
            9,
            ...verticesArr
        );
        this._changedBuffers[VERTEX_BUFFER] = true;

    }

    setDirectionArr(index, direction) {
        AbstractHandler.setParametersToArray(
            this._directionArr,
            index,
            9, 3,
            direction.x,
            direction.y,
            direction.z
        );
        this._changedBuffers[DIRECTION_BUFFER] = true;

    }

    setVisibility(index, visibility) {
        var vArr;
        if (visibility) {
            vArr = [-1.0, 0.0, 0.5, 0.0, 0.0, -0.5, 1.0, 0.0, 0.5];
        } else {
            vArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
        this.setVertexArr(index, vArr);
        this.setNormalsArr(index);
        this.setIndicesArr(index);
    }

    setPositionArr(index, positionHigh, positionLow) {
        AbstractHandler.setParametersToArray(
            this._positionHighArr,
            index,
            9, 3,
            positionHigh.x,
            positionHigh.y,
            positionHigh.z
        );
        this._changedBuffers[POSITION_HIGH_BUFFER] = true;

        AbstractHandler.setParametersToArray(
            this._positionLowArr,
            index,
            9,
            3,
            positionLow.x,
            positionLow.y,
            positionLow.z
        );

        this._changedBuffers[POSITION_LOW_BUFFER] = true;
    }

    setRgbaArr(index, rgba) {
        AbstractHandler.setParametersToArray(
            this._rgbaArr,
            index,
            12,
            4,
            rgba.x,
            rgba.y,
            rgba.z,
            rgba.w
        );
        this._changedBuffers[RGBA_BUFFER] = true;
    }

    setNormalsArr(index) {

        AbstractHandler.setParametersToArray(
            this._normalsArr,
            index,
            9,
            3,
            0.0, 1.0, 0.0
        );
        this._changedBuffers[RGBA_BUFFER] = true;
    }

    setPickingColorArr(index, color) {

        AbstractHandler.setParametersToArray(
            this._pickingColorArr,
            index,
            18,
            3,
            color.x / 255,
            color.y / 255,
            color.z / 255);

        this._changedBuffers[PICKINGCOLOR_BUFFER] = true;
    }

    setIndicesArr(index) {

        AbstractHandler.setParametersToArray(
            this._indicesArr,
            index,
            6,
            1,
            0, 1, 2,
            0, 2, 1);

        this._changedBuffers[INDECIES_BUFFER] = true;
    }
}

export { GeoObjectHandler };
