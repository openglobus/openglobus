import {Entity} from '../../entity/Entity';
import {createEvents, EventsHandler} from '../../Events';
import {LonLat} from "../../LonLat";
import {Object3d} from '../../Object3d';
import {Planet} from "../../scene/Planet";
import {RenderNode} from '../../scene/RenderNode';
import {Vector} from '../../layer/Vector';
import {Vec2} from '../../math/Vec2';
import {Vec3} from '../../math/Vec3';
import {IMouseState} from "../../renderer/RendererEvents";
import {Ellipsoid} from "../../ellipsoid/Ellipsoid";
import {ILabelParams} from "../../entity/Label";

const OUTLINE_COUNT = 120;

export interface IRulerSceneParams {
    name?: string;
    ignoreTerrain?: boolean;
    planet?: Planet;
}

export const distanceFormat = (v: number): string => {
    if (v > 1000) {
        return `${(v / 1000).toFixed(1)} km`;
    } else if (v > 9) {
        return `${Math.round(v)} m`;
    } else {
        return `${v.toFixed(1)} m`;
    }
}

let obj3d = Object3d.createCylinder(1.1, 0, 2.7, 20, 1, true, false, 0, 0, 0);

const LABEL_OPTIONS: ILabelParams = {
    text: "",
    size: 11,
    color: "rgba(455,455,455,1.0)",
    outlineColor: "rgba(0,0,0,0.34)",
    outline: 0.23,
    align: "center",
    offset: [0, 20, 0]
};
const RULER_CORNER_OPTIONS = {
    scale: 1,
    instanced: true,
    tag: "ruler",
    color: "rgb(0,305,0)",
    object3d: obj3d
};

type RulerSceneEventsList = [
    "add",
    "remove",
    "mousemove",
    "mouseenter",
    "mouseleave",
    "lclick",
    "rclick",
    "mclick",
    "ldblclick",
    "rdblclick",
    "mdblclick",
    "lup",
    "rup",
    "mup",
    "ldown",
    "rdown",
    "mdown",
    "lhold",
    "rhold",
    "mhold",
    "mousewheel",
    "touchmove",
    "touchstart",
    "touchend",
    "doubletouch",
    "touchleave",
    "touchenter"
];

class RulerScene extends RenderNode {
    public events: EventsHandler<RulerSceneEventsList>;
    protected _ignoreTerrain: boolean;
    protected _planet: Planet | null;
    protected _startLonLat: LonLat | null;
    protected _preventClick: boolean;
    protected _stopDrawing: boolean;
    protected _pickedCorner: Entity | null;
    protected _startPos: Vec2 | null;
    protected _startClick: Vec2;
    protected _heading: number;
    protected _trackLayer: Vector;
    protected _labelLayer: Vector;
    protected _cornersLayer: Vector;
    protected _cornerEntity: Entity[];
    protected _propsLabel: Entity;
    protected _trackEntity: Entity;

    // _onLclick_: Function;
    // _onMouseMove_: any; // (e: any) => void;
    // _onLdblclick_: any; // () => void;
    // _onLUp_: any; // () => void;
    // _onCornerEnter_: any // (e: any) => void;
    // _onCornerLeave_: any // (e: any) => void;
    // _onCornerLdown_: any // (e: any) => void;
    // _onCornerLup_: any; // () => void;
    protected _anchorLonLat: LonLat | null;
    protected _timeout: any;

    constructor(options: IRulerSceneParams = {}) {
        super(options.name);

        this.events = createEvents(RULERSCENE_EVENTS);

        this._ignoreTerrain = options.ignoreTerrain != undefined ? options.ignoreTerrain : true;

        this._planet = options.planet || null;

        this._startLonLat = null;
        this._preventClick = false;
        this._stopDrawing = false;

        this._pickedCorner = null;
        this._startPos = null;
        this._startClick = new Vec2();

        this._anchorLonLat = null;

        this._heading = 0;

        this._trackLayer = new Vector("track", {
            entities: [],
            pickingEnabled: false,
            polygonOffsetUnits: -1.0,
            relativeToGround: true,
            displayInLayerSwitcher: false
        });

        this._labelLayer = new Vector("ruler-label", {
            entities: [],
            pickingEnabled: false,
            polygonOffsetUnits: -100.0,
            relativeToGround: true,
            displayInLayerSwitcher: false
        });

        this._cornersLayer = new Vector("corners", {
            entities: [],
            pickingEnabled: true,
            displayInLayerSwitcher: false,
            scaleByDistance: [100, 4000000, 1.0],
            pickingScale: 2
        });

        this._propsLabel = new Entity({
            name: 'propsLabel',
            label: LABEL_OPTIONS
        });

        this._trackEntity = new Entity({
            polyline: {
                path3v: [],
                thickness: 4.8,
                color: "rgb(255,131,0)",
                isClosed: false
            }
        });

        this._trackEntity.polyline!.altitude = 0.01;

        this._cornerEntity = [
            new Entity({
                geoObject: RULER_CORNER_OPTIONS,
                properties: {
                    name: "start"
                }
            }),
            new Entity({
                geoObject: RULER_CORNER_OPTIONS,
                properties: {
                    name: "end"
                }
            })
        ];
    }

