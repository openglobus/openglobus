"use strict";

import * as arial from "../arial.js";
import { Camera } from "../camera/Camera.js";
import { cons } from "../cons.js";
import { depth } from "../shaders/depth.js";
import { LabelWorker } from "../entity/LabelWorker.js";
import { input } from "../input/input.js";
import { randomi } from "../math.js";
import { Vec2 } from "../math/Vec2.js";
import { Vec3 } from "../math/Vec3.js";
import { pickingMask } from "../shaders/pickingMask.js";
import { screenFrame } from "../shaders/screenFrame.js";
import { toneMapping } from "../shaders/toneMapping.js";
import { FontAtlas } from "../utils/FontAtlas.js";
import { isEmpty } from "../utils/shared.js";
import { TextureAtlas } from "../utils/TextureAtlas.js";
import { Framebuffer, Multisample } from "../webgl/index.js";
import { RendererEvents } from "./RendererEvents.js";

let __pickingCallbackCounter__ = 0;

let __depthCallbackCounter__ = 0;

let __distanceCallbackCounter__ = 0;

/**
 * Represents high level WebGL context interface that starts WebGL handler working in real time.
 * @class
 * @param {Handler} handler - WebGL handler context.
 * @param {Object} [params] - Renderer parameters:
 * @fires og.RendererEvents#draw
 * @fires og.RendererEvents#resize
 * @fires og.RendererEvents#mousemove
 * @fires og.RendererEvents#mousestop
 * @fires og.RendererEvents#lclick
 * @fires og.RendererEvents#rclick
 * @fires og.RendererEvents#mclick
 * @fires og.RendererEvents#ldblclick
 * @fires og.RendererEvents#rdblclick
 * @fires og.RendererEvents#mdblclick
 * @fires og.RendererEvents#lup
 * @fires og.RendererEvents#rup
 * @fires og.RendererEvents#mup
 * @fires og.RendererEvents#ldown
 * @fires og.RendererEvents#rdown
 * @fires og.RendererEvents#mdown
 * @fires og.RendererEvents#lhold
 * @fires og.RendererEvents#rhold
 * @fires og.RendererEvents#mhold
 * @fires og.RendererEvents#mousewheel
 * @fires og.RendererEvents#touchstart
 * @fires og.RendererEvents#touchend
 * @fires og.RendererEvents#touchcancel
 * @fires og.RendererEvents#touchmove
 * @fires og.RendererEvents#doubletouch
 * @fires og.RendererEvents#touchleave
 * @fires og.RendererEvents#touchenter
 */

let __resizeTimeout;

