import {Camera} from "../camera/Camera";
import {Control} from "../control/Control";
import {cons} from "../cons";
import {createRendererEvents} from "./RendererEvents";
import type {IBaseInputState, RendererEventsHandler} from "./RendererEvents";
import {depth} from "../shaders/depth";
import {EntityCollection} from "../entity/EntityCollection";
import {Framebuffer, Multisample} from "../webgl/index";
import {FontAtlas} from "../utils/FontAtlas";
import {Handler} from "../webgl/Handler";
import type {WebGLBufferExt} from "../webgl/Handler";
import {input} from "../input/input";
import {isEmpty} from "../utils/shared";
import {LabelWorker} from "../entity/LabelWorker";
import {MAX_FLOAT, randomi} from "../math";
import {RenderNode} from "../scene/RenderNode";
import {screenFrame} from "../shaders/screenFrame";
import {toneMapping} from "../shaders/tone_mapping/toneMapping";
import {TextureAtlas} from "../utils/TextureAtlas";
import {Vec2} from "../math/Vec2";
import {Vec3} from "../math/Vec3";
import type {NumberArray3} from "../math/Vec3";
import {Vec4} from "../math/Vec4";

interface IRendererParams {
    controls?: Control[];
    msaa?: number;
    autoActivate?: boolean;
    fontsSrc?: string;
    gamma?: number;
    exposure?: number;
    dpi?: number;
    clearColor?: [number, number, number, number]
}

interface IPickingObject {
    _pickingColor?: Vec3;
    _pickingColorU?: Float32Array;
}

interface IFrameCallbackHandler {
    id: number;
    callback: Function;
    sender: any;
}

const MSAA_DEFAULT = 0;

let __pickingCallbackCounter__ = 0;

let __depthCallbackCounter__ = 0;

let _tempDepth_ = new Float32Array(2);

// function clientWaitAsync(gl: WebGL2RenderingContext, sync: WebGLSync, flags: number): Promise<void> {
//     return new Promise<void>((resolve, reject) => {
//         function check() {
//             const res = gl.clientWaitSync(sync, flags, 0);
//             if (res == gl.WAIT_FAILED) {
//                 reject();
//             } else if (res == gl.TIMEOUT_EXPIRED) {
//                 requestAnimationFrame(check);
//             } else {
//                 resolve();
//             }
//         }
//
//         check();
//     });
// }

/**
 * Represents high level WebGL context interface that starts WebGL handler working in real time.
 * @class
 * @param {Handler} handler - WebGL handler context.
 * @param {Object} [params] - Renderer parameters:
 * @fires RendererEventsHandler<RendererEventsType>#draw
 * @fires RendererEventsHandler<RendererEventsType>#resize
 * @fires RendererEventsHandler<RendererEventsType>#mousemove
 * @fires RendererEventsHandler<RendererEventsType>#mousestop
 * @fires RendererEventsHandler<RendererEventsType>#lclick
 * @fires RendererEventsHandler<RendererEventsType>#rclick
 * @fires RendererEventsHandler<RendererEventsType>#mclick
 * @fires RendererEventsHandler<RendererEventsType>#ldblclick
 * @fires RendererEventsHandler<RendererEventsType>#rdblclick
 * @fires RendererEventsHandler<RendererEventsType>#mdblclick
 * @fires RendererEventsHandler<RendererEventsType>#lup
 * @fires RendererEventsHandler<RendererEventsType>#rup
 * @fires RendererEventsHandler<RendererEventsType>#mup
 * @fires RendererEventsHandler<RendererEventsType>#ldown
 * @fires RendererEventsHandler<RendererEventsType>#rdown
 * @fires RendererEventsHandler<RendererEventsType>#mdown
 * @fires RendererEventsHandler<RendererEventsType>#lhold
 * @fires RendererEventsHandler<RendererEventsType>#rhold
 * @fires RendererEventsHandler<RendererEventsType>#mhold
 * @fires RendererEventsHandler<RendererEventsType>#mousewheel
 * @fires RendererEventsHandler<RendererEventsType>#touchstart
 * @fires RendererEventsHandler<RendererEventsType>#touchend
 * @fires RendererEventsHandler<RendererEventsType>#touchcancel
 * @fires RendererEventsHandler<RendererEventsType>#touchmove
 * @fires RendererEventsHandler<RendererEventsType>#doubletouch
 * @fires RendererEventsHandler<RendererEventsType>#touchleave
 * @fires RendererEventsHandler<RendererEventsType>#touchenter
 */

export interface HTMLDivElementExt extends HTMLDivElement {
    attributions?: HTMLElement;
}

class Renderer {

    /**
     * Div element with WebGL canvas. Assigned in Globe class.
     * @public
     * @type {HTMLElement | null}
     */
    public div: HTMLDivElementExt | null;

    /**
     * WebGL handler context.
     * @public
     * @type {Handler}
     */
    public handler: Handler;

