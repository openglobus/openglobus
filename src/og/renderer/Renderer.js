'use strict';

import { Camera } from '../camera/Camera.js';
import { Framebuffer } from '../webgl/Framebuffer.js';
import { Multisample } from '../webgl/Multisample.js';
import { randomi } from '../math.js';
import { RendererEvents } from './RendererEvents.js';
import { Vec2 } from '../math/Vec2.js';
import { Vec3 } from '../math/Vec3.js';
import { cons } from '../cons.js';
import { Program } from '../webgl/Program.js';
import { input } from '../input/input.js';
import { isEmpty } from '../utils/shared.js';

window.SCREEN = 0;
const BUFFER_COUNT = 3;

/**
 * Represents high level WebGL context interface that starts WebGL handler working in real time.
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

    this._msaa = params.msaa || 0;
    /**
     * Whole scene rendering framebuffer.
     * @public
     * @type {Array.<og.webgl.Framebuffer|og.webgl.Framebuffer>}
     */
    this.sceneFramebuffers = [];

    this.sceneFramebuffer = null;

    /**
     * Stores current picking rgb color.
     * @private
     * @type {Array.<number,number,number>}
     */
    this._currPickingColor = new Uint8Array(4);

    /**
     * Stores previous picked rgb color.
     * @private
     * @type {Array.<number,number,number>}
     */
    this._prevPickingColor = [0, 0, 0];

    this._tempPickingColor_ = new Uint8Array(4);

    this._initialized = false;

    if (params.autoActivate || isEmpty(params.autoActivate)) {
        this.initialize();
        this.start();
    }
};

Renderer.__pickingCallbackCounter__ = 0;

/**
 * Adds picking rendering callback function.
 * @param {object} sender - Callback context.
 * @param {og.Renderer~pickingCallback} callback - Rendering callback.
 * @returns {Number} Handler id
 */
Renderer.prototype.addPickingCallback = function (sender, callback) {
    var id = Renderer.__pickingCallbackCounter__++;
    this._pickingCallbacks.push({ "id": id, "callback": callback, "sender": sender });
    return id;
};

/**
 * Removes picking rendering callback function.
 * @param {Number} id - Handler id to remove.
 */
Renderer.prototype.removePickingCallback = function (id) {
    for (var i = 0; i < this._pickingCallbacks.length; i++) {
        if (id === this._pickingCallbacks[i].id) {
            this._pickingCallbacks.splice(i, 1);
            break;
        }
    }
};

Renderer.prototype.getPickingObjectByColor = function (r, g, b) {
    return this.colorObjects[r + "_" + g + "_" + b];
};

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
};

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
 */
Renderer.prototype.removeControl = function (control) {
    control.remove();
};

/**
 * Renderer initialization.
 * @public
 */
Renderer.prototype.initialize = function () {

    if (this._initialized)
        return;
    else
        this._initialized = true;

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

    this.handler.addProgram(new Program("screenFrame", {
        uniforms: {
            texture: "sampler2d"
        },
        attributes: {
            corners: "vec3",
        },
        vertexShader:
            `attribute vec2 corners;
            
            varying vec2 tc;
            void main(void) {
                gl_Position = vec4(corners, 0.0, 1.0);
                tc = corners * 0.5 + 0.5;
            }`,
        fragmentShader:
            `precision highp float;
            uniform sampler2D texture;
            
            varying vec2 tc;
            
            void main(void) {
                gl_FragColor = texture2D( texture, tc );
            }`
    }));

    this.pickingFramebuffer = new Framebuffer(this.handler, {
        'width': 640,
        'height': 480
    });
    this.pickingFramebuffer.init();

    if (this._msaa) {
        this.sceneFramebuffer = new Multisample(this.handler, {
            size: BUFFER_COUNT,
            msaa: this._msaa
        });
        this.sceneFramebuffer.init();
        for (let i = 0; i < BUFFER_COUNT; i++) {
            this.sceneFramebuffers[i] = new Framebuffer(this.handler, { useDepth: false });
            this.sceneFramebuffers[i].init();
        }
        this.readPixels = this._readPixelsMSAA;
        this._fnScreenFrame = this._screenFrameMSAA;
    } else {
        this.sceneFramebuffer = new Framebuffer(this.handler, { size: BUFFER_COUNT });
        this.sceneFramebuffer.init();
        this.readPixels = this._readPixelsNoMSAA;
        this._fnScreenFrame = this._screenFrameNoMSAA;
    }

    this.handler.onCanvasResize = (obj) => {
        this.activeCamera.setAspectRatio(obj.clientWidth / obj.clientHeight);

        this.sceneFramebuffer.setSize(obj.clientWidth, obj.clientHeight);
        for (var i = 0; i < this.sceneFramebuffers.length; i++) {
            this.sceneFramebuffers[i].setSize(obj.clientWidth, obj.clientHeight, true);
        }

        this.events.dispatch(this.events.resize, obj);
    };

    this._screenFrameCornersBuffer = this.handler.createArrayBuffer(new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), 2, 4);

    let temp = this.controls;
    this.controls = {};
    for (let i in temp) {
        this.addControl(temp[i]);
    }
};

