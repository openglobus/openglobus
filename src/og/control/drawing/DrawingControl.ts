import {Control, IControlParams} from "../Control";
import {LineStringDrawingScene} from "./LineStringDrawingScene";
import {PolygonDrawingScene} from "./PolygonDrawingScene";

class DrawingControl extends Control {
    protected _drawingScene: PolygonDrawingScene;

    constructor(options: IControlParams) {
        super(options);

        this._drawingScene = new LineStringDrawingScene({
            name: `drawingScene:${this.__id}`
        });
    }

    public activatePolygonDrawing() {
        this.deactivate();
        this._drawingScene = new PolygonDrawingScene({
            name: `drawingScene:${this.__id}`
        });
        this.activate();
    }

    public activateLineStringDrawing() {
        this.deactivate();
        this._drawingScene = new LineStringDrawingScene({
            name: `drawingScene:${this.__id}`
        });
        this.activate();
    }

    public override oninit() {
    }

    public override onactivate() {
        this._drawingScene.bindPlanet(this.planet);
        this.renderer && this.renderer.addNode(this._drawingScene);
    }

    public override ondeactivate() {
        this.renderer && this.renderer.removeNode(this._drawingScene);
    }
}

export {DrawingControl};