class Renderer {
    constructor(handler, params = {}) {

        /**
         * Div element with WebGL canvas. Assigned in Globe class.
         * @public
         * @type {object}
         */
        this.div = null;

        /**
         * WebGL handler context.
         * @public
         * @type {Handler}
         */
        this.handler = handler;

        this.exposure = 3.01;

        this.gamma = 0.47;

        this.whitepoint = 1.0;

        this.brightThreshold = 0.9;

        /**
         * Render nodes drawing queue.
         * @private
         * @type {Array.<scene.RenderNode>}
         */
        this._renderNodesArr = [];

        /**
         * Render nodes store for the comfortable access by the node name.
         * @public
         * @type {Object.<og.scene.RenderNode>}
         */
        this.renderNodes = {};

        /**
         * Current active camera.
         * @public
         * @type {Camera}
         */
        this.activeCamera = null;

        /**
         * Renderer events. Represents interface for setting events like mousemove, draw, keypress etc.
         * @public
         * @type {RendererEvents}
         */
        this.events = new RendererEvents(this);

        /**
         * OpenGlobus controls array.
         * @public
         * @type {Object}
         */
        this.controls = {};

        if (params.controls) {
            for (let i in params.controls) {
                this.controls[params.controls[i].name] = params.controls[i];
            }
        }

        /**
         * Provides exchange between controls.
         * @public
         * @type {Object}
         */
        this.controlsBag = {};

        /**
         * Hash table for drawing objects.
         * @public
         * @type {Object}
         */
        this.colorObjects = new Map();

        /**
         * Color picking objects rendering queue.
         * @type {Array.<Renderer~pickingCallback>}
         */
        this._pickingCallbacks = [];

        /**
         * Picking objects(labels and billboards) framebuffer.
         * @public
         * @type {Framebuffer}
         */
        this.pickingFramebuffer = null;

        this._tempPickingPix_ = null;

        /**
         * @public
         * @type {Framebuffer}
         */
        this.distanceFramebuffer = null;

        /**
         * @type {Array.<Renderer~distanceCallback>}
         */
        this._distanceCallbacks = [];

        this._tempDistancePix_ = null;

        /**
         * Depth objects rendering queue.
         * @type {Array.<Renderer~depthCallback>}
         */
        this._depthCallbacks = [];

        this.depthFramebuffer = null;

        let urlParams = new URLSearchParams(location.search);
        this._msaa = Number(urlParams.get('og_msaa') || params.msaa || 4);
        this._internalFormat = "RGBA16F";
        this._format = "RGBA";
        this._type = "FLOAT";

        this.sceneFramebuffer = null;

        this.blitFramebuffer = null;

        this.toneMappingFramebuffer = null;

        this._initialized = false;

        /**
         * Texture atlas for the billboards images. One atlas per node.
         * @protected
         * @type {utils.TextureAtlas}
         */
        this.billboardsTextureAtlas = new TextureAtlas();
        //TODO global texture atlas
        /**
         * Texture atlas for the billboards images. One atlas per node.
         * @protected
         * @type {utils.TextureAtlas}
         */
        this.geoObjectsTextureAtlas = new TextureAtlas();

        /**
         * Texture font atlas for the font families and styles. One atlas per node.
         * @public
         * @type {utils.FontAtlas}
         */
        this.fontAtlas = new FontAtlas();

        this._entityCollections = [];

        this._currentOutput = "screen";

        this._fnScreenFrame = null;

        this.labelWorker = new LabelWorker(4);

        this.__useDistanceFramebuffer__ = true;

        if (params.autoActivate || isEmpty(params.autoActivate)) {
            this.initialize();
            this.start();
        }
    }

    /**
     * Sets renderer events activity.
     * @param {Boolean} activity - Events activity.
     */
    setEventsActivity(activity) {
        this.events.active = activity;
    }

    addDepthCallback(sender, callback) {
        var id = __depthCallbackCounter__++;
        this._depthCallbacks.push({
            id: id, callback: callback, sender: sender
        });
        return id;
    }

    removeDepthCallback(id) {
        for (var i = 0; i < this._depthCallbacks.length; i++) {
            if (id === this._depthCallbacks[i].id) {
                this._depthCallbacks.splice(i, 1);
                break;
            }
        }
    }

    addDistanceCallback(sender, callback) {
        var id = __distanceCallbackCounter__++;
        this._distanceCallbacks.push({
            id: id, callback: callback, sender: sender
        });
        return id;
    }

    removeDistanceCallback(id) {
        for (var i = 0; i < this._distanceCallbacks.length; i++) {
            if (id === this._distanceCallbacks[i].id) {
                this._distanceCallbacks.splice(i, 1);
                break;
            }
        }
    }


    /**
     * Adds picking rendering callback function.
     * @param {object} sender - Callback context.
     * @param {Renderer~pickingCallback} callback - Rendering callback.
     * @returns {Number} Handler id
     */
    addPickingCallback(sender, callback) {
        var id = __pickingCallbackCounter__++;
        this._pickingCallbacks.push({
            id: id, callback: callback, sender: sender
        });
        return id;
    }

    /**
     * Removes picking rendering callback function.
     * @param {Number} id - Handler id to remove.
     */
    removePickingCallback(id) {
        for (var i = 0; i < this._pickingCallbacks.length; i++) {
            if (id === this._pickingCallbacks[i].id) {
                this._pickingCallbacks.splice(i, 1);
                break;
            }
        }
    }

    getPickingObject(r, g, b) {
        return this.colorObjects.get(`${r}_${g}_${b}`);
    }

    getPickingObjectArr(arr) {
        return this.colorObjects.get(`${arr[0]}_${arr[1]}_${arr[2]}`);
    }

