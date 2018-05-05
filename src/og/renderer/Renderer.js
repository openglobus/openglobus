/**
 * @module og/renderer/Renderer
 */

'use strict';

import { Camera } from '../camera/Camera.js';
import { Framebuffer } from '../webgl/Framebuffer.js';
import { MultiFramebuffer } from '../webgl/MultiFramebuffer.js';
import { randomi } from '../math.js';
import { RendererEvents } from './RendererEvents.js';
import { Vec2 } from '../math/Vec2.js';
import { Vec3 } from '../math/Vec3.js';
import { cons } from '../cons.js';
import { ShaderProgram } from '../webgl/ShaderProgram.js';
import { types } from '../webgl/types.js';
import { input } from '../input/input.js';

/**
 * Represents high level WebGL context interface that starts WebGL handler works real time.
 * @class
 * @param {og.webgl.Handler} handler - WebGL handler context.
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
const Renderer = function (handler, params) {

    params = params || {};

    /**
     * Div element with WebGL canvas.
     * @public
     * @type {object}
     */
    this.div = null;

    /**
     * WebGL handler context.
     * @public
     * @type {og.webgl.Handler}
     */
    this.handler = handler;

    /**
     * Render nodes drawing queue.
     * @private
     * @type {Array.<og.scene.RenderNode>}
     */
    this._renderNodesArr = [];

    /**
     * Render nodes store for the comfortable access by the node name.
     * @public
     * @type {Object.<og.scene.RenderNode>}
     */
    this.renderNodes = {};

    /**
     * Cameras array.
     * @public
     * @type {Array.<og.Camera>}
     */
    this.cameras = [];

    /**
     * Current active camera.
     * @public
     * @type {og.Camera}
     */
    this.activeCamera = null;

    /**
     * Renderer events. Represents interface for setting events like mousemove, draw, keypress etc.
     * @public
     * @type {og.RendererEvents}
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
    this.colorObjects = {};

    /**
     * Color picking objects rendering queue.
     * @type {Array.<og.Renderer~pickingCallback>}
     */
    this._pickingCallbacks = [];

    /**
     * Picking objects(labels and billboards) framebuffer.
     * @public
     * @type {og.webgl.Framebuffer}
     */
    this.pickingFramebuffer = null;

    /**
     * Whole scene rendering framebuffer.
     * @public
     * @type {og.webgl.Framebuffer|og.webgl.MultiFramebuffer}
     */
    this.sceneFramebuffer = null;

    /**
     * Stores current picking rgb color.
     * @private
     * @type {Array.<number,number,number>}
     */
    this._currPickingColor = [0, 0, 0];

    /**
     * Stores previous picked rgb color.
     * @private
     * @type {Array.<number,number,number>}
     */
    this._prevPickingColor = [0, 0, 0];

    /**
     * @private
     */
    this._fnScreenFrame = null;

    if (params.autoActivate) {
        this.initialize();
        this.start();
    }
}

/**
 * Adds picking rendering callback function.
 * @param {object} sender - Callback context.
 * @param {og.Renderer~pickingCallback} callback - Rendering callback.
 */
Renderer.prototype.addPickingCallback = function (sender, callback) {
    this._pickingCallbacks.push({ "callback": callback, "sender": sender });
}

/**
 * Assign picking color to the object.
 * @public
 * @param {Object} obj - Object that pressume to be picked.
 */
Renderer.prototype.assignPickingColor = function (obj) {
    if (!obj._pickingColor || obj._pickingColor.isZero()) {
        var r = 0, g = 0, b = 0;
        var str = "0_0_0";
        while (!(r || g || b) || this.colorObjects[str]) {
            r = randomi(1, 255);
            g = randomi(1, 255);
            b = randomi(1, 255);
            str = r + "_" + g + "_" + b;
        }

        if (!obj._pickingColor)
            obj._pickingColor = new Vec3(r, g, b);
        else
            obj._pickingColor.set(r, g, b);

        this.colorObjects[str] = obj;
    }
}

/**
 * Removes picking color from object.
 * @public
 * @param {Object} obj - Object to remove picking color.
 */
Renderer.prototype.clearPickingColor = function (obj) {
    if (!obj._pickingColor.isZero()) {
        var c = obj._pickingColor;
        if (!c.isZero()) {
            this.colorObjects[c.x + "_" + c.y + "_" + c.z] = null;
            delete this.colorObjects[c.x + "_" + c.y + "_" + c.z];
            c.x = c.y = c.z = 0;
        }
    }
}

/**
 * Get the client width.
 * @public
 * @returns {number} -
 */
Renderer.prototype.getWidth = function () {
    return this.handler.canvas.width;
}

/**
 * Get the client height.
 * @public
 * @returns {number} -
 */
