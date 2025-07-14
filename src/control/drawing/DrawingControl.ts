import {Control, type IControlParams} from "../Control";
import {LineStringDrawingScene} from "./LineStringDrawingScene";
import {PolygonDrawingScene} from "./PolygonDrawingScene";

export interface IDrawingControlParams extends IControlParams {
    cornerStyle?: any;
    centerStyle?: any;
    outlineStyle?: any;
    fillStyle?: any;
}

class DrawingControl extends Control {
    protected _drawingScene: PolygonDrawingScene;

    constructor(options: IDrawingControlParams = {}) {
        super(options);

        this._drawingScene = new LineStringDrawingScene({
            name: `drawingScene:${this.__id}`,
            cornerStyle: options.cornerStyle || {},
            centerStyle: options.centerStyle || {},
            outlineStyle: options.outlineStyle || {},
            fillStyle: options.fillStyle || {},
        });
    }

    public activatePolygonDrawing() {
        this.deactivate();
        this._drawingScene = new PolygonDrawingScene({
            name: `polygonDrawingScene:${this.__id}`,
            cornerStyle: this._drawingScene._cornerStyle,
            centerStyle: this._drawingScene._centerStyle,
            outlineStyle: this._drawingScene._outlineStyle,
            fillStyle: this._drawingScene._fillStyle,
        });
        this.activate();
    }

    public activateLineStringDrawing() {
        this.deactivate();
        this._drawingScene = new LineStringDrawingScene({
            name: `linestringDrawingScene:${this.__id}`,
            cornerStyle: this._drawingScene._cornerStyle,
            centerStyle: this._drawingScene._centerStyle,
            outlineStyle: this._drawingScene._outlineStyle,
            fillStyle: this._drawingScene._fillStyle,
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

export {DrawingControl};