    getPickingObject3v(vec) {
        return this.colorObjects.get(`${vec.x}_${vec.y}_${vec.z}`);
    }

    /**
     * Assign picking color to the object.
     * @public
     * @param {Object} obj - Object that pressume to be picked.
     */
    assignPickingColor(obj) {
        if (!obj._pickingColor || obj._pickingColor.isZero()) {
            let r = 0, g = 0, b = 0;
            let str = "0_0_0";
            while (!(r || g || b) || this.colorObjects.has(str)) {
                r = randomi(1, 255);
                g = randomi(1, 255);
                b = randomi(1, 255);
                str = `${r}_${g}_${b}`;
            }

            if (!obj._pickingColor) {
                obj._pickingColor = new Vec3(r, g, b);
            } else {
                obj._pickingColor.set(r, g, b);
            }

            obj._pickingColorU = new Float32Array([r / 255, g / 255, b / 255]);

            this.colorObjects.set(str, obj);
        }
    }

    /**
     * Removes picking color from object.
     * @public
     * @param {Object} obj - Object to remove picking color.
     */
    clearPickingColor(obj) {
        if (!obj._pickingColor.isZero()) {
            var c = obj._pickingColor;
            if (!c.isZero()) {
                this.colorObjects.delete(`${c.x}_${c.y}_${c.z}`);
                c.x = c.y = c.z = 0;
            }
        }
    }

    /**
     * Get the client width.
     * @public
     * @returns {number} -
     */
    getWidth() {
        return this.handler.canvas.clientWidth;
    }

    /**
     * Get the client height.
     * @public
     * @returns {number} -
     */
    getHeight() {
        return this.handler.canvas.clientHeight;
    }

    /**
     * Get center of the screen
     * @public
     * @returns {math.Vec2} -
     */
    getCenter() {
        var cnv = this.handler.canvas;
        return new Vec2(Math.round(cnv.clientWidth * 0.5), Math.round(cnv.clientHeight * 0.5));
    }

    /**
     * Add the given control to the renderer.
     * @param {control.Control} control - Control.
     */
    addControl(control) {
        control.addTo(this);
    }

    /**
     * Add the given controls array to the planet node.
     * @param {Array.<control.Control>} cArr - Control array.
     */
    addControls(cArr) {
        for (var i = 0; i < cArr.length; i++) {
            cArr[i].addTo(this);
        }
    }

    /**
     * Remove control from the renderer.
     * @param {control.Control} control  - Control.
     */
    removeControl(control) {
        control.remove();
    }

