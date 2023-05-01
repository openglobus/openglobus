/**
 * @module og/webgl/Handler
 */

"use strict";

import { Clock } from "../Clock.js";
import { cons } from "../cons.js";
import { Events } from "../Events.js";
import { ImageCanvas } from "../ImageCanvas.js";
import { Vec2 } from "../math/Vec2.js";
import { Stack } from "../Stack.js";
import { isEmpty } from "../utils/shared.js";
import { ProgramController } from "./ProgramController.js";

const vendorPrefixes = ["", "WEBKIT_", "MOZ_"];

const CONTEXT_TYPE = ["webgl2", "webgl"];

// Maximal mipmap levels
const MAX_LEVELS = 2;

/**
 * A WebGL handler for accessing low-level WebGL capabilities.
 * @class
 * @param {string} id - Canvas element id that WebGL handler assing with. If it's null
 * or undefined creates hidden canvas and handler bacomes hidden.
 * @param {Object} [params] - Handler options:
 * @param {number} [params.anisotropy] - Anisotropy filter degree. 8 is default.
 * @param {number} [params.width] - Hidden handler width. 256 is default.
 * @param {number} [params.height] - Hidden handler height. 256 is default.
 * @param {Array.<string>} [params.extensions] - Additional WebGL extension list. Available by default: EXT_texture_filter_anisotropic.
 */
class Handler {
    constructor(id, params = {}) {

        this.events = new Events(["visibilitychange", "resize"]);
        /**
         * Application default timer.
         * @public
         * @type {Clock}
         */
        this.defaultClock = new Clock();

        /**
         * Custom timers.
         * @protected
         * @type{Clock[]}
         */
        this._clocks = [];

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
         * @type {Object.<og.webgl.ProgramController>}
         */
        this.programs = {};

        /**
         * Current active shader program controller.
         * @public
         * @type {ProgramController}
         */
        this.activeProgram = null;

        /**
         * Handler parameters.
         * @private
         * @type {Object}
         */
        this._params = params || {};
        this._params.anisotropy = this._params.anisotropy || 4;
        this._params.width = this._params.width || 256;
        this._params.height = this._params.height || 256;
        this._params.pixelRatio = this._params.pixelRatio || 1.0;
        this._params.context = this._params.context || {};
        this._params.extensions = this._params.extensions || [];
        this._oneByHeight = 1.0 / (this._params.height * this._params.pixelRatio);

        this._params.context.stencil = true;

        /**
         * Current WebGL extensions. Becomes here after context initialization.
         * @public
         * @type {Object}
         */
        this.extensions = {};

        /**
         * HTML Canvas object id.
         * @private
         * @type {Object}
         */
        this._id = id;

        this._lastAnimationFrameTime = 0;

        this._initialized = false;

        /**
         * Animation frame function assigned from outside(Ex. from Renderer).
         * @private
         * @type {frameCallback}
         */
        this._frameCallback = function () {
        };

        this.transparentTexture = null;

        this.defaultTexture = null;

        this.framebufferStack = new Stack();

        this.createTexture = {
            "NEAREST": null,
            "LINEAR": null,
            "MIPMAP": null,
            "ANISOTROPIC": null
        };

        this.createTextureDefault = null;

        this.ONCANVASRESIZE = null;

        if (params.autoActivate || isEmpty(params.autoActivate)) {
            this.initialize();
        }
    }

    /**
     * The return value is null if the extension is not supported, or an extension object otherwise.
     * @param {Object} gl - WebGl context pointer.
     * @param {String} name - Extension name.
     * @returns {Object} -
     */
    static getExtension(gl, name) {
        let i, ext;
        for (i in vendorPrefixes) {
            ext = gl.getExtension(vendorPrefixes[i] + name);
            if (ext) {
                return ext;
            }
        }
        return null;
    }

