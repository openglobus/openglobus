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

export interface IElevationProfileSceneParams {
    name?: string;
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

let obj3d = Object3d.createCylinder(0.4, 0, 1.0, 20, 1, true, false, 0, 0, 0);

// const LABEL_OPTIONS: ILabelParams = {
//     text: "",
//     size: 11,
//     color: "rgba(455,455,455,1.0)",
//     outlineColor: "rgba(0,0,0,0.34)",
//     outline: 0.23,
//     align: "center",
//     offset: [0, 20, 0]
// };

const GROUND_POINTER_OPTIONS = {
    instanced: true,
    tag: "ground-pointer",
    color: "rgb(0,305,0)",
    object3d: obj3d
};

class ElevationProfileScene extends RenderNode {

    public events: EventsHandler<ElevationProfileSceneEventsList>;

    protected _planet: Planet | null;
    protected _trackLayer: Vector;
    protected _groundPointersLayer: Vector;
    protected _trackEntity: Entity;

    constructor(options: IElevationProfileSceneParams = {}) {
        super("ElevationProfileScene");

        this.events = createEvents(ELEVATIONPROFILESCENE_EVENTS);

        this._planet = options.planet || null;

        this._trackLayer = new Vector("track", {
            entities: [],
            pickingEnabled: false,
            polygonOffsetUnits: -1.0,
            relativeToGround: true,
            displayInLayerSwitcher: false
        });

        this._groundPointersLayer = new Vector("ground-pointers", {
            entities: [],
            pickingEnabled: true,
            displayInLayerSwitcher: false,
            scaleByDistance: [1, 40000, 0.02],
            pickingScale: 2
        });

        this._trackEntity = new Entity({
            polyline: {
                path3v: [],
                thickness: 4.8,
                color: "rgb(255,131,0)",
                isClosed: false
            }
        });
    }

    protected _createGroundPointerEntity(cart: Vec3): Entity {
        return new Entity({
            cartesian: cart,
            geoObject: GROUND_POINTER_OPTIONS,
            properties: {}
        })
    }

    public bindPlanet(planet: Planet) {
        this._planet = planet;
    }

    public override init() {
        this._activate();
    }

    public override onremove() {
        this._deactivate();
    }

    public _activate() {

        this._planet!.addLayer(this._trackLayer);
        this._planet!.addLayer(this._groundPointersLayer);

        this.renderer!.events.on("lclick", this._onLClick);
        this.renderer!.events.on("mousemove", this._onMouseMove);
        this.renderer!.events.on("lup", this._onLUp);

        this._groundPointersLayer.events.on("mouseenter", this._onGroundPointerEnter);
        this._groundPointersLayer.events.on("mouseleave", this._onGroundPointerLeave);
        this._groundPointersLayer.events.on("ldown", this._onGroundPointerLDown);
        this._groundPointersLayer.events.on("lup", this._onGroundPointerLUp);
    }

    protected _onLClick = (e: IMouseState) => {
        let groundPos = this._planet!.getCartesianFromPixelTerrain(e.pos);
        if (groundPos) {
            let groundEntity = this._createGroundPointerEntity(groundPos);
            this._groundPointersLayer.add(groundEntity);
        }
    }

    protected _onMouseMove = (e: IMouseState) => {

    }

    protected _onLUp = (e: IMouseState) => {

    }

    protected _onGroundPointerEnter = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "pointer";
    }

    protected _onGroundPointerLeave = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "default";
    }

    protected _onGroundPointerLDown = (e: IMouseState) => {

    }

    protected _onGroundPointerLUp = (e: IMouseState) => {

    }

    protected _deactivate() {

        this.renderer!.events.off("lclick", this._onLClick);
        this.renderer!.events.off("mousemove", this._onMouseMove);
        this.renderer!.events.off("lup", this._onLUp);

        this._groundPointersLayer.events.off("mouseenter", this._onGroundPointerEnter);
        this._groundPointersLayer.events.off("mouseleave", this._onGroundPointerLeave);
        this._groundPointersLayer.events.off("ldown", this._onGroundPointerLDown);
        this._groundPointersLayer.events.off("lup", this._onGroundPointerLUp);

        this._trackLayer.remove();
        this._groundPointersLayer.remove();

        this.clear();
    }


    public setVisibility(visibility: boolean) {
        this._groundPointersLayer.setVisibility(visibility);
        this._trackLayer.setVisibility(visibility);
    }


    public clear() {
        this._groundPointersLayer.setEntities([]);
        this._trackEntity.polyline!.setPath3v([]);
    }

    public override frame() {
    }

    public get ellipsoid(): Ellipsoid | null {
        return this._planet ? this._planet.ellipsoid : null;
    }
}

type ElevationProfileSceneEventsList = [
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

const ELEVATIONPROFILESCENE_EVENTS: ElevationProfileSceneEventsList = [
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

export {ElevationProfileScene};