    public set ignoreTerrain(v: boolean) {
        this._ignoreTerrain = v;
        if (v) {
            //...redraw line
        }
    }

    public bindPlanet(planet: Planet) {
        this._planet = planet;
    }

    protected _createCorners() {
        this._cornersLayer.addEntities(this._cornerEntity)
    }

    public override init() {
        this._createCorners();
        this._trackLayer.addEntities([this._trackEntity]);
        this._labelLayer.addEntities([this._propsLabel]);
        this._planet!.addLayer(this._labelLayer);
        this._planet!.addLayer(this._trackLayer);
        this._planet!.addLayer(this._cornersLayer);
        this._activate();
    }

    public override onremove() {
        this._deactivate();
    }

    public _activate() {

        this._propsLabel.label!.setVisibility(false);
        this.setVisibility(false);

        this.renderer!.events.on("lclick", this._onLclick, this);
        this.renderer!.events.on("mousemove", this._onMouseMove, this);
        this.renderer!.events.on("ldblclick", this._onLdblclick, this);
        this.renderer!.events.on("lup", this._onLUp, this);

        this._cornersLayer.events.on("mouseenter", this._onCornerEnter, this);
        this._cornersLayer.events.on("mouseleave", this._onCornerLeave, this);
        this._cornersLayer.events.on("ldown", this._onCornerLdown, this);
        this._cornersLayer.events.on("lup", this._onCornerLup, this);

    }

    protected _deactivate() {
        this._startLonLat = null;
        this._preventClick = false;
        this._stopDrawing = false;
        this._pickedCorner = null;
        // this._trackLayer.remove();
        // this._cornersLayer.remove();

        this.renderer!.events.off("lclick", this._onLclick);
        this.renderer!.events.off("mousemove", this._onMouseMove);
        this.renderer!.events.off("lup", this._onLUp);

        this._cornersLayer.events.off("mouseenter", this._onCornerEnter);
        this._cornersLayer.events.off("mouseleave", this._onCornerLeave);
        this._cornersLayer.events.off("ldown", this._onCornerLdown);
        this._cornersLayer.events.off("lup", this._onCornerLup);

        this.clear();
    }

    protected _onCornerLdown = (e: IMouseState) => {
        if (!this._startLonLat) {
            this.renderer?.controls.mouseNavigation?.deactivate();
            this._startClick.set(e.x, e.y);
            let coords = e.pickingObject.getCartesian();
            this._startPos = this._planet!.getPixelFromCartesian(coords);
            this._pickedCorner = e.pickingObject;
            if (e.pickingObject.properties.name == "start") {
                this._anchorLonLat = this._cornerEntity[1].getLonLat().clone();
            } else {
                this._anchorLonLat = this._cornerEntity[0].getLonLat().clone();
            }
        }
    }

    protected _onLUp = () => {
        if (this._pickedCorner) {
            this.renderer!.controls.mouseNavigation?.activate();
            this._pickedCorner = null;
            this._anchorLonLat = null;
        }
    }

    protected _onCornerLup = () => {
        this._onLUp();
    }