    public exposure: number;
    public gamma: number;
    public whitepoint: number;
    public brightThreshold: number;

    /**
     * Render nodes drawing queue.
     * @public
     * @type {Array.<RenderNode>}
     */
    public _renderNodesArr: RenderNode[];

    /**
     * Render nodes store for the comfortable access by the node name.
     * @public
     * @type {Object.<RenderNode>}
     */
    public renderNodes: Record<string, RenderNode>;

    /**
     * Current active camera.
     * @public
     * @type {Camera}
     */
    public activeCamera: Camera;

    /**
     * Renderer events. Represents interface for setting events like mousemove, draw, keypress etc.
     * @public
     * @type {RendererEvents}
     */
    public events: RendererEventsHandler;

    /**
     * Controls array.
     * @public
     * @type {Object}
     */
    public controls: Record<string, Control>;

    /**
     * Provides exchange between controls.
     * @public
     * @type {any}
     */
    public controlsBag: any;

    /**
     * Hash table for drawing objects.
     * @public
     * @type {Map<string, any>}
     */
    public colorObjects: Map<string, any>;

    /**
     * Color picking objects rendering queue.
     * @type {Function[]}
     */
    protected _pickingCallbacks: IFrameCallbackHandler[];

    /**
     * Picking objects(labels and billboards) framebuffer.
     * @public
     * @type {Framebuffer}
     */
    public pickingFramebuffer: Framebuffer | null;

    /**
     * Depth objects rendering queue.
     * @type {Function[]}
     */
    protected _depthCallbacks: IFrameCallbackHandler[];

    public depthFramebuffer: Framebuffer | null;

    protected _msaa: number;

    protected _internalFormat: string;
    protected _format: string;
    protected _type: string;

    protected _depthRefreshRequired: boolean;

    public sceneFramebuffer: Framebuffer | Multisample | null;

    protected blitFramebuffer: Framebuffer | null;

    protected toneMappingFramebuffer: Framebuffer | null;

    protected _initialized: boolean;

    /**
     * Texture atlas for the billboards images.
     * @public
     * @type {TextureAtlas}
     */
    public billboardsTextureAtlas: TextureAtlas;

    /**
     * Texture font atlas for the font families and styles.
     * @public
     * @type {FontAtlas}
     */
    public fontAtlas: FontAtlas;

    /**
     * Texture atlas for the rays, polylines and strips entities.
     * @public
     * @type {TextureAtlas}
     */
    public strokeTextureAtlas: TextureAtlas;

    protected _entityCollections: EntityCollection[][];

    protected _currentOutput: string;

    protected _fnScreenFrame: Function | null;

    public labelWorker: LabelWorker;

    public screenDepthFramebuffer: Framebuffer | null;

    public screenFramePositionBuffer: WebGLBufferExt | null;

    public screenTexture: Record<string, WebGLTexture>;

    public outputTexture: WebGLTexture | null;

    protected _readPickingBuffer: () => void;

    public clearColor: Float32Array;

    constructor(handler: Handler | string | HTMLCanvasElement, params: IRendererParams = {}) {

        this.div = null;

        if (handler instanceof Handler) {
            this.handler = handler;
        } else {
            this.handler = new Handler(handler, {
                pixelRatio: params.dpi || (window.devicePixelRatio + 0.15),
                autoActivate: true
            });
        }

        this.clearColor = new Float32Array(params.clearColor || [0, 0, 0, 1]);

        this.exposure = params.exposure || 3.01;

        this.gamma = params.gamma || 0.47;

        this.whitepoint = 1.0;

        this.brightThreshold = 0.9;

        this._renderNodesArr = [];

        this.renderNodes = {};

        this.activeCamera = new Camera({
            width: this.handler.canvas?.width,
            height: this.handler.canvas?.height,
            eye: new Vec3(0, 0, 0),
            look: new Vec3(0, 0, -1),
            up: new Vec3(0, 1, 0)
        });

        this.events = createRendererEvents(this);

        this.controls = {};

        if (params.controls) {
            for (let i in params.controls) {
                this.controls[params.controls[i].name] = params.controls[i];
            }
        }

        this.controlsBag = {};

        this.colorObjects = new Map<string, any>();

        this._pickingCallbacks = [];

        this.pickingFramebuffer = null;

        this._depthCallbacks = [];

        this.depthFramebuffer = null;

        this._depthRefreshRequired = false;

        let urlParams = new URLSearchParams(location.search);
        let msaaParam = urlParams.get('og_msaa');
        if (msaaParam) {
            this._msaa = Number(urlParams.get('og_msaa'));
        } else {
            this._msaa = params.msaa != undefined ? params.msaa : MSAA_DEFAULT;
        }

        this._internalFormat = "RGBA16F";
        this._format = "RGBA";
        this._type = "FLOAT";

        this.sceneFramebuffer = null;

        this.blitFramebuffer = null;

        this.toneMappingFramebuffer = null;

        this._initialized = false;

        /**
         * Texture atlas for the billboards images.
         * @public
         * @type {TextureAtlas}
         */
        this.billboardsTextureAtlas = new TextureAtlas();

        /**
         * Texture font atlas for the font families and styles.
         * @public
         * @type {FontAtlas}
         */
        this.fontAtlas = new FontAtlas(params.fontsSrc);

        /**
         * Texture atlas for the rays, polylines and strips.
         * @public
         * @type {TextureAtlas}
         */
        this.strokeTextureAtlas = new TextureAtlas();

        this._entityCollections = [[]];

        this._currentOutput = "screen";

        this._fnScreenFrame = null;

        this.labelWorker = new LabelWorker(4);

        this.screenDepthFramebuffer = null;

        this.screenFramePositionBuffer = null;

        this.screenTexture = {};

        this.outputTexture = null;

        this._readPickingBuffer = this._readPickingBuffer_webgl2;

        if (params.autoActivate || isEmpty(params.autoActivate)) {
            this.start();
        }
    }

