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

let groundObj3d = Object3d.createCylinder(0.33, 0, 1.0, 20, 1, true, false, 0, 0, 0);
let headObj3d = Object3d.createCylinder(0.33, 0.33, 1.1, 20, 1, true, true, 0, -0.55, 0);

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
    object3d: groundObj3d
};

const HEAD_POINTER_OPTIONS = {
    instanced: true,
    tag: "head-pointer",
    color: "rgb(0,305,0)",
    object3d: headObj3d
};

class ElevationProfileScene extends RenderNode {

    public events: EventsHandler<ElevationProfileSceneEventsList>;

    protected _planet: Planet | null;
    protected _trackLayer: Vector;
    protected _groundPointersLayer: Vector;
    protected _columnPointersLayer: Vector;
    protected _headPointersLayer: Vector;
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

        this._headPointersLayer = new Vector("head-pointers", {
            entities: [],
            pickingEnabled: true,
            displayInLayerSwitcher: false,
            scaleByDistance: [1, 40000, 0.02],
            pickingScale: 2
        });

        this._columnPointersLayer = new Vector("column-pointers", {
            entities: [],
            pickingEnabled: false,
            displayInLayerSwitcher: false
        });

        this._trackEntity = new Entity({
            polyline: {
                path3v: [],
                thickness: 3.8,
                color: "rgba(0,305,0,0.8)",
                isClosed: false
            }
        });