    /**
     * Renderer initialization.
     * @public
     */
    initialize() {
        if (this._initialized) {
            return;
        } else {
            this._initialized = true;
        }

        this.billboardsTextureAtlas.assignHandler(this.handler);
        this.geoObjectsTextureAtlas.assignHandler(this.handler);

        this.fontAtlas.assignHandler(this.handler);

        this.handler.setFrameCallback(() => {
            this.draw();
        });

        this.activeCamera = new Camera(this, {
            eye: new Vec3(0, 0, 0), look: new Vec3(0, 0, -1), up: new Vec3(0, 1, 0)
        });

        this.events.initialize();

        // Bind console key
        this.events.on("charkeypress", input.KEY_APOSTROPHE, function () {
            cons.setVisibility(!cons.getVisibility());
        });

        this.handler.addProgram(screenFrame());

        this.pickingFramebuffer = new Framebuffer(this.handler, {
            width: 640, height: 480, depthComponent: "DEPTH_STENCIL", renderbufferTarget: "DEPTH_STENCIL_ATTACHMENT"
        }).init();

        this._tempPickingPix_ = new Uint8Array(this.pickingFramebuffer.width * this.pickingFramebuffer.height * 4);

        this.distanceFramebuffer = new Framebuffer(this.handler, {
            width: 320, height: 240
        }).init();

        this._tempDistancePix_ = new Uint8Array(this.distanceFramebuffer.width * this.distanceFramebuffer.height * 4);

        this.depthFramebuffer = new Framebuffer(this.handler, {
            size: 2,
            internalFormat: ["RGBA", "DEPTH_COMPONENT24"],
            format: ["RGBA", "DEPTH_COMPONENT"],
            type: ["UNSIGNED_BYTE", "UNSIGNED_INT"],
            attachment: ["COLOR_ATTACHMENT", "DEPTH_ATTACHMENT"],
            useDepth: false
        }).init();

        this.screenDepthFramebuffer = new Framebuffer(this.handler, {
            useDepth: false
        }).init();

        if (this.handler.gl.type === "webgl") {
            this.sceneFramebuffer = new Framebuffer(this.handler);
            this.sceneFramebuffer.init();

            this._fnScreenFrame = this._screenFrameNoMSAA;

            this.screenTexture = {
                screen: this.sceneFramebuffer.textures[0],
                picking: this.pickingFramebuffer.textures[0],
                distance: this.distanceFramebuffer.textures[0],
                depth: this.screenDepthFramebuffer.textures[0]
            };
        } else {
            let _maxMSAA = this.getMaxMSAA(this._internalFormat);

            if (this._msaa > _maxMSAA) {
                this._msaa = _maxMSAA;
            }

            this.handler.addPrograms([toneMapping()]);

            this.handler.addPrograms([depth()]);

            this.sceneFramebuffer = new Multisample(this.handler, {
                size: 1, msaa: this._msaa, internalFormat: this._internalFormat, filter: "LINEAR"
            }).init();

            this.blitFramebuffer = new Framebuffer(this.handler, {
                size: 1,
                useDepth: false,
                internalFormat: this._internalFormat,
                format: this._format,
                type: this._type,
                filter: "NEAREST"
            }).init();

            this.toneMappingFramebuffer = new Framebuffer(this.handler, {
                useDepth: false
            }).init();

            this._fnScreenFrame = this._screenFrameMSAA;

            this.screenTexture = {
                screen: this.toneMappingFramebuffer.textures[0],
                picking: this.pickingFramebuffer.textures[0],
                distance: this.distanceFramebuffer.textures[0],
                depth: this.screenDepthFramebuffer.textures[0],
                frustum: this.depthFramebuffer.textures[0]
            };
        }

        this.handler.addProgram(pickingMask());

        this.handler.ONCANVASRESIZE = () => {
            this._resizeStart();
            this.events.dispatch(this.events.resize, this.handler.canvas);
            clearTimeout(__resizeTimeout);
            __resizeTimeout = setTimeout(() => {
                this._resizeEnd();
                this.events.dispatch(this.events.resizeend, this.handler.canvas);
            }, 320);
        };

        this.screenFramePositionBuffer = this.handler.createArrayBuffer(new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), 2, 4);

        let temp = this.controls;
        this.controls = {};
        for (let i in temp) {
            this.addControl(temp[i]);
        }

        this.outputTexture = this.screenTexture.screen;

        this.fontAtlas.initFont("arial", arial.data, arial.image);

