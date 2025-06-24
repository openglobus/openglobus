import { Control, type IControlParams } from "../Control";
import { LineStringDrawingScene } from "./LineStringDrawingScene";
import { PolygonDrawingScene } from "./PolygonDrawingScene";

export interface IDrawingControlParams extends IControlParams {
    corner_options?: any;
    center_options?: any;
    outline_options?: any;
    fill_options?: any;
}

class DrawingControl extends Control {
    protected _drawingScene: PolygonDrawingScene;

    constructor(options: IDrawingControlParams = {}) {
        super(options);

        this._drawingScene = new LineStringDrawingScene({
            name: `drawingScene:${this.__id}`,
            corner_options: options.corner_options || {},
            center_options: options.center_options || {},
            outline_options: options.outline_options || {},
            fill_options: options.fill_options || {},
        });
    }

    public activatePolygonDrawing() {
        this.deactivate();
        this._drawingScene = new PolygonDrawingScene({
            name: `polygonDrawingScene:${this.__id}`,
            corner_options: this._drawingScene._corner_options,
            center_options: this._drawingScene._center_options,
            outline_options: this._drawingScene._outline_options,
            fill_options: this._drawingScene._fill_options,
        });
        this.activate();
    }

    public activateLineStringDrawing() {
        this.deactivate();
        this._drawingScene = new LineStringDrawingScene({
            name: `linestringDrawingScene:${this.__id}`,
            corner_options: this._drawingScene._corner_options,
            center_options: this._drawingScene._center_options,
            outline_options: this._drawingScene._outline_options,
            fill_options: this._drawingScene._fill_options,
        });
        this.activate();
    }

    public override oninit() {
    }

    public override onactivate() {
        this.planet && this._drawingScene.bindPlanet(this.planet);
        this.renderer && this.renderer.addNode(this._drawingScene);
    }

    public override ondeactivate() {
        this.renderer && this.renderer.removeNode(this._drawingScene);
    }
}

export { DrawingControl };
