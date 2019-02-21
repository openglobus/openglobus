'use strict';

import { Vec3 } from '../math/Vec3.js';
import { Line3 } from '../math/Line3.js';

/**
 * Strip object.
 * @class
 * @param {*} [options] - Strip options:
 * @param {boolean} [options.visibility] - Strip visibility.
 * @example <caption>Stripe example</caption>
 * new og.Entity({
 *     strip: {
 *         gridSize: 10,
 *         path: [
 *             [[],[]],
 *             [[],[]]
 *         ]
 *     }
 * });
 */
class Strip {
    constructor(options) {

        options = options || {};

        /**
         * Object unic identifier.
         * @public
         * @readonly
         * @type {number}
         */
        this.id = Strip._staticCounter++;

        /**
         * Cloud visibility.
         * @public
         * @type {boolean}
         */
        this.visibility = (options.visibility != undefined ? options.visibility : true);

        this.color = new Float32Array([1.0, 1.0, 1.0, 0.5]);

        if (options.color) {
            this.setColor(options.color[0], options.color[1], options.color[2], options.color[3]);
        }

        if (options.opacity) {
            this.setOpacity(options.opacity);
        }

        /**
         * Parent collection render node.
         * @private
         * @type {og.scene.RenderNode}
         */
        this._renderNode = null;

        /**
         * Entity instance that holds this strip.
         * @private
         * @type {og.Entity}
         */
        this._entity = null;

        this._verticesBuffer = null;

        this._indexesBuffer = null;

        this._vertices = [];

        this._indexes = [];

        this._path = [];

        this._pickingColor = new Uint8Array(4);

        this._gridSize = 16;

        /**
         * Handler that stores and renders this object.
         * @private
         * @type {og.StripHandler}
         */
        this._handler = null;
        this._handlerIndex = -1;

        if (options.path) {
            this.setPath(options.path);
        }
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
     * Assign picking color.
     * @protected
     * @param {og.Vec3} color - Picking RGB color.
     */
    setPickingColor3v(color) {
        this._pickingColor[0] = color.x / 255.0;
        this._pickingColor[1] = color.y / 255.0;
        this._pickingColor[2] = color.z / 255.0;
        this._pickingColor[3] = 1.0;
    }

    /**
     * Clears object
     * @public
     */
    clear() {

        this._path.length = 0;
        this._path = [];

        this._vertices.length = 0;
        this._vertices = [];

        this._indexes.length = 0;
        this._indexes = [];

        this._indexes.length = 0;
        this._indexes = [];

        this._deleteBuffers();
    }

    setColor(r, g, b, a) {
        a = a || this.color[3];
        this.color[0] = r;
        this.color[1] = g;
        this.color[2] = b;
        this.color[3] = a;
    }

    /**
     * Set strip opacity.
     * @public
     * @param {number} opacity - opacity.
     */
    setOpacity(opacity) {
        this.color[3] = opacity || 0;
    }

    /**
     * Sets cloud visibility.
     * @public
     * @param {number} visibility - Visibility flag.
     */
    setVisibility(visibility) {
        this.visibility = visibility;
    }

    /**
     * @return {boolean} Strip visibily.
     */
    getVisibility() {
        return this.visibility;
    }

    /**
     * Assign rendering scene node.
     * @public
     * @param {og.scene.RenderNode}  renderNode - Assigned render node.
     */
    setRenderNode(renderNode) {
        this._renderNode = renderNode;
        this._createBuffers();
    }

    /**
     * Removes from entity.
     * @public
     */
    remove() {
        this._entity = null;
        this._handler && this._handler.remove(this);
    }

    draw() {
        if (this.visibility && this._vertices.length) {
            var r = this._renderNode.renderer;

            var gl = r.handler.gl;

            var sh = r.handler.programs.strip,
                p = sh._program,
                sha = p.attributes,
                shu = p.uniforms;

            gl.disable(gl.CULL_FACE);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
            sh.activate();
            gl.uniformMatrix4fv(shu.projectionViewMatrix, false, r.activeCamera._projectionViewMatrix._m);
            gl.uniform4fv(shu.uColor, this.color);
            gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition, this._verticesBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            gl.drawElements(r.handler.gl.TRIANGLE_STRIP, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            gl.enable(gl.CULL_FACE);
        }
    }

    drawPicking() {
        if (this.visibility && this._vertices.length) {
            var r = this._renderNode.renderer;

            var gl = r.handler.gl;

            var sh = r.handler.programs.strip,
                p = sh._program,
                sha = p.attributes,
                shu = p.uniforms;

            gl.disable(gl.CULL_FACE);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
            sh.activate();
            gl.uniformMatrix4fv(shu.projectionViewMatrix, false, r.activeCamera._projectionViewMatrix._m);
            gl.uniform4fv(shu.uColor, this._pickingColor);
            gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBuffer);
            gl.vertexAttribPointer(sha.aVertexPosition, this._verticesBuffer.itemSize, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
            gl.drawElements(r.handler.gl.TRIANGLE_STRIP, this._indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            gl.enable(gl.CULL_FACE);
        }
    }

    /**
     * Delete buffers
     * @private
     */
    _deleteBuffers() {
        if (this._renderNode && this._renderNode.renderer) {
            var r = this._renderNode.renderer,
                gl = r.handler.gl;

            gl.deleteBuffer(this._indexBuffer);
            gl.deleteBuffer(this._verticesBuffer);
        }

        this._verticesBuffer = null;
        this._indexBuffer = null;
    }

    _createBuffers() {
        if (this._renderNode && this._renderNode.renderer) {
            var gl = this._renderNode.renderer.handler.gl;

            gl.deleteBuffer(this._indexBuffer);
            gl.deleteBuffer(this._verticesBuffer);

            this._verticesBuffer = this._renderNode.renderer.handler.createArrayBuffer(new Float32Array(this._vertices), 3, this._vertices.length / 3);
            this._indexBuffer = this._renderNode.renderer.handler.createElementArrayBuffer(new Uint16Array(this._indexes), 1, this._indexes.length);
        }
    }

    addEdge3v(p2, p3) {
        let length = this._path.length;

        if (length === 0) {

            this._path.push([p2, p3]);

        } else {

            let p0 = this._path[length - 1][0],
                p1 = this._path[length - 1][1];

            this._path.push([p2, p3]);

            let v = this._vertices;

            let gs = this._gridSize,
                gs1 = gs + 1;

            let p = new Vec3();

            let last = this._vertices.length / 3,
                ind = last;

            for (let i = 0; i < gs1; i++) {
                for (let j = 0; j < gs1; j++) {

                    let di = i / gs,
                        dj = j / gs;

                    let p02 = p0.lerp(p2, di),
                        p13 = p1.lerp(p3, di),
                        p01 = p0.lerp(p1, dj),
                        p23 = p2.lerp(p3, dj);

                    (new Line3(p02, p13)).intersects(new Line3(p01, p23), p);

                    ind = last + i * gs1 + j;

                    v[ind * 3] = p.x;
                    v[ind * 3 + 1] = p.y;
                    v[ind * 3 + 2] = p.z;

                    if (i < gs) {
                        this._indexes.push(ind, ind + gs1);
                    }
                }

                if (i < gs) {
                    this._indexes.push(ind + gs1, ind + 1);
                }
            }

            this._createBuffers();
        }
    }

    setEdge3v(p2, p3, index) {

        if (index === this._path.length) {
            this.addEdge3v(p2, p3);
            return;
        }

        this._path[index][0] = p2;
        this._path[index][1] = p3;

        if (this._path.length > 1) {

            let gs = this._gridSize,
                gs1 = gs + 1;

            let vSize = gs1 * gs1;

            let p = new Vec3(),
                v = this._vertices;

            if (index === this._path.length - 1) {

                let p0 = this._path[index - 1][0],
                    p1 = this._path[index - 1][1];

                let prev = this._vertices.length / 3 - vSize,
                    ind = prev;

                for (let i = 0; i < gs1; i++) {
                    for (let j = 0; j < gs1; j++) {

                        let di = i / gs,
                            dj = j / gs;

                        let p02 = p0.lerp(p2, di),
                            p13 = p1.lerp(p3, di),
                            p01 = p0.lerp(p1, dj),
                            p23 = p2.lerp(p3, dj);

                        (new Line3(p02, p13)).intersects(new Line3(p01, p23), p);

                        ind = prev + i * gs1 + j;

                        v[ind * 3] = p.x;
                        v[ind * 3 + 1] = p.y;
                        v[ind * 3 + 2] = p.z;
                    }
                }

            } else if (index === 0) {

                let ind = 0;

                let p0 = p2,
                    p1 = p3;

                p2 = this._path[1][0];
                p3 = this._path[1][1];

                for (let i = 0; i < gs1; i++) {
                    for (let j = 0; j < gs1; j++) {

                        let di = i / gs,
                            dj = j / gs;

                        let p02 = p0.lerp(p2, di),
                            p13 = p1.lerp(p3, di),
                            p01 = p0.lerp(p1, dj),
                            p23 = p2.lerp(p3, dj);

                        (new Line3(p02, p13)).intersects(new Line3(p01, p23), p);

                        ind = i * gs1 + j;

                        v[ind * 3] = p.x;
                        v[ind * 3 + 1] = p.y;
                        v[ind * 3 + 2] = p.z;
                    }
                }
            } else if (index > 0 && index < this._path.length) {

                let p0 = this._path[index - 1][0],
                    p1 = this._path[index - 1][1];

                let p4 = this._path[index + 1][0],
                    p5 = this._path[index + 1][1];

                let next = index * vSize,
                    prev = (index - 1) * vSize,
                    ind = prev;

                for (let i = 0; i < gs1; i++) {
                    for (let j = 0; j < gs1; j++) {

                        let di = i / gs,
                            dj = j / gs;

                        //prev
                        let p02 = p0.lerp(p2, di),
                            p13 = p1.lerp(p3, di),
                            p01 = p0.lerp(p1, dj),
                            p23 = p2.lerp(p3, dj);

                        (new Line3(p02, p13)).intersects(new Line3(p01, p23), p);

                        let ij = i * gs1 + j;

                        ind = prev + ij;

                        v[ind * 3] = p.x;
                        v[ind * 3 + 1] = p.y;
                        v[ind * 3 + 2] = p.z;

                        //next
                        let p24 = p2.lerp(p4, di),
                            p35 = p3.lerp(p5, di),
                            p45 = p4.lerp(p5, dj);
                        p23 = p2.lerp(p3, dj);

                        (new Line3(p24, p35)).intersects(new Line3(p23, p45), p);

                        ind = next + ij;

                        v[ind * 3] = p.x;
                        v[ind * 3 + 1] = p.y;
                        v[ind * 3 + 2] = p.z;
                    }
                }
            }

            this._createBuffers();
        }
    }

    removeEdge(index) {
        this._path.splice(index, 1);
        this.setPath([].concat(this._path));
    }

    setGridSize(gridSize) {
        this._gridSize = gridSize;
        this.setPath([].concat(this._path));
    }

    getPath() {
        return this._path;
    }

    setPath(path) {

        this._vertices = [];
        this._indexes = [];
        this._path = [];

        for (let i = 0; i < path.length; i++) {

            let p0 = path[i][0],
                p1 = path[i][1];

            if (p0 instanceof Array) {
                p0 = new Vec3(p0[0], p0[1], p0[2]);
            }

            if (p1 instanceof Array) {
                p1 = new Vec3(p1[0], p1[1], p1[2]);
            }

            this.addEdge3v(p0, p1);
        }
    }
}

export { Strip };