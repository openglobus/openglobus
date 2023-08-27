import { Key } from "../Lock";
import { Button } from "../ui/Button";
import { Control } from "./Control";

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
    private _keyLock: Key;
    private _move: number;
    private _targetPoint: any;

    constructor(options = {}) {
        super(options);
        this._keyLock = new Key();
        this._move = 0;
    }

    override oninit() {

        let zoomInBtn = new Button({
            classList: ["og-map-button", "og-zoomin-button"],
            icon: ICON_PLUS_SVG
        });
        zoomInBtn.appendTo(this.renderer.div);


        let zoomOutBtn = new Button({
            classList: ["og-map-button", "og-zoomout-button"],
            icon: ICON_MINUS_SVG
        });
        zoomOutBtn.appendTo(this.renderer.div);

        zoomInBtn.on("mousedown", () => this.zoomIn());
        zoomInBtn.on("mouseup", () => this.stopZoom());
        zoomOutBtn.on("mousedown", () => this.zoomOut());
        zoomOutBtn.on("mouseup", () => this.stopZoom());
        zoomInBtn.on("touchstart", () => this.zoomIn());
        zoomInBtn.on("touchend", () => this.stopZoom());
        zoomInBtn.on("touchcancel", () => this.stopZoom());
        zoomOutBtn.on("touchstart", () => this.zoomOut());
        zoomOutBtn.on("touchend", () => this.stopZoom());
        zoomOutBtn.on("touchcancel", () => this.stopZoom());

        this.renderer.events.on("draw", this._draw, this);
    }

    /**
     * Planet zoom in.
     * @public
     */
    zoomIn() {
        this.planet!.layerLock.lock(this._keyLock);
        this.planet!.terrainLock.lock(this._keyLock);
        this.planet!._normalMapCreator.lock(this._keyLock);

        this._targetPoint = this.renderer.getCenter();

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

        this._targetPoint = this.renderer.getCenter();
        this._move = -1;
    }

    stopZoom() {
        this._move = 0;

        this.planet!.layerLock.free(this._keyLock);
        this.planet!.terrainLock.free(this._keyLock);
        this.planet!._normalMapCreator.free(this._keyLock);
    }

    _draw(e: any) {
        const cam = this.renderer.activeCamera;

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

export function zoomControl(options: any) {
    return new ZoomControl(options);
}

export { ZoomControl };
