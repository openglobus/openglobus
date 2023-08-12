"use strict";

import * as utils from "../utils/shared";
import {Entity} from "./Entity";
import {Line3} from "../math/Line3";
import {RenderNode} from "../scene/RenderNode";
import {NumberArray3, Vec3} from "../math/Vec3";
import {NumberArray4, Vec4} from "../math/Vec4";
import {StripHandler} from "./StripHandler";
import {WebGLBufferExt} from "../webgl/Handler";

type TPoiExt = Vec3 | NumberArray3;
type TStripExt = [TPoiExt, TPoiExt];

type TPoi = Vec3;
type TStrip = [TPoi, TPoi];

//type TStrip = TEdge[];

interface IStripParams {
    visibility?: boolean;
    color?: string | NumberArray4 | Vec4;
    opacity?: number;
    path?: TStrip[];
}

let _tempHigh = new Vec3(),
    _tempLow = new Vec3();

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

    static __counter__: number;

    protected __id: number;

    /**
     * Strip visibility.
     * @public
     * @type {boolean}
     */
    public visibility: boolean;

    public color: Float32Array;

    /**
     * Parent collection render node.
     * @protected
     * @type {RenderNode}
     */
    protected _renderNode: RenderNode | null;

    /**
     * Entity instance that holds this strip.
     * @protected
     * @type {Entity}
     */
    protected _entity: Entity | null;
    protected _verticesHighBuffer: WebGLBufferExt | null;
    protected _verticesLowBuffer: WebGLBufferExt | null;
    protected _indexBuffer: WebGLBufferExt | null;
    protected _verticesHigh: number[];
    protected _verticesLow: number[];
    protected _indexes: number[];
    protected _path: TStrip[];

    protected _pickingColor: Float32Array;

    protected _gridSize: number;

    /**
     * Handler that stores and renders this object.
     * @protected
     * @type {StripHandler | null}
     */
    protected _handler: StripHandler | null;
    protected _handlerIndex: number;

    constructor(options: IStripParams = {}) {

        this.__id = Strip.__counter__++;

        this.visibility = options.visibility != undefined ? options.visibility : true;

        this.color = new Float32Array([1.0, 1.0, 1.0, 0.5]);

        if (options.color) {
            let color = utils.createColorRGBA(options.color);
            this.setColor(color.x, color.y, color.z, color.w);
        }

        if (options.opacity) {
            this.setOpacity(options.opacity);
        }

        /**
         * Parent collection render node.
         * @protected
         * @type {RenderNode}
         */
        this._renderNode = null;

        /**
         * Entity instance that holds this strip.
         * @protected
         * @type {Entity}
         */
        this._entity = null;

        this._verticesHighBuffer = null;
        this._verticesLowBuffer = null;

        this._indexBuffer = null;

        this._verticesHigh = [];
        this._verticesLow = [];

        this._indexes = [];

        this._path = [];

        this._pickingColor = new Float32Array(4);

        this._gridSize = 1;

        /**
         * Handler that stores and renders this object.
         * @protected
         * @type {StripHandler}
         */
        this._handler = null;
        this._handlerIndex = -1;

        if (options.path) {
            this.setPath(options.path);
        }
    }

    /**
     * Assign picking color.
     * @public
     * @param {Vec3} color - Picking RGB color.
     */
    public setPickingColor3v(color: Vec3) {
        this._pickingColor[0] = color.x / 255.0;
        this._pickingColor[1] = color.y / 255.0;
        this._pickingColor[2] = color.z / 255.0;
        this._pickingColor[3] = 1.0;
    }

    /**
     * Clears object
     * @public
     */
    public clear() {
        this._path.length = 0;
        this._path = [];

        this._verticesHigh.length = 0;
        this._verticesHigh = [];

        this._verticesLow.length = 0;
        this._verticesLow = [];

        this._indexes.length = 0;
        this._indexes = [];

        this._deleteBuffers();
    }

    public setColor(r: number, g: number, b: number, a?: number) {
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
    public setOpacity(opacity: number) {
        this.color[3] = opacity || 0;
    }

    /**
     * Sets cloud visibility.
     * @public
     * @param {boolean} visibility - Visibility flag.
     */
    public setVisibility(visibility: boolean) {
        this.visibility = visibility;
    }

    /**
     * @return {boolean} Strip visibility.
     */
    public getVisibility(): boolean {
        return this.visibility;
    }

    /**
     * Assign rendering scene node.
     * @public
     * @param {RenderNode}  renderNode - Assigned render node.
     */
    public setRenderNode(renderNode: RenderNode) {
        this._renderNode = renderNode;
        this._createBuffers();
    }

    /**
     * Removes from entity.
     * @public
     */
    public remove() {
        this._entity = null;
        this._handler && this._handler.remove(this);
    }

    public draw() {
        if (this.visibility && this._verticesHigh.length) {
            let r = this._renderNode!.renderer!;

            let gl = r.handler.gl!;

            let sh = r.handler.programs.strip,
                p = sh._program,
                sha = p.attributes,
                shu = p.uniforms;

            sh.activate();

            gl.disable(gl.CULL_FACE);

            gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera!.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera!.getProjectionMatrix());

            gl.uniform3fv(shu.eyePositionHigh, r.activeCamera!.eyeHigh);
            gl.uniform3fv(shu.eyePositionLow, r.activeCamera!.eyeLow);

            gl.uniform4fv(shu.uColor, this.color);
            //@ts-ignore
            gl.uniform1f(shu.uOpacity, this._entity!._entityCollection._fadingOpacity);
            gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesHighBuffer as WebGLBuffer);
            gl.vertexAttribPointer(
                sha.aVertexPositionHigh,
                this._verticesHighBuffer!.itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesLowBuffer as WebGLBuffer);
            gl.vertexAttribPointer(
                sha.aVertexPositionLow,
                this._verticesLowBuffer!.itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer as WebGLBuffer);
            gl.drawElements(
                r.handler.gl!.TRIANGLE_STRIP,
                this._indexBuffer!.numItems,
                gl.UNSIGNED_INT,
                0
            );

            gl.enable(gl.CULL_FACE);
        }
    }

    drawPicking() {
        if (this.visibility && this._verticesHigh.length) {
            let r = this._renderNode!.renderer!;

            let gl = r.handler.gl!;

            let sh = r.handler.programs.strip,
                p = sh._program,
                sha = p.attributes,
                shu = p.uniforms;

            sh.activate();

            gl.disable(gl.CULL_FACE);

            gl.uniformMatrix4fv(shu.viewMatrix, false, r.activeCamera!.getViewMatrix());
            gl.uniformMatrix4fv(shu.projectionMatrix, false, r.activeCamera!.getProjectionMatrix());

            gl.uniform3fv(shu.eyePositionHigh, r.activeCamera!.eyeHigh);
            gl.uniform3fv(shu.eyePositionLow, r.activeCamera!.eyeLow);
            //@ts-ignore
            gl.uniform1f(shu.uOpacity, this._entity._entityCollection._fadingOpacity != 0 ? 1 : 0);

            gl.uniform4fv(shu.uColor, this._pickingColor);
            gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesHighBuffer as WebGLBuffer);
            gl.vertexAttribPointer(
                sha.aVertexPositionHigh,
                this._verticesHighBuffer!.itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesLowBuffer as WebGLBuffer);
            gl.vertexAttribPointer(
                sha.aVertexPositionLow,
                this._verticesLowBuffer!.itemSize,
                gl.FLOAT,
                false,
                0,
                0
            );
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer as WebGLBuffer);
            gl.drawElements(
                r.handler.gl!.TRIANGLE_STRIP,
                this._indexBuffer!.numItems,
                gl.UNSIGNED_INT,
                0
            );

            gl.enable(gl.CULL_FACE);
        }
    }

    /**
     * Delete buffers
     * @protected
     */
    protected _deleteBuffers() {
        if (this._renderNode && this._renderNode.renderer) {
            let r = this._renderNode.renderer,
                gl = r.handler.gl!;

            gl.deleteBuffer(this._indexBuffer as WebGLBuffer);
            gl.deleteBuffer(this._verticesHighBuffer as WebGLBuffer);
            gl.deleteBuffer(this._verticesLowBuffer as WebGLBuffer);
        }
        this._verticesHighBuffer = null;
        this._verticesLowBuffer = null;
        this._indexBuffer = null;
    }

    protected _createBuffers() {
        if (this._renderNode && this._renderNode.renderer && this._renderNode.renderer.isInitialized()) {
            let gl = this._renderNode.renderer.handler.gl!;

            gl.deleteBuffer(this._indexBuffer as WebGLBuffer);
            gl.deleteBuffer(this._verticesHighBuffer as WebGLBuffer);
            gl.deleteBuffer(this._verticesLowBuffer as WebGLBuffer);

            this._verticesHighBuffer = this._renderNode.renderer.handler.createArrayBuffer(
                new Float32Array(this._verticesHigh),
                3,
                this._verticesHigh.length / 3
            );
            this._verticesLowBuffer = this._renderNode.renderer.handler.createArrayBuffer(
                new Float32Array(this._verticesLow),
                3,
                this._verticesLow.length / 3
            );
            this._indexBuffer = this._renderNode.renderer.handler.createElementArrayBuffer(
                new Uint32Array(this._indexes),
                1,
                this._indexes.length
            );
        }
    }

    public addEdge3v(p2: Vec3, p3: Vec3) {
        let length = this._path.length;

        if (length === 0) {
            this._path.push([p2.clone(), p3.clone()]);
        } else {
            let p0 = this._path[length - 1][0],
                p1 = this._path[length - 1][1];

            this._path.push([p2.clone(), p3.clone()]);

            let vHigh = this._verticesHigh,
                vLow = this._verticesLow;

            let gs = this._gridSize,
                gs1 = gs + 1;

            let p = new Vec3();

            let last = this._verticesHigh.length / 3,
                ind = last;

            let d = Math.abs(p0.sub(p1).normal().dot(p2.sub(p0).normal()));

            for (let i = 0; i < gs1; i++) {
                let di = i / gs;
                let p02 = p0.lerp(p2, di),
                    p13 = p1.lerp(p3, di);

                for (let j = 0; j < gs1; j++) {
                    let dj = j / gs;
                    let p01 = p0.lerp(p1, dj),
                        p23 = p2.lerp(p3, dj);

                    if (d !== 1.0) {
                        new Line3(p02, p13).intersects(new Line3(p01, p23), p);
                    } else {
                        p = p23;
                    }

                    ind = last + i * gs1 + j;

                    Vec3.doubleToTwoFloats(p, _tempHigh, _tempLow);

                    let ind3 = ind * 3;

                    vHigh[ind3] = _tempHigh.x;
                    vHigh[ind3 + 1] = _tempHigh.y;
                    vHigh[ind3 + 2] = _tempHigh.z;

                    vLow[ind3] = _tempLow.x;
                    vLow[ind3 + 1] = _tempLow.y;
                    vLow[ind3 + 2] = _tempLow.z;

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
        if (this._path[index]) {
            this._path[index][0] = p2;
            this._path[index][1] = p3;

            if (this._path.length > 1) {
                let gs = this._gridSize,
                    gs1 = gs + 1;

                let vSize = gs1 * gs1;

                let p = new Vec3();

                let vHigh = this._verticesHigh,
                    vLow = this._verticesLow;

                if (index === this._path.length - 1) {
                    let p0 = this._path[index - 1][0],
                        p1 = this._path[index - 1][1];

                    let prev = this._verticesHigh.length / 3 - vSize,
                        ind = prev;

                    let d = Math.abs(p0.sub(p1).normal().dot(p2.sub(p0).normal()));

                    for (let i = 0; i < gs1; i++) {
                        let di = i / gs;
                        let p02 = p0.lerp(p2, di),
                            p13 = p1.lerp(p3, di);

                        for (let j = 0; j < gs1; j++) {
                            let dj = j / gs;
                            let p01 = p0.lerp(p1, dj),
                                p23 = p2.lerp(p3, dj);

                            if (d !== 1.0) {
                                new Line3(p02, p13).intersects(new Line3(p01, p23), p);
                            } else {
                                p = p23;
                            }

                            ind = prev + i * gs1 + j;

                            Vec3.doubleToTwoFloats(p, _tempHigh, _tempLow);

                            let ind3 = ind * 3;

                            vHigh[ind3] = _tempHigh.x;
                            vHigh[ind3 + 1] = _tempHigh.y;
                            vHigh[ind3 + 2] = _tempHigh.z;

                            vLow[ind3] = _tempLow.x;
                            vLow[ind3 + 1] = _tempLow.y;
                            vLow[ind3 + 2] = _tempLow.z;
                        }
                    }
                } else if (index === 0) {
                    let ind = 0;

                    let p0 = p2,
                        p1 = p3;

                    p2 = this._path[1][0];
                    p3 = this._path[1][1];

                    for (let i = 0; i < gs1; i++) {
                        let di = i / gs;
                        let p02 = p0.lerp(p2, di),
                            p13 = p1.lerp(p3, di);

                        for (let j = 0; j < gs1; j++) {
                            let dj = j / gs;
                            let p01 = p0.lerp(p1, dj),
                                p23 = p2.lerp(p3, dj);

                            new Line3(p02, p13).intersects(new Line3(p01, p23), p);

                            ind = i * gs1 + j;

                            Vec3.doubleToTwoFloats(p, _tempHigh, _tempLow);

                            let ind3 = ind * 3;

                            vHigh[ind3] = _tempHigh.x;
                            vHigh[ind3 + 1] = _tempHigh.y;
                            vHigh[ind3 + 2] = _tempHigh.z;

                            vLow[ind3] = _tempLow.x;
                            vLow[ind3 + 1] = _tempLow.y;
                            vLow[ind3 + 2] = _tempLow.z;
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
                        let di = i / gs;
                        let p02 = p0.lerp(p2, di),
                            p35 = p3.lerp(p5, di),
                            p24 = p2.lerp(p4, di),
                            p13 = p1.lerp(p3, di);

                        for (let j = 0; j < gs1; j++) {
                            let dj = j / gs;
                            let p01 = p0.lerp(p1, dj),
                                p23 = p2.lerp(p3, dj);

                            // prev
                            new Line3(p02, p13).intersects(new Line3(p01, p23), p);

                            let ij = i * gs1 + j;

                            ind = prev + ij;

                            Vec3.doubleToTwoFloats(p, _tempHigh, _tempLow);

                            let ind3 = ind * 3;

                            vHigh[ind3] = _tempHigh.x;
                            vHigh[ind3 + 1] = _tempHigh.y;
                            vHigh[ind3 + 2] = _tempHigh.z;

                            vLow[ind3] = _tempLow.x;
                            vLow[ind3 + 1] = _tempLow.y;
                            vLow[ind3 + 2] = _tempLow.z;

                            // next
                            let p45 = p4.lerp(p5, dj);

                            p23 = p2.lerp(p3, dj);

                            new Line3(p24, p35).intersects(new Line3(p23, p45), p);

                            ind = next + ij;

                            Vec3.doubleToTwoFloats(p, _tempHigh, _tempLow);

                            ind3 = ind * 3;

                            vHigh[ind3] = _tempHigh.x;
                            vHigh[ind3 + 1] = _tempHigh.y;
                            vHigh[ind3 + 2] = _tempHigh.z;

                            vLow[ind3] = _tempLow.x;
                            vLow[ind3 + 1] = _tempLow.y;
                            vLow[ind3 + 2] = _tempLow.z;
                        }
                    }
                }

                this._createBuffers();
            }
        } else {
            console.warn(`strip index ${index} is out of range`);
        }
    }

    public removeEdge(index: number) {
        this._path.splice(index, 1);
        this.setPath([].concat(this._path));
    }

    public setGridSize(gridSize: number) {
        this._gridSize = gridSize;
        this.setPath([].concat(this._path));
    }

    public getPath(): TStrip[] {
        return this._path;
    }

    public setPath(path: TStripExt[]) {
        this._verticesHigh = [];
        this._verticesLow = [];
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

            this.addEdge3v(p0 as Vec3, p1 as Vec3);
        }
    }

    public insertEdge3v(p0: Vec3, p1: Vec3, index: number) {
        if (index < this._path.length) {
            let p = [].concat(this._path);
            p.splice(index, 0, [p0, p1]);
            this.setPath(p);
        } else if (index === this._path.length) {
            this.addEdge3v(p0, p1);
        }
    }
}

export {Strip};
