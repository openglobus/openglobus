goog.provide('og.webgl.Handler');

goog.require('og.webgl');
goog.require('og.math');
goog.require('og.webgl.ShaderController');
goog.require('og.ImageCanvas');
goog.require('og.math.Pixel');
goog.require('og.Clock');
goog.require('og.Console');

/** 
 * A WebGL handler for accessing low-level WebGL capabilities. 
 * @class
 * @param {string} id - Canvas element id that WebGL handler assings with. If it's null or undefined creates 
 * hidden canvas and handler bacomes hidden.
 * @param {Object} [param] - Handler options:
 * @param {number} [param.anisotropy] - Anisitropy filter degree. 8 is default.
 * @param {number} [param.width] - Hidden handler width. 256 is default.
 * @param {number} [param.height] - Hidden handler height. 256 is default.
 * @param {Object} [param.context] - Native WebGL context attributes. See https://www.khronos.org/registry/webgl/specs/latest/1.0/#WEBGLCONTEXTATTRIBUTES
 * @param {Array.<string>} [param.extensions] - Additional WebGL extension list. Available by default: OES_standard_derivatives, EXT_texture_filter_anisotropic.
 */
og.webgl.Handler = function (id, params) {

    /**
     * Frame background color.
     * @public
     * @type {Object}
     * @type {number} r - Red
     * @type {number} g - Green
     * @type {number} b - Blue
     */
    this.backgroundColor = { "r": 0.41, "g": 0.41, "b": 0.41 };

    /**
     * @type {og.Clock}
     */
    this.clock = new og.Clock();

    /**
     * Draw frame time in milliseconds.
     * @public
     * @readonly
     * @type {number}
     */
    this.deltaTime = 0;

    /**
     * WebGL rendering canvas element.
     * @public
     * @type {Object}
     */
    this.canvas = null;

    /**
     * WebGL context.
     * @public
     * @type {Object}
     */
    this.gl = null;

    /**
     * Shader program controller list.
     * @public
     * @type {Object.<og.webgl.ShaderController>}
     */
    this.shaderPrograms = {};

    /**
     * Current active shader program controller.
     * @public
     * @type {og.webgl.ShaderController}
     */
    this.activeShaderProgram = null;

    /**
     * @private
     * @type {Object}
     */
    this._params = params || {};
    this._params.anisotropy = this._params.anisotropy || 8;
    var w = this._params.width;
    if (w > og.webgl.Handler.MAX_SIZE) {
        w = og.webgl.Handler.MAX_SIZE;
    }
    this._params.width = w || 256;

    var h = this._params.height;
    if (h > og.webgl.Handler.MAX_SIZE) {
        h = og.webgl.Handler.MAX_SIZE;
    }
    this._params.height = h || 256;
    this._params.context = this._params.context || {};
    this._params.extensions = this._params.extensions || [];
    this._oneByHeight = 1 / this._params.height;

    /**
     * @private
     * @type {Object}
     */
    this._pExtensions = {};

    this._id = id;
    this._lastAnimationFrameTime = 0;
    this._initialized = false;

    /**
     * Animation frame function assigned from outside(Ex. from Renderer).
     * @private
     * @type {frameCallback}
     */
    this._frameCallback = function () { };
};

/**
 * @const
 */
og.webgl.Handler.MAX_SIZE = 4096;

/**
 * Sets animation frame function.
 * @public
 * @param {callback} - Frame callback.
 */
og.webgl.Handler.prototype.setFrameCallback = function (callback) {
    callback && (this._frameCallback = callback);
};

/**
 * Creates NEAREST filter texture.
 * @public
 * @param {Object} image - Image or Canvas object.
 * @returns {Object} - WebGL texture object.
 */
og.webgl.Handler.prototype.createTexture_n = function (image) {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
};

/**
 * Creates LINEAR filter texture.
 * @public
 * @param {Object} image - Image or Canvas object.
 * @returns {Object} - WebGL texture object.
 */
og.webgl.Handler.prototype.createTexture_l = function (image) {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
};

/**
 * Creates MIPMAP filter texture.
 * @public
 * @param {Object} image - Image or Canvas object.
 * @returns {Object} - WebGL texture object.
 */
og.webgl.Handler.prototype.createTexture_mm = function (image) {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
};

/**
 * Creates ANISOTROPY filter texture.
 * @public
 * @param {Object} image - Image or Canvas object.
 * @returns {Object} - WebGL texture object.
 */
og.webgl.Handler.prototype.createTexture_af = function (image) {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameterf(gl.TEXTURE_2D, this._pExtensions.EXT_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, this._params.anisotropy);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
};

/**
 * Creates DEFAULT filter texture, ANISOTROPY is default.
 * @public
 * @param {Object} image - Image or Canvas object.
 * @returns {Object} - WebGL texture object.
 */
og.webgl.Handler.prototype.createTexture = og.webgl.Handler.prototype.createTexture_af;