    public enableBlendOneSrcAlpha() {
        let gl = this.handler.gl!;
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    public enableBlendDefault() {
        let gl = this.handler.gl!;
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
    }

    public setRelativeCenter(c?: Vec3) {
        this.events.dispatch(this.events.changerelativecenter, c || this.activeCamera.eye);
    }

    /**
     * Sets renderer events activity.
     * @param {Boolean} activity - Events activity.
     */
    public setEventsActivity(activity: boolean) {
        this.events.active = activity;
    }

    public addDepthCallback(sender: any, callback: Function) {
        let id = __depthCallbackCounter__++;
        this._depthCallbacks.push({
            id: id, callback: callback, sender: sender
        });
        return id;
    }

    public removeDepthCallback(id: number) {
        for (let i = 0; i < this._depthCallbacks.length; i++) {
            if (id === this._depthCallbacks[i].id) {
                this._depthCallbacks.splice(i, 1);
                break;
            }
        }
    }

    /**
     * Adds picking rendering callback function.
     * @param {object} sender - Callback context.
     * @param {Function} callback - Rendering callback.
     * @returns {Number} Handler id
     */
    public addPickingCallback(sender: any, callback: Function) {
        let id = __pickingCallbackCounter__++;
        this._pickingCallbacks.push({
            id: id, callback: callback, sender: sender
        });
        return id;
    }

    /**
     * Removes picking rendering callback function.
     * @param {Number} id - Handler id to remove.
     */
    public removePickingCallback(id: number) {
        for (let i = 0; i < this._pickingCallbacks.length; i++) {
            if (id === this._pickingCallbacks[i].id) {
                this._pickingCallbacks.splice(i, 1);
                break;
            }
        }
    }

    public getPickingObject<T>(r: number, g: number, b: number): T {
        return this.colorObjects.get(`${r}_${g}_${b}`);
    }

    public getPickingObjectArr<T>(arr: NumberArray3 | Uint8Array): T {
        return this.colorObjects.get(`${arr[0]}_${arr[1]}_${arr[2]}`);
    }

    public getPickingObject3v<T>(vec: Vec3 | Vec4): T {
        return this.colorObjects.get(`${vec.x}_${vec.y}_${vec.z}`);
    }

    /**
     * Assign picking color to the object.
     * @public
     * @param {Object} obj - Object that presume to be picked.
     */
    public assignPickingColor<T>(obj: T & IPickingObject) {
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
    public clearPickingColor<T>(obj: T & IPickingObject) {
        if (obj._pickingColor && !obj._pickingColor.isZero()) {
            let c = obj._pickingColor;
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
    public getWidth(): number {
        return this.handler.canvas!.clientWidth;
    }

    /**
     * Get the client height.
     * @public
     * @returns {number} -
     */
    public getHeight(): number {
        return this.handler.canvas!.clientHeight;
    }

    /**
     * Get center of the canvas
     * @public
     * @returns {Vec2} -
     */
    public getCenter(): Vec2 {
        let cnv = this.handler.canvas!;
        return new Vec2(Math.round(cnv.width * 0.5), Math.round(cnv.height * 0.5));
    }

    /**
     * Get center of the screen viewport
     * @public
     * @returns {Vec2} -
     */
    public getClientCenter(): Vec2 {
        let cnv = this.handler.canvas!;
        return new Vec2(Math.round(cnv.clientWidth * 0.5), Math.round(cnv.clientHeight * 0.5));
    }

    /**
     * Add the given control to the renderer.
     * @param {Control} control - Control.
     */
    public addControl(control: Control) {
        control.addTo(this);
    }

    /**
     * Add the given controls array to the planet node.
     * @param {Array.<Control>} cArr - Control array.
     */
    public addControls(cArr: Control[]) {
        for (let i = 0; i < cArr.length; i++) {
            cArr[i].addTo(this);
        }
    }

    /**
     * Remove control from the renderer.
     * @param {Control} control  - Control.
     */
    public removeControl(control: Control) {
        control.remove();
    }

    public isInitialized(): boolean {
        return this._initialized;
    }

    /**
     * Renderer initialization.
     * @public
     */
    public initialize() {

        if (this._initialized) {
            return;
        } else {
            this._initialized = true;
        }

        this.handler.initialize();

        this.billboardsTextureAtlas.assignHandler(this.handler);
        this.fontAtlas.assignHandler(this.handler);
        this.strokeTextureAtlas.assignHandler(this.handler);

        this.handler.setFrameCallback(() => {
            this.draw();
        });

        this.events.initialize();

        // Bind console key
        this.events.on("charkeypress", input.KEY_APOSTROPHE, function () {
            cons.setVisibility(!cons.getVisibility());
        });

        this.handler.addProgram(screenFrame());

        this.pickingFramebuffer = new Framebuffer(this.handler, {
            width: 640,
            height: 480,
            targets: [{
                readAsync: true
            }]
        });
        this.pickingFramebuffer.init();

        this.depthFramebuffer = new Framebuffer(this.handler, {
            width: 640,
            height: 480,
            targets: [{
                internalFormat: "RGBA",
                type: "UNSIGNED_BYTE",
                attachment: "COLOR_ATTACHMENT",
                readAsync: true
            }, {
                internalFormat: "RGBA16F",
                type: "FLOAT",
                attachment: "COLOR_ATTACHMENT",
                readAsync: true
            }],
            useDepth: true
        });

        this.depthFramebuffer.init();

        this.screenDepthFramebuffer = new Framebuffer(this.handler, {
            useDepth: false
        });
        this.screenDepthFramebuffer.init();

        if (this.handler.gl!.type === "webgl") {
            this._readPickingBuffer = this._readPickingBuffer_webgl1;

            this.sceneFramebuffer = new Framebuffer(this.handler);
            this.sceneFramebuffer.init();

            this._fnScreenFrame = this._screenFrameNoMSAA;

            this.screenTexture = {
                screen: this.sceneFramebuffer!.textures[0],
                picking: this.pickingFramebuffer!.textures[0],
                depth: this.screenDepthFramebuffer!.textures[0]
            };
        } else {
            let _maxMSAA = this.getMaxMSAA(this._internalFormat);

            if (this._msaa > _maxMSAA) {
                this._msaa = _maxMSAA;
            }

            this.handler.addPrograms([toneMapping()]);

            this.handler.addPrograms([depth()]);

            this.sceneFramebuffer = new Multisample(this.handler, {
                size: 1,
                msaa: this._msaa,
                internalFormat: this._internalFormat,
                filter: "LINEAR"
            });

            this.sceneFramebuffer.init();

            this.blitFramebuffer = new Framebuffer(this.handler, {
                size: 1,
                useDepth: false,
                targets: [{
                    internalFormat: this._internalFormat,
                    format: this._format,
                    type: this._type,
                    filter: "NEAREST"
                }]
            });

            this.blitFramebuffer.init();

            this.toneMappingFramebuffer = new Framebuffer(this.handler, {
                useDepth: false
            });

            this.toneMappingFramebuffer.init();

            this._fnScreenFrame = this._screenFrameMSAA;

            this.screenTexture = {
                screen: this.toneMappingFramebuffer!.textures[0],
                picking: this.pickingFramebuffer!.textures[0],
                depth: this.screenDepthFramebuffer!.textures[0],
                frustum: this.depthFramebuffer!.textures[0]
            };
        }

        this.handler.ONCANVASRESIZE = () => {
            this._resizeStart();
            this.events.dispatch(this.events.resize, this.handler.canvas);
            this._resizeEnd();
            //clearTimeout(__resizeTimeout);
            // __resizeTimeout = setTimeout(() => {
            //     this._resizeEnd();
            //     this.events.dispatch(this.events.resizeend, this.handler.canvas);
            // }, 320);
            this.events.dispatch(this.events.resizeend, this.handler.canvas);
        };

        this.screenFramePositionBuffer = this.handler.createArrayBuffer(new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), 2, 4);

        this.outputTexture = this.screenTexture.screen;

        this._initializeRenderNodes();

        this._initializeControls();
    }

    public _initializeControls() {
        let temp = this.controls;
        this.controls = {};
        for (let i in temp) {
            this.addControl(temp[i]);
        }
    }

    public resize() {
        this._resizeEnd();
    }

    public setCurrentScreen(screenName: string) {
        this._currentOutput = screenName;
        if (this.screenTexture[screenName]) {
            this.outputTexture = this.screenTexture[screenName];
        }
    }

    public _resizeStart() {
        let c = this.handler.canvas!;

        this.activeCamera!.setViewportSize(c.width, c.height);
        this.sceneFramebuffer!.setSize(c.width * 0.5, c.height * 0.5);
        this.blitFramebuffer && this.blitFramebuffer.setSize(c.width * 0.5, c.height * 0.5, true);
    }

    public _resizeEnd() {
        let c = this.handler.canvas!;

        this.activeCamera!.setViewportSize(c.width, c.height);
        this.sceneFramebuffer!.setSize(c.width, c.height);
        this.blitFramebuffer && this.blitFramebuffer.setSize(c.width, c.height, true);

        this.toneMappingFramebuffer && this.toneMappingFramebuffer.setSize(c.width, c.height, true);
        this.screenDepthFramebuffer && this.screenDepthFramebuffer.setSize(c.clientWidth, c.clientHeight, true);
        //this.depthFramebuffer && this.depthFramebuffer.setSize(c.clientWidth, c.clientHeight, true);

        if (this.handler.gl!.type === "webgl") {
            this.screenTexture.screen = (this.sceneFramebuffer as Framebuffer)!.textures[0];
            this.screenTexture.picking = this.pickingFramebuffer!.textures[0];
            this.screenTexture.depth = this.screenDepthFramebuffer!.textures[0];
            this.screenTexture.frustum = this.depthFramebuffer!.textures[0];
        } else {
            this.screenTexture.screen = this.toneMappingFramebuffer!.textures[0];
            this.screenTexture.picking = this.pickingFramebuffer!.textures[0];
            this.screenTexture.depth = this.screenDepthFramebuffer!.textures[0];
            this.screenTexture.frustum = this.depthFramebuffer!.textures[0];
        }

        this.setCurrentScreen(this._currentOutput);
    }

    public removeNode(renderNode: RenderNode) {
        // TODO: replace from RenderNode to this method
        renderNode.remove();
    }

    /**
     * Adds render node to the renderer.
     * @public
     * @param {RenderNode} renderNode - Render node.
     */
    public addNode(renderNode: RenderNode) {
        if (!this.renderNodes[renderNode.name]) {
            renderNode.assign(this);
            this._renderNodesArr.unshift(renderNode);
            this.renderNodes[renderNode.name] = renderNode;
        } else {
            cons.logWrn(`Node name ${renderNode.name} already exists.`);
        }
    }

    protected _initializeRenderNodes() {
        for (let i = 0; i < this._renderNodesArr.length; i++) {
            this._renderNodesArr[i].initialize();
        }
    }

    /**
     * Adds render node to the renderer before specific node.
     * @public
     * @param {RenderNode} renderNode - Render node.
     * @param {RenderNode} renderNodeBefore - Insert before the renderNodeBefore node.
     */
    public addNodeBefore(renderNode: RenderNode, renderNodeBefore: RenderNode) {
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
            cons.logWrn(`Node name ${renderNode.name} already exists.`);
        }
    }

    /**
     * Adds render nodes array to the renderer.
     * @public
     * @param {Array.<RenderNode>} nodesArr - Render nodes array.
     */
    public addNodes(nodesArr: RenderNode[]) {
        for (let i = 0; i < nodesArr.length; i++) {
            this.addNode(nodesArr[i]);
        }
    }

    public getMaxMSAA(internalFormat: string) {
        let gl = this.handler.gl!;
        let samples = gl.getInternalformatParameter(gl.RENDERBUFFER, (gl as any)[internalFormat], gl.SAMPLES);
        return samples[0];
    }

    public getMSAA(): number {
        return this._msaa;
    }

    /**
     * TODO: replace with cache friendly linked list by BillboardHandler, LabelHandler etc.
     */
    public enqueueEntityCollectionsToDraw(ecArr: EntityCollection[], depthOrder: number = 0) {
        if (!this._entityCollections[depthOrder]) {
            this._entityCollections[depthOrder] = [];
        }
        this._entityCollections[depthOrder].push(...ecArr);
    }

    /**
     * Forces the depth buffer to be refreshed in the next frame.
     * Has effect for terrain altitude estimate precision.
     */
    public markForDepthRefresh(): void {
        this._depthRefreshRequired = true;
    }

    /**
     * @protected
     */
    protected _drawEntityCollections(depthOrder: number) {
        let ec = this._entityCollections[depthOrder];

        if (ec.length) {
            let gl = this.handler.gl!;

            this.enableBlendDefault();

            // Point Clouds
            let i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].pointCloudHandler.draw();
            }

            // GeoObjects
            i = ec.length;
            while (i--) {
                let eci = ec[i];
                if (ec[i]._fadingOpacity) {
                    eci.events.dispatch(eci.events.draw, eci);
                    ec[i].geoObjectHandler.draw();
                }
            }

            //
            // billboards pass
            //
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.billboardsTextureAtlas.texture!);

            i = ec.length;
            while (i--) {
                let eci = ec[i];
                eci._fadingOpacity && eci.billboardHandler.draw();
            }

            //
            // labels pass
            //
            let fa = this.fontAtlas.atlasesArr;
            for (i = 0; i < fa.length; i++) {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, fa[i].texture!);
            }

            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].labelHandler.draw();
            }

            //
            // Lines, Rays and Strips
            //
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.strokeTextureAtlas.texture!);

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

    protected _drawPickingEntityCollections(depthOrder: number) {
        let ec = this._entityCollections[depthOrder];
        if (ec.length) {
            // billboard pass
            let i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].billboardHandler.drawPicking();
            }
            // geoObject pass
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].geoObjectHandler.drawPicking();
            }
            // label pass
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].labelHandler.drawPicking();
            }
            // ray pass
            i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].rayHandler.drawPicking();
            }
            // polyline pass
            i = ec.length;
            while (i--) {
                ec[i]._visibility && ec[i].polylineHandler.drawPicking();
            }
            //Strip pass
            i = ec.length;
            while (i--) {
                ec[i]._visibility && ec[i].stripHandler.drawPicking();
            }
            // //pointClouds pass
            // i = ec.length;
            // while (i--) {
            //    ec[i]._visibility && ec[i].pointCloudHandler.drawPicking();
            // }
        }
    }

    protected _drawDepthEntityCollections(depthOrder: number) {
        let ec = this._entityCollections[depthOrder];
        if (ec.length) {
            // geoObject pass
            let i = ec.length;
            while (i--) {
                ec[i]._fadingOpacity && ec[i].geoObjectHandler.drawDepth();
            }

            // i = ec.length;
            // while (i--) {
            //     ec[i]._fadingOpacity && ec[i].rayHandler.drawDepth();
            // }
            //
            // // polyline pass
            // i = ec.length;
            // while (i--) {
            //     ec[i]._visibility && ec[i].polylineHandler.drawDepth();
            // }
            //
            // //Strip pass
            // i = ec.length;
            // while (i--) {
            //     ec[i]._visibility && ec[i].stripHandler.drawDepth();
            // }
        }
    }

    protected _clearEntityCollectionQueue(depthOrder: number) {
        this._entityCollections[depthOrder].length = 0;
        this._entityCollections[depthOrder] = [];
    }

    /**
     * Draw nodes.
     * @public
     */
    public draw() {
        this.activeCamera!.checkMoveEnd();
        let e = this.events;
        let pointerEvent = e.pointerEvent();
        let pointerFree = !e.mouseState.leftButtonDown && !e.mouseState.rightButtonDown;
        let touchTrigger = e.touchState.touchStart || e.touchState.touchEnd;
        const refreshDepth = (pointerEvent && pointerFree)
            || touchTrigger
            || this._depthRefreshRequired;
        this._depthRefreshRequired = false;
        e.handleEvents();

        let sceneFramebuffer = this.sceneFramebuffer!;
        sceneFramebuffer.activate();

        let h = this.handler,
            gl = h.gl!;

        gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.enableBlendDefault();

        e.dispatch(e.draw, this);

        this.activeCamera!.checkFly();

        let frustums = this.activeCamera!.frustums;

        

        // Rendering scene nodes and entityCollections
        let rn = this._renderNodesArr;
        let k = frustums.length;

        //
        // RenderNodes PASS
        //
        while (k--) {
            this.activeCamera!.setCurrentFrustum(k);
            gl.clear(gl.DEPTH_BUFFER_BIT);

            let i = rn.length;
            while (i--) {
                rn[i].preDrawNode();
            }

            i = rn.length;
            while (i--) {
                this.enableBlendDefault();
                rn[i].drawNode();
            }

            this._drawEntityCollections(0);

            e.dispatch(e.drawtransparent, this);

            if (refreshDepth) {
                this._drawPickingBuffer(0);
            }

            this._drawDepthBuffer(0);

            this._clearEntityCollectionQueue(0);
        }

        //
        // EntityCollections PASS
        //
        for (let i = 1; i < this._entityCollections.length; i++) {
            gl.clear(gl.DEPTH_BUFFER_BIT);
            let k = frustums.length;
            while (k--) {
                this.activeCamera!.setCurrentFrustum(k);

                this._drawEntityCollections(i);

                if (refreshDepth) {
                    this._drawPickingBuffer(i);
                }

                this._drawDepthBuffer(i);
            }

            this._clearEntityCollectionQueue(i);
        }

        sceneFramebuffer.deactivate();

        this.blitFramebuffer && (sceneFramebuffer as Multisample).blitTo(this.blitFramebuffer, 0);

        if (refreshDepth) {
            this._readPickingBuffer();
            this._readDepthBuffer();
        }

        // Tone mapping followed by rendering on the screen
        this._fnScreenFrame!();

        e.dispatch(e.postdraw, this);

        e.mouseState.wheelDelta = 0;
        e.mouseState.justStopped = false;
        e.mouseState.moving = false;
        e.touchState.moving = false;
    }

    public getImageDataURL(type: string = "image/png", quality: number = 1.0): string {
        this.draw();
        return this.handler.canvas ? this.handler.canvas.toDataURL(type, quality) : "";
    }

    protected _screenFrameMSAA() {
        let h = this.handler;

        let sh = h.programs.toneMapping,
            p = sh._program,
            gl = h.gl!;

        gl.disable(gl.DEPTH_TEST);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

        this.toneMappingFramebuffer!.activate();

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        sh.activate();

        // screen texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.blitFramebuffer!.textures[0]);
        gl.uniform1i(p.uniforms.hdrBuffer, 0);

        gl.uniform1f(p.uniforms.gamma, this.gamma);
        gl.uniform1f(p.uniforms.exposure, this.exposure);
        gl.uniform1f(p.uniforms.whitepoint, this.whitepoint);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.toneMappingFramebuffer!.deactivate();

        // SCREEN PASS
        sh = h.programs.screenFrame;
        p = sh._program;
        sh.activate();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);
        gl.uniform1i(p.uniforms.texture, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.enable(gl.DEPTH_TEST);
    }

    protected _screenFrameNoMSAA() {

        let h = this.handler;
        let sh = h.programs.screenFrame,
            p = sh._program,
            gl = h.gl!;

        gl.disable(gl.DEPTH_TEST);
        sh.activate();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.outputTexture);
        gl.uniform1i(p.uniforms.texture, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.screenFramePositionBuffer!);
        gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.enable(gl.DEPTH_TEST);
    }

    /**
     * Draw picking objects framebuffer.
     * @private
     */
    protected _drawPickingBuffer(depthOrder: number) {
        this.pickingFramebuffer!.activate();

        let h = this.handler;
        let gl = h.gl!;

        if (this.activeCamera!.isFirstPass && depthOrder === 0) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        } else {
            gl.clear(gl.DEPTH_BUFFER_BIT);
        }

        //
        // draw picking scenes, usually we don't need blending,
        // but sometimes set it manually in the callbacks
        //
        gl.disable(gl.BLEND);

        if (depthOrder === 0) {
            let dp = this._pickingCallbacks;
            for (let i = 0, len = dp.length; i < len; i++) {
                /**
                 * This callback renders picking frame.
                 */
                dp[i].callback.call(dp[i].sender);
            }
        }

        this._drawPickingEntityCollections(depthOrder);

        gl.enable(gl.BLEND);

        this.pickingFramebuffer!.deactivate();
    }

    protected _drawDepthBuffer(depthOrder: number) {
        this.depthFramebuffer!.activate();

        let h = this.handler;
        let gl = h.gl!;

        gl.disable(gl.BLEND);

        if (this.activeCamera!.isFirstPass && depthOrder === 0) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        } else {
            gl.clear(gl.DEPTH_BUFFER_BIT);
        }

        if (depthOrder === 0) {
            let dp = this._depthCallbacks;
            let i = dp.length;
            while (i--) {
                /**
                 * This callback renders depth frame.
                 */
                dp[i].callback.call(dp[i].sender);
            }
        }

        this._drawDepthEntityCollections(depthOrder);

        this.depthFramebuffer!.deactivate();

        //
        // DEBUG SCREEN OUTPUTS, for depth and frustum screen testing
        //
        if (this._currentOutput === "depth" || this._currentOutput === "frustum") {
            //
            // PASS to depth visualization
            this.screenDepthFramebuffer!.activate();
            let sh = h.programs.depth,
                p = sh._program;

            gl.bindBuffer(gl.ARRAY_BUFFER, this.screenFramePositionBuffer!);
            gl.vertexAttribPointer(p.attributes.corners, 2, gl.FLOAT, false, 0, 0);

            sh.activate();

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.depthFramebuffer!.textures[1]);
            gl.uniform1i(p.uniforms.depthTexture, 0);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            this.screenDepthFramebuffer!.deactivate();
        }
        gl.enable(gl.BLEND);
    }

    protected _readDepthBuffer(callback?: () => void) {
        this.depthFramebuffer!.readPixelBuffersAsync(callback);
    }

    protected _readPickingBuffer_webgl1() {
        this.pickingFramebuffer!.readPixelBuffersAsync();
    }

    protected _readPickingBuffer_webgl2() {
        this.pickingFramebuffer!.readPixelBuffersAsync();
    }

    public readPickingColor(x: number, y: number, outColor: NumberArray3 | Uint8Array) {
        let w = this.pickingFramebuffer!.width;
        let h = this.pickingFramebuffer!.height;

        x = Math.round(x * w);
        y = Math.round(y * h);

        let ind = (y * w + x) * 4;

        let _tempPickingPix_ = this.pickingFramebuffer?.pixelBuffers[0].data;

        if (_tempPickingPix_) {
            outColor[0] = _tempPickingPix_[ind];
            outColor[1] = _tempPickingPix_[ind + 1];
            outColor[2] = _tempPickingPix_[ind + 2];
        }
    }

    public readDepth(x: number, y: number, outDepth: NumberArray3 | Float32Array) {

        let ddd = new Float32Array(4);
        let fff = new Uint8Array(4);

        this.depthFramebuffer!.readData(x, y, fff, 0);
        this.depthFramebuffer!.readData(x, y, ddd, 1);

        outDepth[0] = ddd[0];
        outDepth[1] = Math.round(fff[0] / 10.0) - 1.0; // See Camera.frustumColorIndex
    }

    /**
     * Returns the distance from the active (screen) camera to the 3d-surface using the defined screen coordinates
     * @public
     * @param {Vec2 | IBaseInputState} px - Screen coordinates.
     * @returns {number | undefined} -
     */
    public getDistanceFromPixel(px: Vec2 | IBaseInputState): number | undefined {

        let camera = this.activeCamera!;

        let cnv = this.handler!.canvas!;

        let nx = px.x / cnv.width;
        let ny = (cnv.height - px.y) / cnv.height;

        _tempDepth_[0] = _tempDepth_[1] = 0.0;

        this.readDepth(nx, ny, _tempDepth_);

        if (_tempDepth_[1] === -1) return;

        let depth = _tempDepth_[0],
            frustum = camera.frustums[_tempDepth_[1]];

        if (!frustum) return;

        let ndc = new Vec4(nx * 2.0 - 1.0, ny * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        let view = frustum.inverseProjectionMatrix.mulVec4(ndc);
        let zView = -view.z / view.w;

        //
        // todo: maybe lets calculate distance to camera eye????? No?
        //
        if (camera.isOrthographic) return zView;

        let dir = (px as IBaseInputState).direction || camera.unproject(px.x, px.y);
        return zView / Math.max(1e-6, dir.dot(camera.getForward()));
    }

    /**
     * Returns 3d coordinates from screen coordinates
     * @public
     * @param {Vec2 | IBaseInputState} px - Screen coordinates.
     * @returns {Vec3 | undefined} -
     */
    public getCartesianFromPixel(px: Vec2 | IBaseInputState): Vec3 | undefined {
        let dist = this.getDistanceFromPixel(px);
        if (dist) {
            if (this.activeCamera.isOrthographic) {
                let res = new Vec3();
                this.activeCamera.unproject(px.x, px.y, dist, res);
                return res;
            } else {
                let direction = (px as IBaseInputState).direction || this.activeCamera.unproject(px.x, px.y);
                return direction.scaleTo(dist).addA(this.activeCamera.eye);
            }
        }
    }

    public getCartesianFromPixelAsync(px: Vec2 | IBaseInputState): Promise<Vec3 | undefined> {
        return new Promise((resolve, reject) => {
            this._readDepthBuffer(() => {
                resolve(this.getCartesianFromPixel(px));
            });
        });
    }

    public getDepthMinDistance(): number {
        let cnv = this.handler!.canvas!;
        let w = cnv.width,
            h = cnv.height,
            min = MAX_FLOAT;
        let size = h * w;
        let p = new Vec2();
        for (let i = 0; i < size; i++) {
            p.x = i % w;
            p.y = Math.floor(i / w);
            let d = this.getDistanceFromPixel(p);
            if (d && (d < min)) {
                min = d;
            }
        }
        return min < MAX_FLOAT ? min : 0;
    }

    public getDepthMinDistanceAsync(): Promise<number> {
        return new Promise((resolve, reject) => {
            this._readDepthBuffer(() => {
                resolve(this.getDepthMinDistance());
            });
        });
    }

    public async setOrthographicProjection(isOrtho: boolean) {
        if (isOrtho !== this.activeCamera.isOrthographic) {
            let dist = await this.getDepthMinDistanceAsync();
            if (dist && isOrtho) {
                this.activeCamera.focusDistance = dist;
            }
            this.activeCamera.isOrthographic = isOrtho;
            this.events.dispatch(this.events.projchanged, this.activeCamera);
        }
    }

    /**
     * Function starts renderer
     * @public
     */
    public start() {
        if (!this._initialized) {
            this.initialize();
        }
        this.handler.start();
    }

    public destroy() {
        for (let i in this.controls) {
            this.controls[i].remove();
        }

        for (let i = 0; i < this._renderNodesArr.length; i++) {
            this._renderNodesArr[i].remove();
        }

        this.div = null;

        this._renderNodesArr = [];

        this.renderNodes = {};

        //@ts-ignore
        this.activeCamera = null;

        this.controls = {};

        this.controlsBag = {};

        this.colorObjects.clear();

        this._pickingCallbacks = [];

        this.pickingFramebuffer = null;

        //@ts-ignore
        this._tempPickingPix_ = null;

        this._depthCallbacks = [];

        this.depthFramebuffer = null;

        this.sceneFramebuffer = null;

        this.blitFramebuffer = null;

        this.toneMappingFramebuffer = null;

        // todo
        //this.billboardsTextureAtlas.clear();
        //this.fontAtlas.clear();
        //this.strokeTextureAtlas.clear();

        this._entityCollections = [[]];

        this.handler.ONCANVASRESIZE = null;
        this.handler.destroy();

        // @ts-ignore
        this.handler = null;

        this._initialized = false;
    }

}

export {Renderer};
