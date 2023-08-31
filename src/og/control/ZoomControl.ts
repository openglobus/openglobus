import {Key} from "../Lock";
import {Button} from "../ui/Button";
import {Control, IControlParams} from "./Control";
import {Vec2} from "../math/Vec2";

const ICON_PLUS_SVG = '<?xml version="1.0"?>' +
    '<svg width=24 height=24 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '    <path d="M 11 5 L 11 11 L 5 11 L 5 13 L 11 13 L 11 19 L 13 19 L 13 13 L 19 13 L 19 11 L 13 11 L 13 5 L 11 5 z"/>' +
    '</svg>';

const ICON_MINUS_SVG = '<?xml version="1.0"?>' +
    '<svg width=24 height=24 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '    <path d="M 5 11 L 5 13 L 19 13 L 19 11 L 5 11 z"/>' +
    '</svg>';

/**
 * Planet zoom buttons control.
 */
class ZoomControl extends Control {
    protected _keyLock: Key;
    protected _move: number;
    protected _targetPoint: Vec2 | null;

    constructor(options: IControlParams = {}) {
        super(options);
        this._keyLock = new Key();
        this._move = 0;
        this._targetPoint = null;
    }

    public override oninit() {

        let zoomInBtn = new Button({
            classList: ["og-map-button", "og-zoomin-button"],
            icon: ICON_PLUS_SVG
        });
        zoomInBtn.appendTo(this.renderer!.div!);


        let zoomOutBtn = new Button({
            classList: ["og-map-button", "og-zoomout-button"],
            icon: ICON_MINUS_SVG
        });
        zoomOutBtn.appendTo(this.renderer!.div!);

        zoomInBtn.events.on("mousedown", () => this.zoomIn());
        zoomInBtn.events.on("mouseup", () => this.stopZoom());
        zoomOutBtn.events.on("mousedown", () => this.zoomOut());
        zoomOutBtn.events.on("mouseup", () => this.stopZoom());
        zoomInBtn.events.on("touchstart", () => this.zoomIn());
        zoomInBtn.events.on("touchend", () => this.stopZoom());
        zoomInBtn.events.on("touchcancel", () => this.stopZoom());
        zoomOutBtn.events.on("touchstart", () => this.zoomOut());
        zoomOutBtn.events.on("touchend", () => this.stopZoom());
        zoomOutBtn.events.on("touchcancel", () => this.stopZoom());

        this.renderer!.events.on("draw", this._draw, this);
    }

    /**
     * Planet zoom in.
     * @public
     */
    public zoomIn() {
        this.planet!.layerLock.lock(this._keyLock);
        this.planet!.terrainLock.lock(this._keyLock);
        this.planet!._normalMapCreator.lock(this._keyLock);

        this._targetPoint = this.renderer!.getCenter();

        this._move = 1;
    }

    /**
     * Planet zoom out.
     * @public
     */
    zoomOut() {
        this.planet!.layerLock.lock(this._keyLock);
        this.planet!.terrainLock.lock(this._keyLock);
        this.planet!._normalMapCreator.lock(this._keyLock);

        this._targetPoint = this.renderer!.getCenter();
        this._move = -1;
    }

    public stopZoom() {
        this._move = 0;

        this.planet!.layerLock.free(this._keyLock);
        this.planet!.terrainLock.free(this._keyLock);
        this.planet!._normalMapCreator.free(this._keyLock);
    }

    protected _draw(e: any) {
        const cam = this.planet!.camera;

        if (this._move !== 0) {
            const pos = this.planet!.getCartesianFromPixelTerrain(e);
            if (pos) {
                let d = cam.eye.distance(pos) * 0.035;
                cam.eye.addA(cam.getForward().scale(this._move * d));
                cam.checkTerrainCollision();
                cam.update();
            }
        }
    }
}

export {ZoomControl};