    /**
     * Returns a drawing context on the canvas, or null if the context identifier is not supported.
     * @param {Object} canvas - HTML canvas object.
     * @param {Object} [contextAttributes] - See canvas.getContext contextAttributes.
     * @returns {Object} -
     */
    static getContext(canvas, contextAttributes) {
        let ctx = null;

        try {
            let urlParams = new URLSearchParams(location.search);
            let ver = urlParams.get('og_ver');
            if (ver) {
                ctx = canvas.getContext(ver, contextAttributes);
                ctx.type = ver;
            } else {
                for (let i = 0; i < CONTEXT_TYPE.length; i++) {
                    ctx = canvas.getContext(CONTEXT_TYPE[i], contextAttributes);
                    if (ctx) {
                        ctx.type = CONTEXT_TYPE[i];
                        break;
                    }
                }
            }
        } catch (ex) {
            cons.logErr("exception during the GL context initialization");
        }

        if (!ctx) {
            cons.logErr("could not initialise WebGL");
        }

        return ctx;
    }

    /**
     * Sets animation frame function.
     * @public
     * @param {callback} callback - Frame callback.
     */
    setFrameCallback(callback) {
        callback && (this._frameCallback = callback);
    }

    /**
     * Creates empty texture.
     * @public
     * @param {Number} [width=1] - Specifies the width of the texture image..
     * @param {Number} [height=1] - Specifies the width of the texture image..
     * @param {String} [filter="NEAREST"] - Specifies GL_TEXTURE_MIN(MAX)_FILTER texture value.
     * @param {String} [internalFormat="RGBA"] - Specifies the color components in the texture.
     * @param {String} [format="RGBA"] - Specifies the format of the texel data.
     * @param {String} [type="UNSIGNED_BYTE"] - Specifies the data type of the texel data.
     * @param {Number} [levels=0] - Specifies the level-of-detail number. Level 0 is the base image level. Level n is the nth mipmap reduction image.
     * @returns {Object} - WebGL texture object.
     */
    createEmptyTexture2DExt(
        width = 1,
        height = 1,
        filter = "NEAREST",
        internalFormat = "RGBA",
        format = "RGBA",
        type = "UNSIGNED_BYTE",
        level = 0
    ) {
        let gl = this.gl;
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, level, gl[internalFormat.toUpperCase()], width, height, 0,
            gl[format.toUpperCase()], gl[type.toUpperCase()], null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[filter.toUpperCase()]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[filter.toUpperCase()]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates Empty NEAREST filtered texture.
     * @public
     * @param {number} width - Empty texture width.
     * @param {number} height - Empty texture height.
     * @returns {Object} - WebGL texture object.
     */
    createEmptyTexture_n(width, height, internalFormat) {
        let gl = this.gl;
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat || gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates empty LINEAR filtered texture.
     * @public
     * @param {number} width - Empty texture width.
     * @param {number} height - Empty texture height.
     * @returns {Object} - WebGL texture object.
     */
    createEmptyTexture_l(width, height, internalFormat) {
        let gl = this.gl;
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat || gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates NEAREST filter texture.
     * @public
     * @param {HTMLCanvasElement | Image} image - Image or Canvas object.
     * @returns {Object} - WebGL texture object.
     */
    createTexture_n_webgl1(image, internalFormat, texture) {
        let gl = this.gl;
        texture = texture || gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat || gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates LINEAR filter texture.
     * @public
     * @param {Object} image - Image or Canvas object.
     * @returns {Object} - WebGL texture object.
     */
    createTexture_l_webgl1(image, internalFormat, texture) {
        let gl = this.gl;
        texture = texture || gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat || gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates MIPMAP filter texture.
     * @public
     * @param {Object} image - Image or Canvas object.
     * @returns {Object} - WebGL texture object.
     */
    createTexture_mm_webgl1(image, internalFormat, texture) {
        let gl = this.gl;
        texture = texture || gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat || gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates ANISOTROPY filter texture.
     * @public
     * @param {Object} image - Image or Canvas object.
     * @returns {Object} - WebGL texture object.
     */
    createTexture_a_webgl1(image, internalFormat, texture) {
        let gl = this.gl;
        texture = texture || gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat || gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameterf(gl.TEXTURE_2D, this.extensions.EXT_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, this._params.anisotropy);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates NEAREST filter texture.
     * @public
     * @param {Object} image - Image or Canvas object.
     * @returns {Object} - WebGL texture object.
     */
    createTexture_n_webgl2(image, internalFormat, texture) {
        let gl = this.gl;
        texture = texture || gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat || gl.RGBA8, image.width, image.height);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates LINEAR filter texture.
     * @public
     * @param {Object} image - Image or Canvas object.
     * @returns {Object} - WebGL texture object.
     */
    createTexture_l_webgl2(image, internalFormat, texture) {
        let gl = this.gl;
        texture = texture || gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat || gl.RGBA8, image.width, image.height);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates MIPMAP filter texture.
     * @public
     * @param {Object} image - Image or Canvas object.
     * @returns {Object} - WebGL texture object.
     */
    createTexture_mm_webgl2(image, internalFormat, texture) {
        let gl = this.gl;
        texture = texture || gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texStorage2D(gl.TEXTURE_2D, MAX_LEVELS, internalFormat || gl.RGBA8, image.width, image.height);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    /**
     * Creates ANISOTROPY filter texture.
     * @public
     * @param {Object} image - Image or Canvas object.
     * @returns {Object} - WebGL texture object.
     */
    createTexture_a_webgl2(image, internalFormat, texture) {
        let gl = this.gl;
        texture = texture || gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texStorage2D(gl.TEXTURE_2D, MAX_LEVELS, internalFormat || gl.RGBA8, image.width, image.height);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameterf(gl.TEXTURE_2D, this.extensions.EXT_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, this._params.anisotropy);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

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
    loadCubeMapTexture(params) {
        let gl = this.gl;
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        let faces = [
            [params.px, gl.TEXTURE_CUBE_MAP_POSITIVE_X],
            [params.nx, gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
            [params.py, gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
            [params.ny, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
            [params.pz, gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
            [params.nz, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
        ];

        let imageCanvas = new ImageCanvas();
        imageCanvas.fillEmpty();
        let emptyImage = imageCanvas.getImage();

        for (let i = 0; i < faces.length; i++) {
            let face = faces[i][1];
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, emptyImage);
        }

        for (let i = 0; i < faces.length; i++) {
            let face = faces[i][1];
            let image = new Image();
            image.crossOrigin = "";
            image.onload = (function (texture, face, image) {
                return function () {
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                    gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                };
            })(texture, face, image);
            image.src = faces[i][0];
        }
        return texture;
    }

    /**
     * Adds shader program to the handler.
     * @public
     * @param {Program} program - Shader program.
     * @param {boolean} [notActivate] - If it's true program will not compile.
     * @return {Program} -
     */
    addProgram(program, notActivate) {
        if (!this.programs[program.name]) {
            let sc = new ProgramController(this, program);
            this.programs[program.name] = sc;
            this._initProgramController(sc);
            if (notActivate) {
                sc._activated = false;
            }
        } else {
            console.log(
                "og.webgl.Handler:284 - shader program: '" + program.name + "' is allready exists."
            );
        }
        return program;
    }

    /**
     * Removes shader program from handler.
     * @public
     * @param {String} name - Shader program name.
     */
    removeProgram(name) {
        this.programs[name] && this.programs[name].remove();
    }

    /**
     * Adds shader programs to the handler.
     * @public
     * @param {Array.<Program>} programsArr - Shader program array.
     */
    addPrograms(programsArr) {
        for (let i = 0; i < programsArr.length; i++) {
            this.addProgram(programsArr[i]);
        }
    }

    /**
     * Used in addProgram
     * @private
     * @param {ProgramController} sc - Program controller
     */
    _initProgramController(sc) {
        if (this._initialized) {
            sc.initialize();
            if (!this.activeProgram) {
                this.activeProgram = sc;
                sc.activate();
            } else {
                sc.deactivate();
                this.activeProgram._program.enableAttribArrays();
                this.activeProgram._program.use();
            }
        }
    }

    /**
     * Used in init function.
     * @private
     */
    _initPrograms() {
        for (let p in this.programs) {
            this._initProgramController(this.programs[p]);
        }
    }

    /**
     * Initialize additional WebGL extensions.
     * @public
     * @param {string} extensionStr - Extension name.
     * @param {boolean} showLog - Show logging.
     * @return {Object} -
     */
    initializeExtension(extensionStr, showLog) {
        if (!(this.extensions && this.extensions[extensionStr])) {
            let ext = Handler.getExtension(this.gl, extensionStr);
            if (ext) {
                this.extensions[extensionStr] = ext;
            } else if (showLog) {
                console.log(
                    "og.webgl.Handler: extension '" + extensionStr + "' doesn't initialize."
                );
            }
        }
        return this.extensions && this.extensions[extensionStr];
    }

    /**
     * Main function that initialize handler.
     * @public
     */
    initialize() {
        if (this._id) {
            this.canvas = document.getElementById(this._id);
        } else {
            this.canvas = document.createElement("canvas");
            this.canvas.width = this._params.width;
            this.canvas.height = this._params.height;
        }

        this.gl = Handler.getContext(this.canvas, this._params.context);

        if(this.gl) {
            this._initialized = true;

            /** Sets default extensions */
            this._params.extensions.push("EXT_texture_filter_anisotropic");

            if (this.gl.type === "webgl") {
                this._params.extensions.push("OES_standard_derivatives");
                this._params.extensions.push("OES_element_index_uint");
                this._params.extensions.push("WEBGL_depth_texture");
                this._params.extensions.push("ANGLE_instanced_arrays");
                //this._params.extensions.push("WEBGL_draw_buffers");
                //this._params.extensions.push("EXT_frag_depth");
            } else {
                this._params.extensions.push("EXT_color_buffer_float");
                this._params.extensions.push("OES_texture_float_linear");
                //this._params.extensions.push("WEBGL_draw_buffers");
            }

            let i = this._params.extensions.length;
            while (i--) {
                this.initializeExtension(this._params.extensions[i], true);
            }

            if (this.gl.type === "webgl") {
                this.createTexture_n = this.createTexture_n_webgl1.bind(this);
                this.createTexture_l = this.createTexture_l_webgl1.bind(this);
                this.createTexture_mm = this.createTexture_mm_webgl1.bind(this);
                this.createTexture_a = this.createTexture_a_webgl1.bind(this);
            } else {
                this.createTexture_n = this.createTexture_n_webgl2.bind(this);
                this.createTexture_l = this.createTexture_l_webgl2.bind(this);
                this.createTexture_mm = this.createTexture_mm_webgl2.bind(this);
                this.createTexture_a = this.createTexture_a_webgl2.bind(this);
            }

            this.createTexture["NEAREST"] = this.createTexture_n;
            this.createTexture["LINEAR"] = this.createTexture_l;
            this.createTexture["MIPMAP"] = this.createTexture_mm;
            this.createTexture["ANISOTROPIC"] = this.createTexture_a;

            if (!this.extensions.EXT_texture_filter_anisotropic) {
                this.createTextureDefault = this.createTexture_mm;
            } else {
                this.createTextureDefault = this.createTexture_a;
            }

            /** Initilalize shaders and rendering parameters*/
            this._initPrograms();
            this._setDefaults();

            this.intersectionObserver = new IntersectionObserver((entries) => {
                this._toggleVisibilityChange(entries[0].isIntersecting === true);
            }, { threshold: 0 });
            this.intersectionObserver.observe(this.canvas);

            this.resizeObserver = new ResizeObserver(entries => {
                this._toggleVisibilityChange(entries[0].contentRect.width !== 0 && entries[0].contentRect.height !== 0);
            });
            this.resizeObserver.observe(this.canvas);

            document.addEventListener("visibilitychange", () => {
                this._toggleVisibilityChange(document.visibilityState === 'visible');
            });
        }
    }

    _toggleVisibilityChange(visibility) {
        if (visibility) {
            this.start();
            this.ONCANVASRESIZE && this.ONCANVASRESIZE();
            this.events.dispatch(this.events.visibilitychange, true);
        } else {
            this.events.dispatch(this.events.visibilitychange, false);
            this.stop();
        }
    }

    /**
     * Sets default gl render parameters. Used in init function.
     * @private
     */
    _setDefaults() {
        let gl = this.gl;
        gl.depthFunc(gl.LESS);
        gl.enable(gl.DEPTH_TEST);
        this.setSize(
            this.canvas.clientWidth || this._params.width,
            this.canvas.clientHeight || this._params.height
        );
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);
        gl.enable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        this.createDefaultTexture({ color: "rgba(0,0,0,0.0)" }, (t) => {
            this.transparentTexture = t;
        });
        this.createDefaultTexture({ color: "rgba(255, 255, 255, 1.0)" }, (t) => {
            this.defaultTexture = t;
        });
    }

    /**
     * Creates STREAM_DRAW ARRAY buffer.
     * @public
     * @param {Array.<number>} array - Input array.
     * @param {number} itemSize - Array item size.
     * @param {number} numItems - Items quantity.
     * @param {number} [usage=STATIC_DRAW] - Parameter of the bufferData call can be one of STATIC_DRAW, DYNAMIC_DRAW, or STREAM_DRAW.
     * @return {Object} -
     */
    createStreamArrayBuffer(itemSize, numItems, usage, bites = 4) {
        let buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            numItems * itemSize * bites,
            usage || this.gl.STREAM_DRAW
        );
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        buffer.itemSize = itemSize;
        buffer.numItems = numItems;
        return buffer;
    }

    /**
     * Load stream ARRAY buffer.
     * @public
     * @param {Array.<number>} array - Input array.
     * @param {number} itemSize - Array item size.
     * @param {number} numItems - Items quantity.
     * @param {number} [usage=STATIC_DRAW] - Parameter of the bufferData call can be one of STATIC_DRAW, DYNAMIC_DRAW, or STREAM_DRAW.
     * @return {Object} -
     */
    setStreamArrayBuffer(buffer, array, offset = 0) {
        let gl = this.gl;
        gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, array);
        gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        return buffer;
    }

    /**
     * Creates ARRAY buffer.
     * @public
     * @param {Array.<number>} array - Input array.
     * @param {number} itemSize - Array item size.
     * @param {number} numItems - Items quantity.
     * @param {number} [usage=STATIC_DRAW] - Parameter of the bufferData call can be one of STATIC_DRAW, DYNAMIC_DRAW, or STREAM_DRAW.
     * @return {Object} -
     */
    createArrayBuffer(array, itemSize, numItems, usage) {
        let buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, array, usage || this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        buffer.itemSize = itemSize;
        buffer.numItems = numItems;
        return buffer;
    }

    /**
     * Creates ARRAY buffer specific length.
     * @public
     * @param {Array.<number>} array - Input array.
     * @param {number} itemSize - Array item size.
     * @param {number} numItems - Items quantity.
     * @param {number} [usage=STATIC_DRAW] - Parameter of the bufferData call can be one of STATIC_DRAW, DYNAMIC_DRAW, or STREAM_DRAW.
     * @return {Object} -
     */
    createArrayBufferLength(size, usage) {
        let buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, size, usage || this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        buffer.itemSize = 1;
        buffer.numItems = size;
        return buffer;
    }

    /**
     * Creates ELEMENT ARRAY buffer.
     * @public
     * @param {Array.<number>} array - Input array.
     * @param {number} itemSize - Array item size.
     * @param {number} numItems - Items quantity.
     * @param {number} [usage=STATIC_DRAW] - Parameter of the bufferData call can be one of STATIC_DRAW, DYNAMIC_DRAW, or STREAM_DRAW.
     * @return {Object} -
     */
    createElementArrayBuffer(array, itemSize, numItems, usage) {
        let buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, array, usage || this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        buffer.itemSize = itemSize;
        buffer.numItems = numItems || array.length;
        return buffer;
    }

    /**
     * Sets handler canvas size.
     * @public
     * @param {number} w - Canvas width.
     * @param {number} h - Canvas height.
     */
    setSize(w, h) {
        this._params.width = w;
        this._params.height = h;
        this.canvas.width = w * this._params.pixelRatio;
        this.canvas.height = h * this._params.pixelRatio;

        this._oneByHeight = 1.0 / this.canvas.height;

        this.gl && this.gl.viewport(0, 0, w, h);
        this.ONCANVASRESIZE && this.ONCANVASRESIZE(this.canvas);
        this.events.dispatch(this.events.resize, this);
    }

    get pixelRatio() {
        return this._params.pixelRatio;
    }

    set pixelRatio(pr) {
        this._params.pixelRatio = pr;
        this.setSize(this._params.width, this._params.height);
    }

    /**
     * Returns context screen width.
     * @public
     * @returns {number} -
     */
    getWidth() {
        return this.canvas.width;
    }

    /**
     * Returns context screen height.
     * @public
     * @returns {number} -
     */
    getHeight() {
        return this.canvas.height;
    }

    /**
     * Returns canvas aspect ratio.
     * @public
     * @returns {number} -
     */
    getClientAspect() {
        return this.canvas.clientWidth / this.canvas.clientHeight;
    }

    /**
     * Returns screen center coordinates.
     * @public
     * @returns {number} -
     */
    getCenter() {
        let c = this.canvas;
        return new Vec2(Math.round(c.width * 0.5), Math.round(c.height * 0.5));
    }

    /**
     * Draw single frame.
     * @public
     * @param {number} now - Frame current time milliseconds.
     */
    drawFrame() {
        /** Calculating frame time */
        let now = window.performance.now();
        this.deltaTime = now - this._lastAnimationFrameTime;
        this._lastAnimationFrameTime = now;

        this.defaultClock._tick(this.deltaTime);

        for (let i = 0; i < this._clocks.length; i++) {
            this._clocks[i]._tick(this.deltaTime);
        }

        /** Canvas resize checking */
        let canvas = this.canvas;

        if (Math.floor(canvas.clientWidth * this._params.pixelRatio) !== canvas.width || Math.floor(canvas.clientHeight * this._params.pixelRatio) !== canvas.height) {
            if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
                this.stop();
            } else if (!document.hidden) {
                this.start();
                this.setSize(canvas.clientWidth, canvas.clientHeight);
            }
        }

        /** Draw frame */
        this._frameCallback();
    }

    /**
     * Clearing gl frame.
     * @public
     */
    clearFrame() {
        let gl = this.gl;
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    /**
     * Starts animation loop.
     * @public
     */
    start() {
        if (!this._requestAnimationFrameId && this._initialized) {
            this._lastAnimationFrameTime = window.performance.now();
            this.defaultClock.setDate(new Date());
            this._animationFrameCallback();
        }
    }

    stop() {
        if (this._requestAnimationFrameId) {
            window.cancelAnimationFrame(this._requestAnimationFrameId);
            this._requestAnimationFrameId = null;
        }
    }

    isStopped() {
        return !this._requestAnimationFrameId;
    }

    /**
     * Check is gl context type equals webgl2
     * @public
     */
    isWebGl2() {
        return this.gl.type === "webgl2"
    }

    /**
     * Make animation.
     * @private
     */
    _animationFrameCallback() {
        this._requestAnimationFrameId = window.requestAnimationFrame(() => {
            this.drawFrame();
            this._requestAnimationFrameId && this._animationFrameCallback();
        });
    }

    /**
     * Creates default texture object
     * @public
     * @param {Object} [params] - Texture parameters:
     * @param {callback} [success] - Creation callback
     */
    createDefaultTexture(params, success) {
        let imgCnv;
        let texture;
        const is2 = this.isWebGl2();

        if (params && params.color) {
            imgCnv = new ImageCanvas(2, 2);
            imgCnv.fillColor(params.color);
            texture = this.createTexture_n(imgCnv._canvas);
            texture.default = true;
            success(texture);
        } else if (params && params.url) {
            let img = new Image();
            let that = this;
            img.onload = function () {
                texture = that.createTexture(this);
                texture.default = true;
                success(texture);
            };
            img.src = params.url;
        } else {
            imgCnv = new ImageCanvas(2, 2);
            imgCnv.fillColor("#C5C5C5");
            texture = this.createTexture_n(imgCnv._canvas);
            texture.default = true;
            success(texture);
        }
    }

    deleteTexture(texture) {
        if (texture && !texture.default) {
            this.gl.deleteTexture(texture);
        }
    }

    /**
     * @public
     */
    destroy() {
        let gl = this.gl;

        this.stop();

        for (let p in this.programs) {
            this.removeProgram(p);
        }

        gl.deleteTexture(this.transparentTexture);
        this.transparentTexture = null;

        gl.deleteTexture(this.defaultTexture);
        this.defaultTexture = null;

        this.framebufferStack = null;
        this.framebufferStack = new Stack();

        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.canvas.width = 1;
        this.canvas.height = 1;
        this.canvas = null;

        let numAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        let tmp = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tmp);
        for (let ii = 0; ii < numAttribs; ++ii) {
            gl.disableVertexAttribArray(ii);
            gl.vertexAttribPointer(ii, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttrib1f(ii, 0);
        }
        gl.deleteBuffer(tmp);

        let numTextureUnits = gl.getParameter(gl.MAX_TEXTlURE_IMAGE_UNITS);
        for (let ii = 0; ii < numTextureUnits; ++ii) {
            gl.activeTexture(gl.TEXTURE0 + ii);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.useProgram(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.DITHER);
        gl.disable(gl.SCISSOR_TEST);
        gl.blendColor(0, 0, 0, 0);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ZERO);
        gl.clearColor(0, 0, 0, 0);
        gl.clearDepth(1);
        gl.clearStencil(-1);

        this.gl = null;

        this._initialized = false;
    }

    addClock(clock) {
        if (!clock.__handler) {
            clock.__handler = this;
            this._clocks.push(clock);
        }
    }

    addClocks(clockArr) {
        for (let i = 0; i < clockArr.length; i++) {
            this.addClock(clockArr[i]);
        }
    }

    removeClock(clock) {
        if (clock.__handler) {
            let c = this._clocks;
            let i = c.length;
            while (i--) {
                if (c[i].equal(clock)) {
                    clock.__handler = null;
                    c.splice(i, 1);
                    break;
                }
            }
        }
    }

    // var loadTextureData = function(textureName, callback) {
    //     const xhr = new XMLHttpRequest();
    //     xhr.open('GET', textureName);
    //     xhr.responseType = 'arraybuffer';
    //     xhr.onload = (event) => {
    //         const data = new DataView(xhr.response);
    //         const array =
    //             new Float32Array(data.byteLength / Float32Array.BYTES_PER_ELEMENT);
    //         for (var i = 0; i < array.length; ++i) {
    //             array[i] = data.getFloat32(i * Float32Array.BYTES_PER_ELEMENT, true);
    //         }
    //         callback(array);
    //     };
    //     xhr.send();
    // }

    // loadTextureData('transmittance.dat', (data) => {
    //
    //     let gl = this.renderer.handler.gl;
    //
    //     const texture = gl.createTexture();
    //     gl.activeTexture(gl.TEXTURE0);
    //     gl.bindTexture(gl.TEXTURE_2D, texture);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.getExtension('OES_texture_float_linear') ? gl.RGBA32F : gl.RGBA16F,
    //         TRANSMITTANCE_TEXTURE_WIDTH, TRANSMITTANCE_TEXTURE_HEIGHT, 0, gl.RGBA,
    //         gl.FLOAT, data);
    //
    //     this.transmittanceTextureBrn = texture;
    // });
}

export { Handler };