Renderer.prototype.getHeight = function () {
    return this.handler.canvas.height;
}

/**
 * Get center of the screen
 * @public
 * @returns {og.math.Vec2} -
 */
Renderer.prototype.getCenter = function () {
    var cnv = this.handler.canvas;
    return new Vec2(Math.round(cnv.width * 0.5), Math.round(cnv.height * 0.5));
}

/**
 * Add the given control to the renderer.
 * @param {og.control.Control} control - Control.
 */
Renderer.prototype.addControl = function (control) {
    control.addTo(this);
}

/**
 * Add the given controls array to the planet node.
 * @param {Array.<og.control.Control>} cArr - Control array.
 */
Renderer.prototype.addControls = function (cArr) {
    for (var i = 0; i < cArr.length; i++) {
        cArr[i].addTo(this);
    }
}

/**
 * Remove control from the renderer.
 * @param {og.control.Control} control  - Control.
 * @return {og.Renderer} -
 */
Renderer.prototype.removeControl = function (control) {
    var c = this.controls[control.name];
    if (c) {
        if (control.isEqual(c)) {
            this.controls[control.name] = null;
            delete this.controls[control.name];
            c.remove();
        }
    }
    return this;
}

/**
 * Renderer initialization.
 * @public
 */
Renderer.prototype.initialize = function () {
    var that = this;

    this.handler.setFrameCallback(function () {
        that.draw();
    });

    this.activeCamera = new Camera(this, {
        'eye': new Vec3(0, 0, 0),
        'look': new Vec3(0, 0, -1),
        'up': new Vec3(0, 1, 0)
    });

    this.events.initialize();

    //Bind console key
    this.events.on("charkeypress", input.KEY_APOSTROPHE, function () {
        cons.setVisibility(!cons.getVisibility());
    });

    this.handler.onCanvasResize = function (obj) {
        that.activeCamera.setAspectRatio(obj.clientWidth / obj.clientHeight);
        that.sceneFramebuffer.setSize(obj.clientWidth, obj.clientHeight);
        that.events.dispatch(that.events.resize, obj);
    };

    this.pickingFramebuffer = new Framebuffer(this.handler, {
        'width': 640,
        'height': 480
    });
    this.pickingFramebuffer.init();

    this.handler.addShaderProgram(new ShaderProgram("screenFrame", {
        uniforms: {
            texture: { type: types.SAMPLER2D }
        },
        attributes: {
            corners: { type: types.VEC3, enableArray: true },
        },
        vertexShader:
        'attribute vec2 corners;\
            \
            varying vec2 tc;\
            void main(void) {\
                gl_Position = vec4(corners, 0.0, 1.0);\
                tc = corners * 0.5 + 0.5;\
            }',
        fragmentShader:
        'precision highp float;\
            uniform sampler2D texture;\
            \
            varying vec2 tc;\
            \
            void main(void) {\
                gl_FragColor = texture2D( texture, tc );\
            }'
    }));

    //Append multiframebuffer(WEBGL_draw_buffers) extension.
    this._drawBuffersExtension = this.handler.initializeExtension("WEBGL_draw_buffers");

    if (this._drawBuffersExtension) {
        this.sceneFramebuffer = new MultiFramebuffer(this.handler, { size: 3 });
        this.sceneFramebuffer.init();

        this._fnScreenFrame = this._multiframebufferScreenFrame;
    } else {
        this.sceneFramebuffer = new Framebuffer(this.handler);
        this.sceneFramebuffer.init();

        this._fnScreenFrame = this._singleframebufferScreenFrame;
    }

    this._screenFrameCornersBuffer = this.handler.createArrayBuffer(new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), 2, 4);

    let temp = this.controls;
    this.controls = {};
    for (let i in temp) {
        this.addControl(temp[i]);
    }
}

/**
 * Adds render node to the renderer.
 * @public
 * @param {og.scene.RenderNode} renderNode - Render node.
 */
Renderer.prototype.addRenderNode = function (renderNode) {
    if (!this.renderNodes[renderNode.name]) {
        renderNode.assignRenderer(this);
        this._renderNodesArr.unshift(renderNode);
        this.renderNodes[renderNode.name] = renderNode;
    } else {
        cons.logWrn("og.Renderer(370) - node name: " + renderNode.name + " allready exists.");
    }
}

/**
 * Adds render nodes array to the renderer.
 * @public
 * @param {Array.<og.scene.RenderNode>} nodesArr - Render nodes array.
 */
Renderer.prototype.addRenderNodes = function (nodesArr) {
    for (var i = 0; i < nodesArr.length; i++) {
        this.addRenderNode(nodesArr[i]);
    }
}

/**
 * Draw nodes.
 * @public
 */