/**
 * Creates cube texture.
 * @public
 * @param {Object.<string>} params - Face image urls:
 * @param {string} params.px - Positive X or right image url.
 * @param {string} params.nx - Negative X or left image url.
 * @param {string} params.py - Positive Y or up image url.
 * @param {string} params.ny - Negative Y or bottom image url.
 * @param {string} params.pz - Positive Z or face image url.
 * @param {string} params.nz - Negative Z or back image url.
 * @returns {Object} - WebGL texture object.
 */
og.webgl.Handler.prototype.loadCubeMapTexture = function (params) {
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var faces = [[params.px, gl.TEXTURE_CUBE_MAP_POSITIVE_X],
                 [params.nx, gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
                 [params.py, gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
                 [params.ny, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
                 [params.pz, gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
                 [params.nz, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]];

    var imageCanvas = new og.ImageCanvas();
    imageCanvas.fillEmpty();
    var emptyImage = imageCanvas.getImage();

    for (var i = 0; i < faces.length; i++) {
        var face = faces[i][1];
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, emptyImage);
    }

    for (var i = 0; i < faces.length; i++) {
        var face = faces[i][1];
        var image = new Image();
        image.crossOrigin = '';
        image.onload = function (texture, face, image) {
            return function () {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            }
        }(texture, face, image);
        image.src = faces[i][0];
    }
    return texture;
};

/**
 * Adds shader program to the handler.
 * @public
 * @param {og.shaderProgram.ShaderProgram} program - Shader program.
 * @param {boolean} [notActivate] - If it's true program will not compile.
 */
og.webgl.Handler.prototype.addShaderProgram = function (program, notActivate) {
    if (!this.shaderPrograms[program.name]) {
        var sc = new og.webgl.ShaderController(this, program);
        this.shaderPrograms[program.name] = sc;
        this._initShaderController(sc);
        if (notActivate)
            sc._activated = false;
    } else {
        og.console.logWrn("og.webgl.Handler:284 - shader program: '" + program.name + "' is allready exists.");
    }
};

/**
 * Removes shader program from handler.
 * @public
 * @param {og.shaderProgram.ShaderProgram} program - Shader program.
 */
og.webgl.Handler.prototype.removeShaderProgram = function (program) {
    this.shaderPrograms[program.name].remove();
};

/**
 * Adds shader programs to the handler.
 * @public
 * @param {Array.<og.shaderProgram.ShaderProgram>} programsArr - Shader program array.
 */
og.webgl.Handler.prototype.addShaderPrograms = function (programsArr) {
    for (var i = 0; i < programsArr.length; i++) {
        this.addShaderProgram(programsArr[i]);
    }
};

/**
 * Used in addShaderProgram
 * @private
 * @param {og.webgl.ShaderController}
 */
og.webgl.Handler.prototype._initShaderController = function (sc) {
    if (this._initialized) {
        sc.initialize();
        if (!this.activeShaderProgram) {
            this.activeShaderProgram = sc;
            sc.activate();
        } else {
            sc.deactivate();
            this.activeShaderProgram._program.enableAttribArrays();
            this.activeShaderProgram._program.use();
        }
    }
};

/**
 * Used in init function.
 * @private
 */
og.webgl.Handler.prototype._initShaderPrograms = function () {
    for (var p in this.shaderPrograms) {
        this._initShaderController(this.shaderPrograms[p]);
    }
};

/**
 * Initialize additional WebGL extensions.
 * @private
 * @param {string} extensionStr - Extension name.
 */
og.webgl.Handler.prototype._initExtension = function (extensionStr) {
    if (!(this._pExtensions && this._pExtensions[extensionStr]))
        this._pExtensions[extensionStr] = og.webgl.getExtension(this.gl, extensionStr);
};

/**
 * Main function that initialize handler.
 * @public
 */
og.webgl.Handler.prototype.init = function () {

    if (this._id) {
        this.canvas = document.getElementById(this._id);
    } else {
        this.canvas = document.createElement("canvas");
        this.canvas.width = this._params.width;
        this.canvas.height = this._params.height;
    }

    og.console = og.Console.getInstance();

    this.gl = og.webgl.initWebGLContext(this.canvas, this._params.context);
    this._initialized = true;

    /** Sets deafult extensions */
    this._params.extensions.push("OES_standard_derivatives");
    this._params.extensions.push("EXT_texture_filter_anisotropic");
    var i = this._params.extensions.length;
    while (i--) {
        this._initExtension(this._params.extensions[i]);
    }

    if (!this._pExtensions.EXT_texture_filter_anisotropic)
        this.createTexture = this.createTexture_mm;

    /** Initilalize shaders and rendering parameters*/
    this._initShaderPrograms();
    this._setDefaults();
};

/**
 * Sets default gl render parameters. Used in init function.
 * @private
 */
og.webgl.Handler.prototype._setDefaults = function () {
    this.activateDepthTest();
    this.setSize(this._params.width, this._params.height);
    this.gl.frontFace(this.gl.CCW);
    this.gl.cullFace(this.gl.BACK);
    this.activateFaceCulling();
    this.deactivateBlending();
};

/**
 * Activate depth test.
 * @public
 */
og.webgl.Handler.prototype.activateDepthTest = function () {
    this.gl.enable(this.gl.DEPTH_TEST);
};

/**
 * Deactivate depth test.
 * @public
 */
og.webgl.Handler.prototype.deactivateDepthTest = function () {
    this.gl.disable(this.gl.DEPTH_TEST);
};

/**
 * Activate face culling.
 * @public
 */
og.webgl.Handler.prototype.activateFaceCulling = function () {
    this.gl.enable(this.gl.CULL_FACE);
};

/**
 * Deactivate face cullting.
 * @public
 */
og.webgl.Handler.prototype.deactivateFaceCulling = function () {
    this.gl.disable(this.gl.CULL_FACE);
};

/**
 * Activate blending.
 * @public
 */
og.webgl.Handler.prototype.activateBlending = function () {
    this.gl.enable(this.gl.BLEND);
};

/**
 * Deactivate blending.
 * @public
 */
og.webgl.Handler.prototype.deactivateBlending = function () {
    this.gl.disable(this.gl.BLEND);
};

/**
 * Creates ARRAY buffer.
 * @public
 * @param {Array.<number>} array - Input array.
 * @param {number} itemSize - Array item size.
 * @param {number} numItems - Items quantity.
 * @return {Object}
 */
og.webgl.Handler.prototype.createArrayBuffer = function (array, itemSize, numItems) {
    var buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, array, this.gl.STATIC_DRAW);
    buffer.itemSize = itemSize;
    buffer.numItems = numItems;
    return buffer;
};

/**
 * Creates ELEMENT ARRAY buffer.
 * @public
 * @param {Array.<number>} array - Input array.
 * @param {number} itemSize - Array item size.
 * @param {number} numItems - Items quantity.
 * @return {Object}
 */
og.webgl.Handler.prototype.createElementArrayBuffer = function (array, itemSize, numItems) {
    var buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, array, this.gl.STATIC_DRAW);
    buffer.itemSize = itemSize;
    buffer.numItems = numItems;
    return buffer;
};

/**
 * Sets handler canvas size.
 * @public
 * @param {number} width - Canvas width.
 * @param {number} height - Canvas height.
 */
og.webgl.Handler.prototype.setSize = function (w, h) {

    if (w > og.webgl.Handler.MAX_SIZE) {
        w = og.webgl.Handler.MAX_SIZE;
    }

    if (h > og.webgl.Handler.MAX_SIZE) {
        h = og.webgl.Handler.MAX_SIZE;
    }

    this._params.width = w;
    this._params.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this._oneByHeight = 1 / h;

    this.gl && this.gl.viewport(0, 0, w, h);
    this.onCanvasResize && this.onCanvasResize(this.canvas);
};

/**
 * Returns canvas aspect ratio.
 * @public
 * @returns {number}
 */
og.webgl.Handler.prototype.getClientAspect = function () {
    return this.canvas.clientWidth / this.canvas.clientHeight;
};

/**
 * Returns screen center coordinates.
 * @public
 * @returns {number}
 */
og.webgl.Handler.prototype.getCenter = function () {
    var c = this.canvas;
    return new og.math.Pixel(Math.round(c.width * 0.5), Math.round(c.height * 0.5));
};

/**
 * Draw single frame.
 * @public
 * @param {number} now - Frame current time milliseconds.
 */
og.webgl.Handler.prototype.drawFrame = function () {

    /** Calculate frame time */
    var now = new Date().getTime();
    this.deltaTime = now - this._lastAnimationFrameTime;
    this._lastAnimationFrameTime = now;

    this.clock._tick(this.deltaTime);

    /** Canvas resize checking */
    var canvas = this.canvas;
    if (canvas.clientWidth !== canvas.width ||
        canvas.clientHeight !== canvas.height) {
        this.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    /** Draw frame */
    this._frameCallback();
};

/**
 * Clearing gl frame.
 * @public
 */
og.webgl.Handler.prototype.clearFrame = function () {
    var gl = this.gl;
    var bc = this.backgroundColor;
    this.gl.clearColor(bc.r, bc.g, bc.b, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};

/**
 * Starts animation loop.
 * @public
 */
og.webgl.Handler.prototype.start = function () {
    var d = new Date();
    this._lastAnimationFrameTime = d.getTime();
    this.clock.setDate(d);
    this._animationFrameCallback();
};

/**
 * Make animation.
 * @private
 */
og.webgl.Handler.prototype._animationFrameCallback = function () {
    var that = this;
    window.requestAnimationFrame(function () {
        that.drawFrame();
        that._animationFrameCallback();
    });
};