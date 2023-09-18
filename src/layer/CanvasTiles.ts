import * as quadTree from "../quadTree/quadTree";
import {EventCallback, EventsHandler} from "../Events";
import {ILayerParams, Layer, LayerEventsList} from "./Layer";
import {Material} from "../layer/Material";
import {NumberArray4} from "../math/Vec4";
import {Planet} from "../scene/Planet";

type ApplyImageFunc = (material: HTMLCanvasElement | ImageBitmap | HTMLImageElement) => void;
type DrawTileCallback = (material: Material, applyImage: ApplyImageFunc) => void;

export interface ICanvasTilesParams extends ILayerParams {
    drawTile: DrawTileCallback;
    animated?: boolean;
    minNativeZoom?: number;
    maxNativeZoom?: number;
}

type CanvasTilesEventsList = [
    "load",
    "loadend"
];

type CanvasTilesEventsType = EventsHandler<CanvasTilesEventsList> & EventsHandler<LayerEventsList>;

const CANVASTILES_EVENTS: CanvasTilesEventsList = [
    /**
     * Triggered when current tile image has loaded before rendering.
     * @event og.layer.CanvasTiles#load
     */
    "load",

    /**
     * Triggered when all tiles have loaded or loading has stopped.
     * @event og.layer.CanvasTiles#loadend
     */
    "loadend"
];

/**
 * Layer used to rendering each tile as a separate canvas object.
 * @class
 * @extends {Layer}
 * @param {String} [name="noname"] - Layer name.
 * @param {ICanvasTilesParams} options:
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=0] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution that displayed in the attribution area on the screen.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {DrawTileCallback} options.drawTile - Draw tile callback.
 * @fires EventsHandler<CanvasTilesEventsList>#load
 * @fires EventsHandler<CanvasTilesEventsList>#loadend
 */
class CanvasTiles extends Layer {

    static MAX_REQUESTS: number = 20;
    static __requestsCounter: number = 0

    public override events: CanvasTilesEventsType;

    public animated: boolean;

    public minNativeZoom: number;
    public maxNativeZoom: number;

    /**
     * Current creating tiles counter.
     * @protected
     * @type {number}
     */
    protected _counter: number;

    /**
     * Tile pending queue that waiting for create.
     * @protected
     * @type {Material[]}
     */
    protected _pendingsQueue: Material[]; // new og.QueueArray();

    /**
     * Draw tile callback.
     * @type {DrawTileCallback}
     * @public
     */
    public drawTile: DrawTileCallback;

    protected _onLoadend_: EventCallback | null;


    constructor(name: string | null, options: ICanvasTilesParams) {
        super(name, options);

        //@ts-ignore
        this.events = this.events.registerNames(CANVASTILES_EVENTS);

        this.animated = options.animated || false;

        this.minNativeZoom = options.minNativeZoom || 0;
        this.maxNativeZoom = options.maxNativeZoom || 100;

        this._counter = 0;

        this._pendingsQueue = []; // new og.QueueArray();

        this.drawTile = options.drawTile;

        this._onLoadend_ = null;
    }

    public override addTo(planet: Planet) {
        this._onLoadend_ = this._onLoadend.bind(this);
        this.events.on("loadend", this._onLoadend_!, this);
        return super.addTo(planet);
    }

    public override remove() {
        this.events.off("loadend", this._onLoadend_);
        this._onLoadend_ = null;
        return super.remove();
    }

    public _onLoadend() {
        if (this._planet && this._planet._terrainCompletedActivated) {
            this._planet.events.dispatch(this._planet.events.layerloadend, this);
        }
    }

    public override get instanceName(): string {
        return "CanvasTiles";
    }

    public override get isIdle() {
        return !!this._planet && this._planet._terrainCompletedActivated && this._counter === 0;
    }

    /**
     * Abort loading tiles.
     * @public
     */
    public override abortLoading() {
        //const q = this._pendingsQueue;
        // for (let i = q._shiftIndex + 1; i < q._popIndex + 1; i++) {
        //     if (q._array[i]) {
        //         this.abortMaterialLoading(q._array[i]);
        //     }
        // }
        // this._pendingsQueue.clear();
        // for (let i = 0; i < q.length; i++) {
        //     this.abortMaterialLoading(q[i]);
        // }
        this._pendingsQueue.forEach((qi: Material) => {
            this.abortMaterialLoading(qi);
        })
        this._pendingsQueue = [];
    }

    /**
     * Sets layer visibility.
     * @public
     * @param {boolean} visibility - Layer visibility.
     */
    public override setVisibility(visibility: boolean) {
        if (visibility !== this._visibility) {
            super.setVisibility(visibility);

            if (!visibility) {
                this.abortLoading();
            }
        }
    }

    /**
     * Start to load tile material.
     * @public
     * @virtual
     * @param {Material} material -
     */
    public override loadMaterial(material: Material) {
        let seg = material.segment;

        if (this._isBaseLayer) {
            material.texture = seg._isNorth ? seg.planet.solidTextureOne : seg.planet.solidTextureTwo;
        } else {
            material.texture = seg.planet.transparentTexture;
        }

        if (this._planet!.layerLock.isFree() || material.segment.tileZoom < 2) {
            material.isReady = false;
            material.isLoading = true;
            if (CanvasTiles.__requestsCounter >= CanvasTiles.MAX_REQUESTS && this._counter) {
                this._pendingsQueue.push(material);
            } else {
                this._exec(material);
            }
        }
    }