    protected _onCornerEnter = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "pointer";
    }

    protected _onCornerLeave = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "default";
    }

    protected _onLdblclick = () => {
        this._preventClick = true;
    }

    public setVisibility(visibility: boolean) {
        this._cornersLayer.setVisibility(visibility);
        this._trackLayer.setVisibility(visibility);
        this._labelLayer.setVisibility(visibility);
    }

    protected _onLclick = (e: IMouseState) => {
        let startLonLat = this._planet!.getLonLatFromPixelTerrain(e.pos);
        if (!startLonLat) return;
        this._timeout = setTimeout(() => {
            if (!this._preventClick) {
                if (!this._startLonLat) {
                    this.setVisibility(true);
                    this._stopDrawing = false;
                    this._startLonLat = startLonLat!;
                } else {
                    this._startLonLat = null;
                }
            }
            this._preventClick = false;
            this._stopDrawing = false;
            clearTimeout(this._timeout);
        }, 200);

        if (this._startLonLat) {
            this._stopDrawing = true;
        }
    }

    protected _drawLine(startLonLat: LonLat, endLonLat: LonLat, startPos?: Vec3) {

        if (!startPos) {
            startPos = this._planet!.ellipsoid.lonLatToCartesian(startLonLat);
        }

        let endPos = this._planet!.ellipsoid.lonLatToCartesian(endLonLat);

        let res = this._planet!.ellipsoid.inverse(startLonLat, endLonLat);
        let length = res.distance;
        this._heading = res.initialAzimuth;

        let path = [];
        let dir = endPos.sub(startPos);
        let dist = dir.length();
        dir.normalize();

        for (let i = 0; i < OUTLINE_COUNT; i++) {
            let f = dir.scaleTo(i * dist / OUTLINE_COUNT).addA(startPos);
            path.push(f);
        }
        path.push(endPos);

        this._trackEntity.polyline!.setPath3v([path]);

        if (this._ignoreTerrain) {
            this._propsLabel.setCartesian3v(path[Math.floor(path.length / 2)]);
            this._propsLabel.label!.setText(`${distanceFormat(length)}, ${Math.round(this._heading)} deg`);
        }
    }

    protected _onMouseMove = (e: IMouseState) => {
        if (this._startLonLat && !this._stopDrawing) {
            this._propsLabel.label!.setVisibility(true);
            let endLonLat = this._planet!.getLonLatFromPixelTerrain(e.pos);
            if (!endLonLat) return;
            this._drawLine(this._startLonLat, endLonLat);
        } else if (this._pickedCorner) {
            let newLonLat = this._planet!.getLonLatFromPixelTerrain(e.pos);
            if (newLonLat) {
                if (this._pickedCorner.properties.name === "start") {
                    this._drawLine(newLonLat, this._anchorLonLat!);
                } else {
                    this._drawLine(this._anchorLonLat!, newLonLat);
                }
            }
        }
    }

    public clear() {
        this._trackEntity.remove();
        this._cornerEntity[0].remove();
        this._cornerEntity[1].remove();
        this._propsLabel.remove();
        this._planet!.removeLayer(this._trackLayer);
        this._planet!.removeLayer(this._cornersLayer);
    }

    public isCornersPositionChanged(): boolean {
        let t = this._trackEntity.polyline!.getPath3v()[0] as Vec3[];
        if (t) {
            const startPos = t[0].clone(),
                endPos = t[t.length - 1].clone();
            return this._cornerEntity[0].getCartesian().equal(startPos) &&
                this._cornerEntity[1].getCartesian().equal(endPos)
        }
        return false
    }

    public override frame() {
        let t = this._trackEntity.polyline!.getPath3v()[0] as Vec3[];
        if (t) {
            const startPos = t[0].clone(),
                endPos = t[t.length - 1].clone();

            if (!this.isCornersPositionChanged()) {
                this._cornerEntity[0].setCartesian3v(startPos);
                this._cornerEntity[1].setCartesian3v(endPos);
                if (!this._ignoreTerrain) {
                    let res = 0;
                    for (let i = 0, len = t.length - 1; i < len; i++) {
                        res += t[i + 1].distance(t[i]);
                    }
                    this._propsLabel.setCartesian3v(t[Math.floor(t.length / 2)]);
                    this._propsLabel.label!.setText(`${distanceFormat(res)}, ${Math.round(this._heading)} deg`);
                }
            }
        }
    }

    public get ellipsoid(): Ellipsoid | null {
        return this._planet ? this._planet.ellipsoid : null;
    }
}

const RULERSCENE_EVENTS: RulerSceneEventsList = [
    "add",
    "remove",
    "mousemove",
    "mouseenter",
    "mouseleave",
    "lclick",
    "rclick",
    "mclick",
    "ldblclick",
    "rdblclick",
    "mdblclick",
    "lup",
    "rup",
    "mup",
    "ldown",
    "rdown",
    "mdown",
    "lhold",
    "rhold",
    "mhold",
    "mousewheel",
    "touchmove",
    "touchstart",
    "touchend",
    "doubletouch",
    "touchleave",
    "touchenter"
];

export {RulerScene};
