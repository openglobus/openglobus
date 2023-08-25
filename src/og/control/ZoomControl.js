"use strict";

import { Key } from "../Lock.js";
import { Button } from "../ui/Button.js";
import { Control } from "./Control.js";

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
 * @class
 * @extends {Control}
 * @params {Object} [options] - Control options.
 */
class ZoomControl extends Control {
    constructor(options = {}) {
        super(options);

        this._keyLock = new Key();

        this._move = 0;
    }

    oninit() {

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

        zoomInBtn.on("mousedown", (e) => this.zoomIn());
        zoomInBtn.on("mouseup", (e) => this.stopZoom());
        zoomOutBtn.on("mousedown", (e) => this.zoomOut());
        zoomOutBtn.on("mouseup", (e) => this.stopZoom());
        zoomInBtn.on("touchstart", (e) => this.zoomIn());
        zoomInBtn.on("touchend", (e) => this.stopZoom());
        zoomInBtn.on("touchcancel", (e) => this.stopZoom());
        zoomOutBtn.on("touchstart", (e) => this.zoomOut());
        zoomOutBtn.on("touchend", (e) => this.stopZoom());
        zoomOutBtn.on("touchcancel", (e) => this.stopZoom());

        this.renderer.events.on("draw", this._draw, this);
    }

    /**
     * Planet zoom in.
     * @public
     */
    zoomIn() {
        this.planet.layerLock.lock(this._keyLock);
        this.planet.terrainLock.lock(this._keyLock);
        this.planet._normalMapCreator.lock(this._keyLock);

        this._targetPoint = this.renderer.getCenter();

        this._move = 1;
    }

    /**
     * Planet zoom out.
     * @public
     */
    zoomOut() {
        this.planet.layerLock.lock(this._keyLock);
        this.planet.terrainLock.lock(this._keyLock);
        this.planet._normalMapCreator.lock(this._keyLock);

        this._targetPoint = this.renderer.getCenter();
        this._move = -1;
    }

    stopZoom() {
        this._move = 0;

        this.planet.layerLock.free(this._keyLock);
        this.planet.terrainLock.free(this._keyLock);
        this.planet._normalMapCreator.free(this._keyLock);
    }

    _draw(e) {
        var cam = this.renderer.activeCamera;

        if (this._move !== 0) {
            let pos = this.planet.getCartesianFromPixelTerrain(e);
            if (pos) {
                let d = cam.eye.distance(pos) * 0.035;
                cam.eye.addA(cam.getForward().scale(this._move * d));
                cam.checkTerrainCollision();
                cam.update();
            }
        }
    }
}

export function zoomControl(options) {
    return new ZoomControl(options);
}

export { ZoomControl };