        this._trackLayer = new Vector("column-pointers", {
            entities: [this._trackEntity],
            pickingEnabled: false,
            displayInLayerSwitcher: false
        });
    }

    protected _createPointer(groundCart: Vec3, altitude: number): { headEntity: Entity, groundEntity: Entity, columnEntity: Entity } {

        let surfaceNormal = this.ellipsoid!.getSurfaceNormal3v(groundCart);
        let headCart = groundCart.add(surfaceNormal.scale(altitude));

        let columnEntity = new Entity({
            ray: {
                startPosition: groundCart,
                endPosition: headCart,
                startColor: "rgba(255,255,255,0.2)",
                endColor: "rgba(355,355,355,1.0)",
                thickness: 3.2
            }
        });

        let groundEntity = new Entity({
            cartesian: groundCart,
            geoObject: GROUND_POINTER_OPTIONS,
        });

        let headEntity = new Entity({
            cartesian: headCart,
            geoObject: HEAD_POINTER_OPTIONS,
            properties: {}
        });

        const index = this._groundPointersLayer.getEntities().length;

        columnEntity.properties =
            groundEntity.properties =
                headEntity.properties = {
                    index,
                    headEntity,
                    groundEntity,
                    columnEntity
                };

        return {headEntity, groundEntity, columnEntity};
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
        this._planet!.addLayer(this._columnPointersLayer);
        this._planet!.addLayer(this._headPointersLayer);

        this.renderer!.events.on("lclick", this._onLClick);
        this.renderer!.events.on("mousemove", this._onMouseMove);
        this.renderer!.events.on("lup", this._onLUp);

        this._groundPointersLayer.events.on("mouseenter", this._onGroundPointerEnter);
        this._groundPointersLayer.events.on("mouseleave", this._onGroundPointerLeave);
        this._groundPointersLayer.events.on("ldown", this._onGroundPointerLDown);
        this._groundPointersLayer.events.on("lup", this._onGroundPointerLUp);

        this._headPointersLayer.events.on("mouseenter", this._onHeadPointerEnter);
        this._headPointersLayer.events.on("mouseleave", this._onHeadPointerLeave);
        this._headPointersLayer.events.on("ldown", this._onHeadPointerLDown);
        this._headPointersLayer.events.on("lup", this._onHeadPointerLUp);
    }

    public getPointsLonLat(): LonLat[] {
        let entities = this._headPointersLayer.getEntities();
        let points: LonLat[] = new Array(entities.length);
        for (let i = 0, len = points.length; i < len; i++) {
            let ei = entities[i];
            points[i] = ei.getLonLat();
        }
        return points;
    }

    public getHeightMSL(lonLat: LonLat) {
        if (this._planet && this._planet.terrain!.geoid) {
            return this._planet!.terrain!.geoid.getHeightLonLat(lonLat);
        }
        return 0;
    }

    public getHeightELLAsync(lonLat: LonLat): Promise<number> {
        return new Promise((resolve, reject) => {
            this._planet!.terrain!.getHeightAsync(lonLat, (hGnd: number) => {
                if (this._planet) {
                    let hMsl = this.getHeightMSL(lonLat);
                    resolve(hGnd + hMsl);
                } else {
                    reject();
                }
            });
        });
    }

    public addPoint3vAsync(groundPos: Vec3, altitude: number = 10, stopPropagation: boolean = false) {
        let {headEntity, groundEntity, columnEntity} = this._createPointer(groundPos, altitude);
        this._groundPointersLayer.add(groundEntity);
        this._columnPointersLayer.add(columnEntity);
        this._headPointersLayer.add(headEntity);
        this._trackEntity.polyline!.appendPoint3v(headEntity.getCartesian());

        let lonLat = this._planet!.ellipsoid.cartesianToLonLat(groundPos)!;

        this.getHeightELLAsync(lonLat).then((hEll: number) => {
            lonLat.height = hEll;
            let groundPos = this._planet!.ellipsoid.lonLatToCartesian(lonLat);
            let groundNormal = this._planet!.ellipsoid.getSurfaceNormal3v(groundPos);
            let headPos = groundPos.add(groundNormal.scale(altitude));
            headEntity.setCartesian3v(headPos);
            headEntity.properties.columnEntity.ray!.setEndPosition3v(headPos);
            this._trackEntity.polyline?.setPoint3v(headPos, headEntity.properties.index);
            if (!stopPropagation) {
                this.events.dispatch(this.events.addpoint, headEntity, this);
                this.events.dispatch(this.events.change, this);
            }
        });
    }

    protected _onLClick = (e: IMouseState) => {
        let groundPos = this._planet!.getCartesianFromPixelTerrain(e.pos);
        if (groundPos) {
            this.addPoint3vAsync(groundPos);
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

    protected _onHeadPointerEnter = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "pointer";
    }

    protected _onHeadPointerLeave = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "default";
    }

    protected _onHeadPointerLDown = (e: IMouseState) => {

    }

    protected _onHeadPointerLUp = (e: IMouseState) => {

    }

    protected _deactivate() {

        this.renderer!.events.off("lclick", this._onLClick);
        this.renderer!.events.off("mousemove", this._onMouseMove);
        this.renderer!.events.off("lup", this._onLUp);

        this._groundPointersLayer.events.off("mouseenter", this._onGroundPointerEnter);
        this._groundPointersLayer.events.off("mouseleave", this._onGroundPointerLeave);
        this._groundPointersLayer.events.off("ldown", this._onGroundPointerLDown);
        this._groundPointersLayer.events.off("lup", this._onGroundPointerLUp);

        this._headPointersLayer.events.off("mouseenter", this._onHeadPointerEnter);
        this._headPointersLayer.events.off("mouseleave", this._onHeadPointerLeave);
        this._headPointersLayer.events.off("ldown", this._onHeadPointerLDown);
        this._headPointersLayer.events.off("lup", this._onHeadPointerLUp);

        this._trackLayer.remove();
        this._groundPointersLayer.remove();
        this._headPointersLayer.remove();
        this._columnPointersLayer.remove();
        this._trackLayer.remove();

        this.clear();
    }


    public setVisibility(visibility: boolean) {
        this._groundPointersLayer.setVisibility(visibility);
        this._trackLayer.setVisibility(visibility);
        this._columnPointersLayer.setVisibility(visibility);
        this._headPointersLayer.setVisibility(visibility);
        this._trackLayer.setVisibility(visibility);
    }


    public clear() {
        this._headPointersLayer.setEntities([]);
        this._groundPointersLayer.setEntities([]);
        this._columnPointersLayer.setEntities([]);
        this._trackEntity.polyline!.setPath3v([]);
    }

    public override frame() {
        let __tempVec__ = new Vec3();
        const nodes = this._planet!._renderedNodes;
        const entities = this._groundPointersLayer.getEntities();
        for (let i = 0; i < entities.length; i++) {
            let ei = entities[i];
            for (let j = 0; j < nodes.length; j++) {
                let nj = nodes[j];
                if (nj.segment.isEntityInside(ei)) {
                    nj.segment.getEntityTerrainPoint(ei, __tempVec__);
                    ei.setCartesian3v(__tempVec__);
                    ei.properties.columnEntity.ray!.setStartPosition3v(__tempVec__);
                    break;
                }
            }
        }
    }

    public get ellipsoid(): Ellipsoid | null {
        return this._planet ? this._planet.ellipsoid : null;
    }
}

type ElevationProfileSceneEventsList = [
    "change", "addpoint"
];

const ELEVATIONPROFILESCENE_EVENTS: ElevationProfileSceneEventsList = [
    "change", "addpoint"
];

export {ElevationProfileScene};