Renderer.prototype.removeNode = function (renderNode) {
    renderNode.remove();
};

/**
 * Adds render node to the renderer.
 * @public
 * @param {og.scene.RenderNode} renderNode - Render node.
 */
Renderer.prototype.addNode = function (renderNode) {
    if (!this.renderNodes[renderNode.name]) {
        renderNode.assign(this);
        this._renderNodesArr.unshift(renderNode);
        this.renderNodes[renderNode.name] = renderNode;
    } else {
        cons.logWrn("og.Renderer(370) - node name: " + renderNode.name + " allready exists.");
    }
};

/**
 * Adds render nodes array to the renderer.
 * @public
 * @param {Array.<og.scene.RenderNode>} nodesArr - Render nodes array.
 */
Renderer.prototype.addNodes = function (nodesArr) {
    for (var i = 0; i < nodesArr.length; i++) {
        this.addNode(nodesArr[i]);
    }
};

Renderer.prototype.getMSAA = function(){
    return this._msaa;
};

/**
 * Draw nodes.
 * @public
 */
Renderer.prototype.draw = function () {

    this.activeCamera.checkMoveEnd();

    var e = this.events;
    e.handleEvents();
    e.dispatch(e.draw, this);

    let sfb = this.sceneFramebuffer;
    sfb.activate();

    var h = this.handler;

    h.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    h.gl.clear(h.gl.COLOR_BUFFER_BIT | h.gl.DEPTH_BUFFER_BIT);

    h.gl.activeTexture(h.gl.TEXTURE0);
    h.gl.bindTexture(h.gl.TEXTURE_2D, h.transparentTexture);

    //Rendering scene nodes
    var rn = this._renderNodesArr;
    var i = rn.length;
    while (i--) {
        rn[i].drawNode();
    }

    sfb.deactivate();

    for (let i = 0; i < this.sceneFramebuffers.length; i++) {
        sfb.blit(this.sceneFramebuffers[i], i);
    }

    //Rendering picking callbacks and refresh pickingColor
    this._drawPickingBuffer();

    //Rendering on the screen
    this._fnScreenFrame();

    e.mouseState.moving = false;
    e.touchState.moving = false;
};

Renderer.prototype._screenFrameMSAA = function () {
    var h = this.handler;
    var sh = h.programs.screenFrame,
        p = sh._program,
        gl = h.gl;

    gl.disable(gl.DEPTH_TEST);
    sh.activate();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFramebuffers[window.SCREEN].textures[0]);
    //gl.bindTexture(gl.TEXTURE_2D, this.pickingFramebuffer.textures[0]);
    gl.uniform1i(p.uniforms.texture, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._screenFrameCornersBuffer);
    gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST);
};

Renderer.prototype._screenFrameNoMSAA = function () {
    var h = this.handler;
    var sh = h.programs.screenFrame,
        p = sh._program,
        gl = h.gl;

    gl.disable(gl.DEPTH_TEST);
    sh.activate();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFramebuffer.textures[window.SCREEN]);
    //gl.bindTexture(gl.TEXTURE_2D, this.pickingFramebuffer.textures[0]);
    gl.uniform1i(p.uniforms.texture, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._screenFrameCornersBuffer);
    gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST);
};

Renderer.prototype._readPixelsMSAA = function (res, x, y, screen = 0) {
    this.sceneFramebuffers[screen].readPixels(res, x, y);
};

Renderer.prototype._readPixelsNoMSAA = function (res, x, y, screen = 0) {
    this.sceneFramebuffer.readPixels(res, x, y, screen);
};

/**
 * Returns picking object by screen coordinates
 * @param {number} x - X position
 * @param {number} y - Y position
 * @return {Object} -
 */
Renderer.prototype.getPickingObject = function (x, y) {
    let cnv = this.renderer.handler.canvas,
        c = new Uint8Array(3);
    this.readPixels(c, x / cnv.width, (cnv.height - y) / cnv.height, 1);
    return this.colorObjects[c[0] + "_" + c[1] + "_" + c[2]];
};

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

        var pc = this._currPickingColor;
        if (ts.x || ts.y) {
            this.pickingFramebuffer.readPixels(pc, ts.nx, 1.0 - ts.ny);
            if (!(pc[0] || pc[1] || pc[2]))
                this.readPixels(pc, ts.nx, 1.0 - ts.ny, 1);
            //this.sceneFramebuffers[1].readPixels(pc, ts.nx, 1.0 - ts.ny);
        } else {
            this.pickingFramebuffer.readPixels(pc, ms.nx, 1.0 - ms.ny);
            if (!(pc[0] || pc[1] || pc[2]))
                this.readPixels(pc, ms.nx, 1.0 - ms.ny, 1);
            //this.sceneFramebuffers[1].readPixels(pc, ms.nx, 1.0 - ms.ny);
        }
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