import { Control } from "../Control";
import { LineStringDrawingScene } from "./LineStringDrawingScene";
import { PolygonDrawingScene } from "./PolygonDrawingScene";

/**
 * Activate drawing
 */
class DrawingControl extends Control {
    _drawingScene: any;
    constructor(options: { [key: string]: any; } = {}) {
        super(options);

        this._drawingScene = new LineStringDrawingScene({
            name: `drawingScene:${this._id}`
        });
    }

    activatePolygonDrawing() {
        this.deactivate();
        this._drawingScene = new PolygonDrawingScene({
            name: `drawingScene:${this._id}`
        });
        this.activate();
    }

    activateLineStringDrawing() {
        this.deactivate();
        this._drawingScene = new LineStringDrawingScene({
            name: `drawingScene:${this._id}`
        });
        this.activate();
    }

    override oninit() {
    }

    override onactivate() {
        this._drawingScene.bindPlanet(this.planet);
        this.renderer.addNode(this._drawingScene);
    }

    override ondeactivate() {
        this.renderer.removeNode(this._drawingScene);
    }
}

export { DrawingControl };
