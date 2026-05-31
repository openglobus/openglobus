import * as quadTree from "../quadTree/quadTree";
import type { EventCallback, EventsHandler } from "../Events";
import { BaseTileMaterialLayer } from "./BaseTileMaterialLayer";
import type { IBaseTileMaterialLayerParams } from "./BaseTileMaterialLayer";
import type { LayerEventsList } from "./Layer";
import { Material } from "../layer/Material";
import { Planet } from "../scene/Planet";

type ApplyImageFunc = (material: HTMLCanvasElement | ImageBitmap | HTMLImageElement) => void;
type DrawTileCallback = (material: Material, applyImage: ApplyImageFunc) => void;

export interface ICanvasTilesParams extends IBaseTileMaterialLayerParams {
    drawTile: DrawTileCallback;
    animated?: boolean;
    minNativeZoom?: number;
    maxNativeZoom?: number;
}

type CanvasTilesEventsList = ["load", "loadend"];

type CanvasTilesEventsType = EventsHandler<CanvasTilesEventsList> & EventsHandler<LayerEventsList>;

const CANVASTILES_EVENTS: CanvasTilesEventsList = [
    /**
     * Triggered when the current tile image has loaded before rendering.
     * @event load
     */
    "load",

    /**
     * Triggered when all tiles have loaded or loading has stopped.
     * @event loadend
     */
    "loadend"
];

/**
 * Layer that renders each tile as a separate canvas object.
 * @class
 * @extends {Layer}
 * @param {string} [name="noname"] - Layer name.
 * @param {ICanvasTilesParams} options - Layer options.
 * @param {number} [options.opacity=1.0] - Layer opacity.
 * @param {number} [options.minZoom=0] - Minimal visibility zoom level.
 * @param {number} [options.maxZoom=50] - Maximal visibility zoom level.
 * @param {string} [options.attribution] - Layer attribution shown in the attribution area.
 * @param {boolean} [options.isBaseLayer=false] - Base layer flag.
 * @param {boolean} [options.visibility=true] - Layer visibility.
 * @param {boolean} [options.animated=false] - Re-draw ready tiles every frame.
 * @param {number} [options.minNativeZoom=0] - Minimal zoom level where native tile drawing is allowed.
 * @param {number} [options.maxNativeZoom=100] - Maximal zoom level where native tile drawing is allowed.
 * @param {DrawTileCallback} options.drawTile - Draw tile callback.
 * @fires load
 * @fires loadend
 */
class CanvasTiles extends BaseTileMaterialLayer {
    static MAX_REQUESTS: number = 20;
    static __requestsCounter: number = 0;

    public override events: CanvasTilesEventsType;

    public animated: boolean;

    /**
     * Current creating tiles counter.
     * @protected
     * @type {number}
     */
    protected _counter: number;

    /**
     * Queue of pending tiles waiting to be created.
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
        if (this._planet && this._planet.quadTreeStrategy._terrainCompletedActivated) {
            this._planet.events.dispatch(this._planet.events.layerloadend, this);
        }
    }

    public override get instanceName(): string {
        return "CanvasTiles";
    }

    public override get isIdle() {
        return super.isIdle && this._counter === 0;
    }

    /**
     * Abort loading tiles.
     * @public
     */
    public override abortLoading() {
        this._pendingsQueue.forEach((qi: Material) => {
            this.abortMaterialLoading(qi);
        });
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
    public override loadMaterial(material: Material, _forceLoading: boolean = false) {
        let seg = material.segment;

        if (this._isBaseLayer) {
            material.texture = seg.getDefaultTexture();
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
        } else if (this._counter === 0 && this._planet && this._planet.quadTreeStrategy._terrainCompletedActivated) {
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

    protected override _onMaterialReady(material: Material): void {
        if (this.animated) {
            requestAnimationFrame(() => {
                this.drawTile(material, function (canvas) {
                    material.applyImage(canvas);
                });
            });
        }
    }

    protected override _onParentMaterialApplied(material: Material, _psegm: Material): void {
        //
        // Animated doesn't work withMaxNativeZoom
        //
        if (this.animated) {
            requestAnimationFrame(() => {
                if (material.segment) {
                    this.drawTile(material, function (canvas) {
                        material.applyImage(canvas);
                    });
                }
            });
        }
    }

}

export { CanvasTiles };
