/**
 * @module og/shape/BaseShape
 */

'use strict';

import { Vec3 } from '../math/Vec3.js';
import { Quat } from '../math/Quat.js';
import { Mat4 } from '../math/Mat4.js';

/**
 * Base geometry shape class.
 * @class
 * @param {Object} options - Shape parameters:
 * @param {og.Vec3} [options.position] - Shape position.
 * @param {og.Quat} [options.orientation] - Shape orientation(rotation).
 * @param {og.Vec3} [options.scale] - Scale vector.
 * @param {Array.<number,number,number,number>} [options.color] - Shape RGBA color.
 * @param {string} [options.src] - Texture image url source.
 * @param {boolean} [options.visibility] - Shape visibility.
 */
class BaseShape {

    constructor(options) {

        options = options || {};

        /**
         * Unic identifier.
         * @public
         * @readonly
         * @type {number}
         */
        this.id = BaseShape.__staticId++;

        /**
         * Shape position.
         * @public
         * @type {og.Vec3}
         */
        this.position = options.position || new Vec3();

        /**
         * Shape orientation(rotation)
         * @public
         * @type {og.Quat}
         */
        this.orientation = options.orientation || new Quat(0.0, 0.0, 0.0, 1.0);

        /**
         * Scale.
         * @public
         * @type {og.Vec3}
         */
        this.scale = options.scale || new Vec3(1.0, 1.0, 1.0);

        /**
         * Shape RGBA color.
         * @public
         * @type {Array.<number,number,number,number>}
         */
        this.color = options.color || [1.0, 1.0, 1.0, 1.0];

        /**
         * Shape visibility.
         * @public
         * @type {boolean}
         */
        this.visibility = (options.visibility != undefined ? options.visibility : true);

        /**
         * Image url source.
         * @protected
         * @type {string}
         */
        this._src = options.src || null;

        /**
         * Vertices position gl buffer.
         * @protected
         */
        this._positionBuffer = null;

        /**
         * Vertices normal gl buffer.
         * @protected
         */
        this._normalBuffer = null;

        /**
         * Vertices indexes gl buffer.
         * @protected
         */
        this._indexBuffer = null;

        /**
         * Vertex texture coordinates gl buffer.
         * @protected
         */
        this._textureCoordBuffer = null;

        /**
         * Vertex positions.
         * @protected
         * @type {Array.<number>}
         */
        this._positionData = [];

        /**
         * Vertex normals.
         * @protected
         * @type {Array.<number>}
         */
        this._normalData = [];

        /**
         * Vertex indeces.
         * @protected
         * @type {Array.<number>}
         */
        this._indexData = [];

        /**
         * Vertex texture coordinates.
         * @protected
         * @type {Array.<number>}
         */
        this._textureCoordData = [];

        /**
         * Scale matrix.
         * @protected
         * @type {og.Mat4}
         */
        this._mxScale = new Mat4().setIdentity();

        /**
         * Translation matrix.
         * @protected
         * @type {og.Mat4}
         */
        this._mxTranslation = new Mat4().setIdentity();

        /**
         * Model matrix.
         * @protected
         * @type {og.Mat4}
         */
        this._mxModel = new Mat4().setIdentity();

        /**
         * Gl texture pointer.
         * @protected
         */
        this.texture = null;

        /**
         * Assigned render node.
         * @protected
         * @type {og.scene.RenderNode}
         */
        this._renderNode = null;

        /**
         * Assigned picking color.
         * @protected
         * @type {Array.<number,number,number>}
         */
        this._pickingColor = [0.0, 0.0, 0.0, 0.0];

        /**
         * Entity instance that holds this shape.
         * @protected
         * @type {og.Entity}
         */
        this._entity = null;

        /**
         * Handler that stores and renders this shape object.
         * @protected
         * @type {og.ShapeHandler}
         */
        this._handler = null;

        /**
         * Shape handler array index.
         * @protected
         * @type {number}
         */
        this._handlerIndex = -1;
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

    /**
     * Clear shape parameters.
     * @public
     */
    clear() {

        this.position.set(0.0, 0.0, 0.0);
        this.orientation.set(0.0, 0.0, 0.0, 1.0);
        this.scale.set(1.0, 1.0, 1.0);

        this._positionData.length = 0;
        this._normalData.length = 0;
        this._indexData.length = 0;

        this._mxScale.setIdentity();
        this._mxTranslation.setIdentity();
        this._mxModel.setIdentity();

        this._renderNode.handler.gl.deleteTexture(this.texture);
        this.texture = null;

        this._deleteBuffers();
    }

    /**
     * Sets shape color.
     * @public
     * @param {Array.<number,number,number,number>} color - RGBA color values array.
     */
    setColor(color) {
        this.color[0] = color[0];
        this.color[1] = color[1];
        this.color[2] = color[2];
        this.color[3] = color[3];
    }

    /**
     * Sets shape color.
     * @public
     * @param {og.Vec4} color - RGBA color vector.
     */
    setColor4v(color) {
        this.color[0] = color.x;
        this.color[1] = color.y;
        this.color[2] = color.z;
        this.color[3] = color.w;
    }

    /**
     * Sets shape opacity value.
     * @public
     * @param {number} opacity - Opacity value.
     */
    setOpacity(opacity) {
        this.color[3] = opacity;
    }

    /**
     * Delete gl buffers.
     * @protected
     */
    _deleteBuffers() {
        var r = this._renderNode.renderer,
            gl = r.handler.gl;

        gl.deleteBuffer(this._positionBuffer);
        gl.deleteBuffer(this._normalBuffer);
        gl.deleteBuffer(this._indexBuffer);

        this._positionBuffer = null;
        this._normalBuffer = null;
        this._indexBuffer = null;
    }

    /**
     * Sets shape visibility.
     * @public
     * @param {boolean} visibility - Visibility.
     */
    setVisibility(visibility) {
        this.visibility = visibility;
    }

    /**
     * Gets visibilty flag.
     * @public
     * @returns {boolean} -
     */
    getVisibility() {
        return this.visibility;
    }

    /**
     * Assign render node.
     * @public
     * @param {og.scene.RenderNode} renderNode - Render node to assign.
     */
    setRenderNode(renderNode) {
        this._renderNode = renderNode;
        this._createBuffers();
        if (this._src) {
            var img = new Image();
            var that = this;
            img.onload = function () {
                that.texture = renderNode.renderer.handler.createTexture(this);
            };
            img.src = this._src;
        }
    }

    /**
     * Sets shape position.
     * @public
     * @param {og.Vec3} position - Shape position.
     */
    setPosition3v(position) {
        this.position.copy(position);
        this._mxTranslation.translateToPosition(position);
        this.refresh();
    }

    /**
     * Translate shape position to vector.
     * @public
     * @param {og.Vec3} vec - Translation vector.
     */
    translate3v(vec) {
        this.position.addA(vec);
        this._mxTranslation.translate(vec);
    }

    /**
     * Sets shape scale.
     * @param {og.Vec3} scale - Scale vector.
     */
    setScale3v(scale) {
        this.scale.copy(scale);
        this._mxScale.scale(scale);
    }

    /**
     * Removes shape from shape handler.
     * @public
     */
    remove() {
        this._entity = null;
        this._handler && this._handler.remove(this);
    }

    /**
     * Assign picking color.
     * @protected
     * @param {og.Vec3} color - Picking RGB color.
     */
    setPickingColor3v(color) {
        //...
        //TODO: check the renderer before
        //...
        this._pickingColor[0] = color.x / 255.0;
        this._pickingColor[1] = color.y / 255.0;
        this._pickingColor[2] = color.z / 255.0;
        this._pickingColor[3] = 1.0;
    }

    /**
     * Creates buffers.
     * @protected
     */
    _createBuffers() {
        this._deleteBuffers();
        var r = this._renderNode.renderer;
        this._positionBuffer = r.handler.createArrayBuffer(new Float32Array(this._positionData), 3, this._positionData.length / 3);
        this._normalBuffer = r.handler.createArrayBuffer(new Float32Array(this._normalData), 3, this._normalData.length / 3);
        this._indexBuffer = r.handler.createElementArrayBuffer(new Uint16Array(this._indexData), 1, this._indexData.length);
        this._textureCoordBuffer = r.handler.createArrayBuffer(new Float32Array(this._textureCoordData), 2, this._textureCoordData.length / 2);
    }

    /**
     * Update model matrix.
     * @public
     */
    refresh() {
        this._mxModel = this._mxTranslation.mul(this.orientation.getMatrix4().mul(this._mxScale));
    }

    /**
     * Shape rendering.
     * @public
     */
    draw() {
        if (this.visibility) {
            var rn = this._renderNode;
            var r = rn.renderer;

            var sh, p,
                gl = r.handler.gl;

            if (rn.lightEnabled) {
                sh = r.handler.Programs.shape_wl;
                p = sh._program;
                sha = p.attributes,
                    shu = p.uniforms;

                sh.activate();

                gl.uniform4fv(shu.lightsPositions, rn._lightsTransformedPositions);
                gl.uniform3fv(shu.lightsParamsv, rn._lightsParamsv);
                gl.uniform1fv(shu.lightsParamsf, rn._lightsParamsf);
                gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera._projectionMatrix._m);
                gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera._viewMatrix._m);
                gl.uniformMatrix3fv(shu.normalMatrix, false, r.activeCamera._normalMatrix._m);

                gl.bindBuffer(gl.ARRAY_BUFFER, this._normalBuffer);
                gl.vertexAttribPointer(sha.aVertexNormal, this._normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
            } else {
                sh = r.handler.Programs.shape_nl;
                p = sh._program;
                sha = p.attributes,
                    shu = p.uniforms;

                sh.activate();

                gl.uniformMatrix4fv(shu.projectionViewMatrix, false, r.activeCamera._projectionViewMatrix._m);
            }

            gl.uniform4fv(shu.uColor, this.color);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition, this._positionBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.uniformMatrix4fv(shu.modelMatrix, false, this._mxModel._m);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.uniform1i(shu.uSampler, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._textureCoordBuffer);
            gl.vertexAttribPointer(sha.aTextureCoord, this._textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            gl.drawElements(r.handler.gl.TRIANGLES, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        }
    }
}

export { BaseShape };