Renderer.prototype.draw = function () {

    this.activeCamera.checkMoveEnd();

    var e = this.events;
    e.handleEvents();
    e.dispatch(e.draw, this);

    var sfb = this.sceneFramebuffer;
    sfb.activate();
    var h = this.handler;
    h.clearFrame();

    h.gl.activeTexture(h.gl.TEXTURE0);
    h.gl.bindTexture(h.gl.TEXTURE_2D, h.transparentTexture);

    //Rendering scene nodes
    var rn = this._renderNodesArr;
    var i = rn.length;
    while (i--) {
        rn[i].drawNode();
    }

    sfb.deactivate();

    //Rendering picking callbacks and refresh pickingColor
    this._drawPickingBuffer();

    //Rendering on the screen
    this._fnScreenFrame();

    e.mouseState.moving = false;
    e.touchState.moving = false;
}

Renderer.prototype._multiframebufferScreenFrame = function () {
    var h = this.handler;
    var sh = h.shaderPrograms.screenFrame,
        p = sh._program,
        gl = h.gl;

    gl.disable(gl.DEPTH_TEST);
    sh.activate();
    gl.activeTexture(gl.TEXTURE0);
    //MAYBE: Could be refactored with framebuf function like getTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFramebuffer.textures[0]);
    //gl.bindTexture(gl.TEXTURE_2D, this.pickingFramebuffer.texture);
    gl.uniform1i(p.uniforms.texture, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._screenFrameCornersBuffer);
    gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST);
}

Renderer.prototype._singleframebufferScreenFrame = function () {
    var h = this.handler;
    var sh = h.shaderPrograms.screenFrame,
        p = sh._program,
        gl = h.gl;

    gl.disable(gl.DEPTH_TEST);
    sh.activate();
    gl.activeTexture(gl.TEXTURE0);
    //gl.bindTexture(gl.TEXTURE_2D, this.pickingFramebuffer.texture);
    //gl.bindTexture(gl.TEXTURE_2D, globus.planet._heightPickingFramebuffer.texture);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFramebuffer.texture);
    gl.uniform1i(p.uniforms.texture, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._screenFrameCornersBuffer);
    gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST);
}

/**
 * Returns picking object by screen coordinates
 * @param {number} x - X position
 * @param {number} y - Y position
 * @return {Object} -
 */
Renderer.prototype.getPickingObject = function (x, y) {
    var cnv = this.renderer.handler.canvas;
    var c;
    if (this._drawBuffersExtension) {
        c = this.sceneFramebuffer.readPixel(x / cnv.width, (cnv.height - y) / cnv.height, 1);
    } else {
        c = this.sceneFramebuffer.readPixel(x / cnv.width, (cnv.height - y) / cnv.height);
    }
    return this.colorObjects[c[0] + "_" + c[1] + "_" + c[2]];
}

/** 
 * Returns true if 'WEBGL_draw_buffers' extension initialized.
 * @public
 * @returns {Boolean} -
 */
Renderer.prototype.isMultiFramebufferCompatible = function () {
    return (this._drawBuffersExtension ? true : false);
}

/**
 * Draw picking objects framebuffer.
 * @private
 */
Renderer.prototype._drawPickingBuffer = function () {
    this.pickingFramebuffer.activate();

    var h = this.handler;
    var gl = h.gl;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(h.gl.BLEND);

    var dp = this._pickingCallbacks;
    var i = dp.length;
    while (i--) {
        /**
         * This callback renders picking frame.
         * @callback og.Renderer~pickingCallback
         */
        dp[i].callback.call(dp[i].sender);
    }

    this.pickingFramebuffer.deactivate();

    var ms = this.events.mouseState;
    var ts = this.events.touchState;

    if (!(ms.leftButtonHold || ms.rightButtonHold || ms.middleButtonHold)) {
        this._prevPickingColor[0] = this._currPickingColor[0];
        this._prevPickingColor[1] = this._currPickingColor[1];
        this._prevPickingColor[2] = this._currPickingColor[2];

        var pc;
        if (ts.x || ts.y) {
            pc = this.pickingFramebuffer.readPixel(ts.nx, 1.0 - ts.ny);
            if (!(pc[0] || pc[1] || pc[2]) && this._drawBuffersExtension)
                pc = this.sceneFramebuffer.readPixel(ts.nx, 1.0 - ts.ny, 1);
        } else {
            pc = this.pickingFramebuffer.readPixel(ms.nx, 1.0 - ms.ny);
            if (!(pc[0] || pc[1] || pc[2]) && this._drawBuffersExtension)
                pc = this.sceneFramebuffer.readPixel(ms.nx, 1.0 - ms.ny, 1);
        }
        this._currPickingColor = pc;
    }
};

/**
 * Function starts rendering.
 * @public
 */
Renderer.prototype.start = function () {
    this.handler.start();
}


export { Renderer };