    /**
     * Loads material image and apply it to the planet segment.
     * @protected
     * @param {Material} material - Loads material image.
     */
    protected _exec(material: Material) {
        CanvasTiles.__requestsCounter++;
        this._counter++;
        const e = this.events.load!;
        if (e.handlers.length) {
            this.events.dispatch(e, material);
        }
        requestAnimationFrame(() => {
            this.drawTile(material, (canvas: HTMLCanvasElement | ImageBitmap | HTMLImageElement) => {
                this._counter--;
                CanvasTiles.__requestsCounter--;
                this._correctCounter();
                if (material.isLoading) {
                    material.applyImage(canvas);
                }
                this._dequeueRequest();
            });
        });
    }

    protected _correctCounter() {
        if (this._counter < 0) this._counter = 0;
        if (CanvasTiles.__requestsCounter < 0) CanvasTiles.__requestsCounter = 0;
    }

    /**
     * Abort exact material loading.
     * @public
     * @param {Material} material - Segment material.
     */
    public override abortMaterialLoading(material: Material) {
        if (material.isLoading) {
            this._counter--;
            CanvasTiles.__requestsCounter--;
            this._correctCounter();
            this._dequeueRequest();
        }
        material.isLoading = false;
        material.isReady = false;
    }

    protected _dequeueRequest() {
        if (this._pendingsQueue.length) {
            if (CanvasTiles.__requestsCounter < CanvasTiles.MAX_REQUESTS) {
                const pmat = this._whilePendings();
                if (pmat) {
                    this._exec(pmat);
                }
            }
        } else if (this._counter === 0 && this._planet && this._planet._terrainCompletedActivated) {
            this.events.dispatch(this.events.loadend);
        }
    }

    protected _whilePendings(): Material | null {
        while (this._pendingsQueue.length) {
            const pmat = this._pendingsQueue.pop();
            if (pmat && pmat.segment && pmat.segment.node) {
                if (pmat.segment.initialized && pmat.segment.node.getState() === quadTree.RENDERING) {
                    return pmat;
                }
                pmat.isLoading = false;
            }
        }
        return null;
    }

    public override applyMaterial(material: Material): NumberArray4 {
        if (material.isReady) {

            // IMPORTANT!
            // Animated doesn't work withMaxNativeZoom
            // It could be fixed with call drawTile method only for parent
            // material (which is rendered on the current segment material),
            // just for one renderer frame
            if ((material.layer as CanvasTiles).animated) {
                requestAnimationFrame(() => {
                    this.drawTile(material, function (canvas) {
                        material.applyImage(canvas);
                    });
                });
            }

            return material.texOffset;

        } else if (material.segment.tileZoom < this.minNativeZoom) {
            material.textureNotExists();
        } else {

            let segment = material.segment;
            let pn = segment.node,
                parentTextureExists = false;
            let maxNativeZoom = (material.layer as CanvasTiles).maxNativeZoom;

            if (segment.passReady && !material.isLoading && segment.tileZoom <= maxNativeZoom) {
                this.loadMaterial(material);
            }

            let mId = this._id;
            let psegm = material;
            while (pn.parentNode) {
                pn = pn.parentNode;
                psegm = pn.segment.materials[mId];
                if (psegm && psegm.textureExists) {
                    parentTextureExists = true;
                    break;
                }
            }

            if (segment.passReady) {
                if (pn.segment.tileZoom === maxNativeZoom) {
                    if (segment.tileZoom > maxNativeZoom) {
                        material.textureNotExists();
                    }
                } else if (pn.segment.tileZoom < maxNativeZoom) {

                    let pn = segment.node;
                    while (pn.segment.tileZoom > maxNativeZoom) {
                        pn = pn.parentNode!;
                    }

                    let pnm = pn.segment.materials[mId];
                    if (pnm) {
                        !pnm.isLoading && !pnm.isReady && this.loadMaterial(pnm);
                    } else {
                        pnm = pn.segment.materials[material.layer._id] = material.layer.createMaterial(
                            pn.segment
                        );
                        this.loadMaterial(pnm);
                    }
                }
            }

            if (parentTextureExists) {

                //
                // Animated doesn't work withMaxNativeZoom
                //
                if ((material.layer as CanvasTiles).animated) {
                    requestAnimationFrame(() => {
                        this.drawTile(material, function (canvas) {
                            material.applyImage(canvas);
                        });
                    });
                }

                material.appliedNodeId = pn.nodeId;
                material.texture = psegm.texture;
                let dZ2 = 1.0 / (2 << (segment.tileZoom - pn.segment.tileZoom - 1));
                material.texOffset[0] = segment.tileX * dZ2 - pn.segment.tileX;
                material.texOffset[1] = segment.tileY * dZ2 - pn.segment.tileY;
                material.texOffset[2] = dZ2;
                material.texOffset[3] = dZ2;
            } else {
                material.texture = segment.planet.transparentTexture;
                material.texOffset[0] = 0.0;
                material.texOffset[1] = 0.0;
                material.texOffset[2] = 1.0;
                material.texOffset[3] = 1.0;
            }
        }

        return material.texOffset;
    }

    public override clearMaterial(material: Material) {
        if (material.isReady) {
            material.isReady = false;
            if (material.textureExists && material.texture && !material.texture.default) {
                material.segment.handler.gl!.deleteTexture(material.texture);
                material.texture = null;
            }
        }

        this.abortMaterialLoading(material);
        material.isLoading = false;
        material.textureExists = false;

        //@ts-ignore
        material.layer = null;
        //@ts-ignore
        material.segment = null;

        // if (material.image) {
        //     material.image.src = "";
        //     material.image = null;
        // }
    }
}

export {CanvasTiles};
