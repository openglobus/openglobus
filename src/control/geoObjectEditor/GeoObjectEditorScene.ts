import {createEvents, EventCallback, EventsHandler} from '../../Events';
import {MAX32} from "../../math";
import {Planet} from "../../scene/Planet";
import {RenderNode} from '../../scene/RenderNode';
import {Vector} from '../../layer/Vector';
import {Vec2} from '../../math/Vec2';
import {Vec3} from '../../math/Vec3';
import {IMouseState} from "../../renderer/RendererEvents";
import {Ellipsoid} from "../../ellipsoid/Ellipsoid";
import {LonLat} from "../../LonLat";
import {Entity} from "../../entity/Entity";
import {AxisEntity} from "./AxisEntity";

export interface IGeoObjectEditorSceneParams {
    planet?: Planet;
    name?: string;
}

type GeoObjectSceneEventsList = [
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
    "touchenter",
    "startedit",
    "stopedit",
];

class GeoObjectEditorScene extends RenderNode {
    public events: EventsHandler<GeoObjectSceneEventsList>;
    protected _planet: Planet | null;
    protected _startPos: Vec2 | null;
    protected _startClick: Vec2;
    protected _axisLayer: Vector;
    protected _rotLayer: Vector;

    protected _selectedEntity: Entity | null;

    protected _axisEntity: AxisEntity;

    constructor(options: IGeoObjectEditorSceneParams = {}) {
        super(options.name || 'GeoObjectEditorScene');

        this.events = createEvents(GEOOBJECTEDITORCENE_EVENTS);

        this._planet = options.planet || null;

        this._startPos = null;
        this._startClick = new Vec2();

        this._axisEntity = new AxisEntity();

        this._axisLayer = new Vector("axis", {
            scaleByDistance: [1, MAX32, 1],
            useLighting: false,
            pickingScale: [5, 1.1, 5],
            visibility: false
        });

        this._rotLayer = new Vector("rotation", {
            scaleByDistance: [1, MAX32, 1],
            useLighting: false,
            pickingScale: [5, 1.1, 5],
            visibility: false
        });

        this._selectedEntity = null;
    }

    public bindPlanet(planet: Planet) {
        this._planet = planet;
        this._addAxisLayers();
    }

    public override init() {
        this._activate();
    }

    public override onremove() {
        this._deactivate();
    }

    protected _addAxisLayers() {
        if (this._planet) {
            this._axisLayer.addTo(this._planet);
            this._rotLayer.addTo(this._planet);

            this._axisLayer.add(this._axisEntity);
        }
    }

    protected _removeAxisLayers() {
        this._axisLayer.remove();
        this._rotLayer.remove()
    }

    public _activate() {
        this.renderer!.events.on("lclick", this._onLclick, this);
        this._addAxisLayers();
    }

    protected _deactivate() {
        this.renderer!.events.off("lclick", this._onLclick);
        this._removeAxisLayers();
        this.clear();
    }

    // protected _onCornerLdown = (e: IMouseState) => {
    //         this.renderer?.controls.mouseNavigation?.deactivate();
    //         this._startClick.set(e.x, e.y);
    //         let coords = e.pickingObject.getCartesian();
    //         this._startPos = this._planet!.getPixelFromCartesian(coords);
    // }

    // protected _onLUp = () => {
    //     this.renderer!.controls.mouseNavigation?.activate();
    // }

    // protected _onGeoObjectEnter = (e: IMouseState) => {
    //     e.renderer.handler.canvas!.style.cursor = "pointer";
    // }
    //
    // protected _onGeoObjectLeave = (e: IMouseState) => {
    //     e.renderer.handler.canvas!.style.cursor = "default";
    // }

    public setAxisCartesian3v(cartesian: Vec3) {
        this._axisEntity.setCartesian3v(cartesian);
    }

    public setAxisLonLat(lonLat: LonLat) {
        this._axisEntity.setLonLat(lonLat);
    }

    public setVisibility(visibility: boolean) {
        this._axisLayer.setVisibility(visibility);
        this._rotLayer.setVisibility(visibility);
    }

    public readyToEdit(entity: Entity): boolean {
        return true;
    }

    public startEditing(entity: Entity) {
        if (this._selectedEntity && !entity.isEqual(this._selectedEntity) && this.readyToEdit(entity)) {
            this._selectedEntity = entity;
            this.setVisibility(true);
            this.events.dispatch(this.events.startedit, this._selectedEntity);
        }
    }

    public stopEditing() {
        this.setVisibility(false);
        let selectedEntity = this._selectedEntity;
        this._selectedEntity = null;
        this.events.dispatch(this.events.stopedit, selectedEntity);
    }

    protected _onLclick = (e: IMouseState) => {
        if (e.pickingObject && (e.pickingObject instanceof Entity)) {
            this.startEditing(e.pickingObject);
        }
    }

    public clear() {
        this._planet!.removeLayer(this._axisLayer);
        this._planet!.removeLayer(this._rotLayer);
    }

    public override frame() {
        if (this._selectedEntity) {
            this._axisEntity.setCartesian3v(this._selectedEntity.getCartesian());
        }
    }

    public get ellipsoid(): Ellipsoid | null {
        return this._planet ? this._planet.ellipsoid : null;
    }
}

const GEOOBJECTEDITORCENE_EVENTS: GeoObjectSceneEventsList = [
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
    "touchenter",
    "startedit",
    "stopedit"
];

export {GeoObjectEditorScene};