        this._pickingMaskCoordinatesBuffer = this.handler.createArrayBuffer(new Float32Array([0, 0]), 2, 1);
    }

    resize() {
        this._resizeEnd();
    }

    setCurrentScreen(screenName) {
        this._currentOutput = screenName;
        if (this.screenTexture[screenName]) {
            this.outputTexture = this.screenTexture[screenName];
        }
    }

    _resizeStart() {
        let c = this.handler.canvas;

        this.activeCamera.setAspectRatio(c.width / c.height);
        this.sceneFramebuffer.setSize(c.width * 0.5, c.height * 0.5);
        this.blitFramebuffer && this.blitFramebuffer.setSize(c.width * 0.5, c.height * 0.5, true);
    }

    _resizeEnd() {
        let c = this.handler.canvas;

        this.activeCamera.setAspectRatio(c.width / c.height);
        this.sceneFramebuffer.setSize(c.width, c.height);
        this.blitFramebuffer && this.blitFramebuffer.setSize(c.width, c.height, true);

        this.toneMappingFramebuffer && this.toneMappingFramebuffer.setSize(c.width, c.height, true);
        this.depthFramebuffer && this.depthFramebuffer.setSize(c.clientWidth, c.clientHeight, true);
        this.screenDepthFramebuffer && this.screenDepthFramebuffer.setSize(c.clientWidth, c.clientHeight, true);

        if (this.handler.gl.type === "webgl") {
            this.screenTexture.screen = this.sceneFramebuffer.textures[0];
            this.screenTexture.picking = this.pickingFramebuffer.textures[0];
            this.screenTexture.distance = this.distanceFramebuffer.textures[0];
            this.screenTexture.depth = this.screenDepthFramebuffer.textures[0];
            this.screenTexture.frustum = this.depthFramebuffer.textures[0];
        } else {
            this.screenTexture.screen = this.toneMappingFramebuffer.textures[0];
            this.screenTexture.picking = this.pickingFramebuffer.textures[0];
            this.screenTexture.distance = this.distanceFramebuffer.textures[0];
            this.screenTexture.depth = this.screenDepthFramebuffer.textures[0];
            this.screenTexture.frustum = this.depthFramebuffer.textures[0];
        }

        this.setCurrentScreen(this._currentOutput);
    }

    removeNode(renderNode) {
        renderNode.remove();
    }

    /**
     * Adds render node to the renderer.
     * @public
     * @param {RenderNode} renderNode - Render node.
     */
    addNode(renderNode) {
        if (!this.renderNodes[renderNode.name]) {
            renderNode.assign(this);
            this._renderNodesArr.unshift(renderNode);
            this.renderNodes[renderNode.name] = renderNode;
        } else {
            cons.logWrn("Node name " + renderNode.name + " allready exists.");
        }
    }

    /**
     * Adds render node to the renderer before specific node.
     * @public
     * @param {RenderNode} renderNode - Render node.
     */
    addNodeBefore(renderNode, renderNodeBefore) {
        if (!this.renderNodes[renderNode.name]) {
            renderNode.assign(this);
            this.renderNodes[renderNode.name] = renderNode;
            for (let i = 0; i < this._renderNodesArr.length; i++) {
                if (this._renderNodesArr[i].isEqual(renderNodeBefore)) {
                    this._renderNodesArr.splice(i, 0, renderNode);
                    break;
                }
            }
            this._renderNodesArr.unshift(renderNode);
        } else {
            cons.logWrn("Node name " + renderNode.name + " allready exists.");
        }
    }

    /**
     * Adds render nodes array to the renderer.
     * @public
     * @param {Array.<scene.RenderNode>} nodesArr - Render nodes array.
     */
    addNodes(nodesArr) {
        for (var i = 0; i < nodesArr.length; i++) {
            this.addNode(nodesArr[i]);
        }
    }

    getMaxMSAA(internalFormat) {
        var gl = this.handler.gl;
        let samples = gl.getInternalformatParameter(gl.RENDERBUFFER, gl[internalFormat], gl.SAMPLES);
        return samples[0];
    }

    getMSAA() {
        return this._msaa;
    }

    /**
     * TODO: replace with cahce frendly linked list by bilboardHandler, label handler etc.
     */
    enqueueEntityCollectionsToDraw(ecArr) {
        this._entityCollections.push.apply(this._entityCollections, ecArr);
    }

    /**
     * Draws entity collections.
     * @public
     * @param {Array<og.EntityCollection>} ec - Entity collection array.
     */
    _drawOpaqueEntityCollections() {
        let ec = this._entityCollections;

        if (ec.length) {
            let gl = this.handler.gl;
            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

            //geoObject
            let i = ec.length;
            while (i--) {
                let eci = ec[i];
                if (ec[i]._fadingOpacity) {
                    eci.events.dispatch(eci.events.draw, eci);
                    ec[i].geoObjectHandler.draw();
                }
            }

            // pointClouds pass
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].pointCloudHandler.draw();
            }
        }
    }


    /**
     * Draws entity collections.
     * @public
     * @param {Array<og.EntityCollection>} ec - Entity collection array.
     */
    _drawTransparentEntityCollections() {
        let ec = this._entityCollections;

        if (ec.length) {
            let gl = this.handler.gl;

            gl.enable(gl.BLEND);
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

            // billboards pass
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.billboardsTextureAtlas.texture);

            let i = ec.length;
            while (i--) {
                var eci = ec[i];
                eci._fadingOpacity && eci.billboardHandler.draw();
            }

            // labels pass
            let fa = this.fontAtlas.atlasesArr;
            for (i = 0; i < fa.length; i++) {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, fa[i].texture);
            }

            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].labelHandler.draw();
            }

            // rays
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].rayHandler.draw();
            }

            // polyline pass
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].polylineHandler.draw();
            }

            // Strip pass
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].stripHandler.draw();
            }
        }
    }

    _clearEntityCollectionQueue() {
        this._entityCollections.length = 0;
        this._entityCollections = [];
    }

    /**
     * Draw nodes.
     * @public
     */
    draw() {
        this.activeCamera.checkMoveEnd();

        let e = this.events;
        e.handleEvents();

        let sceneFramebuffer = this.sceneFramebuffer;
        sceneFramebuffer.activate();

        let h = this.handler, gl = h.gl;

        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        e.dispatch(e.draw, this);

        let frustums = this.activeCamera.frustums;

        let pointerEvent = e.pointerEvent() || this.activeCamera.isMoving;

        // Rendering scene nodes and entityCollections
        let rn = this._renderNodesArr;
        let k = frustums.length;
        while (k--) {
            this.activeCamera.setCurrentFrustum(k);
            gl.clear(gl.DEPTH_BUFFER_BIT);

            let i = rn.length;
            while (i--) {
                rn[i].preDrawNode();
            }

            this._drawOpaqueEntityCollections();

            i = rn.length;
            while (i--) {
                rn[i].drawNode();
            }

            this._drawTransparentEntityCollections();
            this._clearEntityCollectionQueue();

            if (pointerEvent) {
                this._drawPickingBuffer();
                this.__useDistanceFramebuffer__ && this._drawDistanceBuffer();
            }
        }

        sceneFramebuffer.deactivate();

        this.blitFramebuffer && sceneFramebuffer.blitTo(this.blitFramebuffer, 0);

        if (pointerEvent) {
            // It works ONLY for 0 (closest) frustum
            if (h.isWebGl2()) {
                this._drawDepthBuffer();
            }
            this._readPickingBuffer();
            this.__useDistanceFramebuffer__ && this._readDistanceBuffer();
        }

        // Tone mapping followed by rendering on the screen
        this._fnScreenFrame();

        e.dispatch(e.postdraw, this);

        e.mouseState.wheelDelta = 0;
        e.mouseState.justStopped = false;
        e.mouseState.moving = false;
        e.touchState.moving = false;
    }

    _screenFrameMSAA() {
        var h = this.handler;

        var sh = h.programs.toneMapping, p = sh._program, gl = h.gl;

        gl.disable(gl.DEPTH_TEST);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenFramePositionBuffer);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        this.toneMappingFramebuffer.activate();

        sh.activate();

        // screen texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.blitFramebuffer.textures[0]);
        gl.uniform1i(p.uniforms.hdrBuffer, 0);

        gl.uniform1f(p.uniforms.gamma, this.gamma);
        gl.uniform1f(p.uniforms.exposure, this.exposure);
        gl.uniform1f(p.uniforms.whitepoint, this.whitepoint);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.toneMappingFramebuffer.deactivate();

        // SCREEN PASS
        sh = h.programs.screenFrame;
        p = sh._program;
        gl = h.gl;
        sh.activate();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);
        gl.uniform1i(p.uniforms.texture, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);
    }

    _screenFrameNoMSAA() {

        let h = this.handler;
        let sh = h.programs.screenFrame, p = sh._program, gl = h.gl;

        gl.disable(gl.DEPTH_TEST);
        sh.activate();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);
        gl.uniform1i(p.uniforms.texture, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenFramePositionBuffer);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.enable(gl.DEPTH_TEST);
    }

    /**
     * Draw picking objects framebuffer.
     * @private
     */
    _drawPickingBuffer() {
        this.pickingFramebuffer.activate();

        let h = this.handler;
        let gl = h.gl;

        if (this.activeCamera.isFirstPass) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        } else {
            gl.clear(gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        }

        //
        // draw picking mask
        //
        h.programs.pickingMask.activate();
        let sh = h.programs.pickingMask._program;
        let shu = sh.uniforms, sha = sh.attributes;

        let /*ts = this.events.touchState,*/
            ms = this.events.mouseState;

        gl.disable(gl.DEPTH_TEST);

        gl.enable(gl.STENCIL_TEST);
        gl.colorMask(false, false, false, false);
        gl.stencilFunc(gl.ALWAYS, 2, 0xFF);
        gl.stencilOp(gl.REPLACE, gl.ZERO, gl.REPLACE);

        gl.uniform2f(shu.offset, (ms.nx - 0.5) * 2, (0.5 - ms.ny) * 2);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._pickingMaskCoordinatesBuffer);
        gl.vertexAttribPointer(sha.coordinates, this._pickingMaskCoordinatesBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.POINTS, 0, this._pickingMaskCoordinatesBuffer.numItems);

        gl.enable(gl.DEPTH_TEST);

        //
        // draw picking scenes
        //
        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.EQUAL, 2, 0xFF);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

        gl.disable(gl.BLEND);

        let dp = this._pickingCallbacks;
        for (let i = 0, len = dp.length; i < len; i++) {
            /**
             * This callback renders picking frame.
             * @callback og.Renderer~pickingCallback
             */
            dp[i].callback.call(dp[i].sender);
        }

        gl.enable(gl.BLEND);

        gl.disable(gl.STENCIL_TEST);

        this.pickingFramebuffer.deactivate();
    }

    /**
     * Draw picking objects framebuffer.
     * @private
     */
    _drawDistanceBuffer() {
        this.distanceFramebuffer.activate();

        let h = this.handler;
        let gl = h.gl;

        if (this.activeCamera.isFirstPass) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        } else {
            gl.clear(gl.DEPTH_BUFFER_BIT);
        }

        gl.disable(gl.BLEND);

        let dp = this._distanceCallbacks;
        let i = dp.length;
        while (i--) {
            /**
             * This callback renders distance frame.
             * @callback og.Renderer~distanceCallback
             */
            dp[i].callback.call(dp[i].sender);
        }

        gl.enable(gl.BLEND);

        this.distanceFramebuffer.deactivate();
    }

    _drawDepthBuffer() {
        this.depthFramebuffer.activate();

        var h = this.handler;
        var gl = h.gl;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);

        var dp = this._depthCallbacks;
        var i = dp.length;
        while (i--) {
            /**
             * This callback renders depth frame.
             * @callback og.Renderer~depthCallback
             */
            dp[i].callback.call(dp[i].sender);
        }

        this.depthFramebuffer.deactivate();

        //
        // PASS to depth visualization
        this.screenDepthFramebuffer.activate();
        var sh = h.programs.depth, p = sh._program;

        gl = h.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenFramePositionBuffer);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        sh.activate();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.depthFramebuffer.textures[1]);
        gl.uniform1i(p.uniforms.depthTexture, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.screenDepthFramebuffer.deactivate();
    }

    _readPickingBuffer() {
        this.pickingFramebuffer.activate();
        this.pickingFramebuffer.readAllPixels(this._tempPickingPix_);
        this.pickingFramebuffer.deactivate();
    }

    _readDistanceBuffer() {
        this.distanceFramebuffer.activate();
        this.distanceFramebuffer.readAllPixels(this._tempDistancePix_);
        this.distanceFramebuffer.deactivate();
    }

    readPickingColor(x, y, outColor) {
        let w = this.pickingFramebuffer.width;
        let h = this.pickingFramebuffer.height;

        x = Math.round(x * w);
        y = Math.round(y * h);

        let ind = (y * w + x) * 4;

        outColor[0] = this._tempPickingPix_[ind];
        outColor[1] = this._tempPickingPix_[ind + 1];
        outColor[2] = this._tempPickingPix_[ind + 2];
    }

    readDistanceColor(x, y, outColor) {

        let w = this.distanceFramebuffer.width;
        let h = this.distanceFramebuffer.height;

        x = Math.round(x * w);
        y = Math.round(y * h);

        let ind = (y * w + x) * 4;

        outColor[0] = this._tempDistancePix_[ind];
        outColor[1] = this._tempDistancePix_[ind + 1];
        outColor[2] = this._tempDistancePix_[ind + 2];
    }

    /**
     * Function starts rendering.
     * @public
     */
    start() {
        this.handler.start();
    }
}

export { Renderer };
