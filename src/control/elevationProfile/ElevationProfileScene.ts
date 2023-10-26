import {Entity} from '../../entity/Entity';
import {createEvents, EventsHandler} from '../../Events';
import {LonLat} from "../../LonLat";
import {Extent} from "../../Extent";
import {Object3d} from '../../Object3d';
import {Planet} from "../../scene/Planet";
import {RenderNode} from '../../scene/RenderNode';
import {Vector} from '../../layer/Vector';
import {Vec2} from '../../math/Vec2';
import {Vec3} from '../../math/Vec3';
import {IMouseState} from "../../renderer/RendererEvents";
import {Ellipsoid} from "../../ellipsoid/Ellipsoid";
import {ILabelParams} from "../../entity/Label";
import {IRayParams} from "../../entity/Ray";
import {IBillboardParams} from "../../entity/Billboard";
import {Ray} from "../../math/Ray";

export interface IElevationProfileSceneParams {
    name?: string;
    planet?: Planet;
}

let groundObj3d = Object3d.createCylinder(0.33, 0, 1.0, 20, 1, true, false, 0, 0, 0);
let headObj3d = Object3d.createCylinder(0.33, 0.33, 1.1, 20, 1, true, true, 0, -0.55, 0);

const POINTER_RAY_OPTIONS: IRayParams = {
    startPosition: new Vec3(),
    endPosition: new Vec3(),
    startColor: "rgba(214,144,90,0.2)",
    endColor: "rgba(214,144,90,1.0)",
    thickness: 2.7
}

const POINTER_BILLBOARD_OPTIONS: IBillboardParams = {
    src: "data:image/png;base64,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",
    color: "#EAA46E",
    size: [8, 8]
}

const POINTER_LABEL_OPTIONS: ILabelParams = {
    text: "",
    size: 10.5,
    color: "rgba(455,455,455,1.0)",
    outlineColor: "rgba(0,0,0,0.34)",
    outline: 0.23,
    align: "left",
    offset: [5, 15, -5]
};

const LABEL_OPTIONS: ILabelParams = {
    text: "",
    size: 10.5,
    color: "rgba(455,455,455,1.0)",
    outlineColor: "rgba(0,0,0,0.34)",
    outline: 0.23,
    align: "right",
    offset: [-47, 25, 0]
};

const GROUND_POINTER_OPTIONS = {
    instanced: true,
    tag: "ground-pointer",
    color: "rgb(0,305,0)",
    object3d: groundObj3d
};

const HEAD_POINTER_OPTIONS = {
    instanced: true,
    tag: "head-pointer",
    color: "rgb(305,305,0)",
    object3d: headObj3d
};

class ElevationProfileScene extends RenderNode {

    public events: EventsHandler<ElevationProfileSceneEventsList>;

    protected _planet: Planet | null;
    protected _trackLayer: Vector;
    protected _groundPointersLayer: Vector;
    protected _columnPointersLayer: Vector;
    protected _headPointersLayer: Vector;
    protected _heightsLayer: Vector;
    protected _trackEntity: Entity;
    protected _pickedGroundEntity: Entity | null;
    protected _pickedHeadEntity: Entity | null;


    protected _pointerLayer: Vector;
    protected _pointerHeadEntity: Entity;
    protected _pointerLabelEntity: Entity;
    protected _pointerRayEntity: Entity;

    protected _startClickPos: Vec2;
    protected _startEntityPos: Vec2;

    protected _clampToGround: boolean;

    constructor(options: IElevationProfileSceneParams = {}) {
        super("ElevationProfileScene");

        this.events = createEvents(ELEVATIONPROFILESCENE_EVENTS);

        this._planet = options.planet || null;

        this._pickedGroundEntity = null;
        this._pickedHeadEntity = null;
        this._startClickPos = new Vec2();
        this._startEntityPos = new Vec2();
        this._clampToGround = true;

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
            scaleByDistance: [1, 5000, 0.02],
            pickingScale: 1.5
        });

        this._headPointersLayer = new Vector("head-pointers", {
            entities: [],
            pickingEnabled: true,
            displayInLayerSwitcher: false,
            scaleByDistance: [1, 10000, 0.02],
            pickingScale: 1
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

        this._heightsLayer = new Vector("heights-labels", {
            entities: [],
            pickingEnabled: false,
            displayInLayerSwitcher: false
        });

        this._pointerHeadEntity = new Entity({
            cartesian: new Vec3(),
            billboard: POINTER_BILLBOARD_OPTIONS
        });

        this._pointerLabelEntity = new Entity({
            cartesian: new Vec3(),
            label: POINTER_LABEL_OPTIONS
        });

        this._pointerRayEntity = new Entity({
            cartesian: new Vec3(),
            ray: POINTER_RAY_OPTIONS
        });

        this._pointerLayer = new Vector("pointer", {
            entities: [this._pointerHeadEntity, this._pointerLabelEntity, this._pointerRayEntity],
            pickingEnabled: false,
            displayInLayerSwitcher: false
        });
    }

    public flyExtent() {
        let entities = this._headPointersLayer.getEntities();
        let minLon = 180, minLat = 180, maxLon = -180, maxLat = -180, maxHeight = -1000000;
        if (entities.length > 1) {
            for (let i = 0; i < entities.length; i++) {
                let ll = entities[i].getLonLat();
                if (ll.lon < minLon) minLon = ll.lon;
                if (ll.lat < minLat) minLat = ll.lat;
                if (ll.lon > maxLon) maxLon = ll.lon;
                if (ll.lat > maxLat) maxLat = ll.lat;
                if (ll.height > maxHeight) maxHeight = ll.height;
            }

            this._planet!.camera.flyExtent(new Extent(new LonLat(minLon, minLat), new LonLat(maxLon, maxLat)), maxHeight, null, 0);
        }
    }

    public get planet(): Planet | null {
        return this._planet;
    }

    protected _createGroundPointer(groundCart: Vec3, altitude: number = 10): { headEntity: Entity, groundEntity: Entity, columnEntity: Entity, heightLabelEntity: Entity } {

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

        let heightLabelEntity = new Entity({
            cartesian: headCart,
            label: LABEL_OPTIONS
        });

        heightLabelEntity.appendChild(new Entity({
                cartesian: headCart,
                label: {...LABEL_OPTIONS, offset: [-47, 45, 0]}
            })
        );

        const index = this._groundPointersLayer.getEntities().length;

        columnEntity.properties =
            groundEntity.properties =
                headEntity.properties = {
                    index,
                    altitude: altitude,
                    lonLatEll: new LonLat(),
                    headEntity,
                    groundEntity,
                    columnEntity,
                    heightLabelEntity
                };

        return {headEntity, groundEntity, columnEntity, heightLabelEntity};
    }

    public setPointerCartesian3v(p: Vec3, height: number) {
        this._pointerLabelEntity.setCartesian3v(p);
        this._pointerLabelEntity.label!.setText(Math.round(height).toString());

        this._pointerRayEntity.ray!.setEndPosition3v(p);
        let n = this._planet!.ellipsoid.getSurfaceNormal3v(p);
        this._pointerRayEntity.ray!.setStartPosition3v(p.add(n.scale(-height)));

        this._pointerHeadEntity.setCartesian3v(p);
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
        this._planet!.addLayer(this._heightsLayer);
        this._planet!.addLayer(this._pointerLayer);

        this.renderer!.events.on("ldblclick", this._onLClick);
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

    public getPointLonLat(index: number): LonLat | undefined {
        let entity = this._headPointersLayer.getEntities()[index];
        if (entity) {
            return entity.getLonLat();
        }
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

    public addPointLonLatArrayAsync(lonLatArr: LonLat[], stopPropagation: boolean = false): Promise<Entity>[] {

        if (!this._planet) {
            throw new Error("Planet is not defined");
        }

        let ell = this._planet.ellipsoid;

        for (let i = 0, len = lonLatArr.length - 1; i < len; i++) {
            let p0 = ell.lonLatToCartesian(lonLatArr[i]),
                p1 = ell.lonLatToCartesian(lonLatArr[i + 1]);
            if (p0.distance(p1) > 20000) {
                throw new Error("Track is too long! 20 km is maximum.");
            }
        }

        let res = new Array(lonLatArr.length);

        for (let i = 0, len = lonLatArr.length; i < len; i++) {
            res[i] = this.addPointLonLatAsync(lonLatArr[i], true);
        }

        Promise.all(res).then(() => {
            if (!stopPropagation) {
                this.events.dispatch(this.events.change, this);
            }
        });

        return res;
    }

    public addPointLonLatAsync(lonLat: LonLat, stopPropagation: boolean = false): Promise<Entity> {

        let headPos = this._planet!.ellipsoid.lonLatToCartesian(lonLat);
        let n = this._planet!.ellipsoid.getSurfaceNormal3v(headPos);

        let ellLonLat = new LonLat(lonLat.lon, lonLat.lat);
        let ellPos = this._planet!.ellipsoid.lonLatToCartesian(ellLonLat);

        let {headEntity, groundEntity, columnEntity, heightLabelEntity} = this._createGroundPointer(ellPos);

        this._groundPointersLayer.add(groundEntity);
        this._columnPointersLayer.add(columnEntity);
        this._headPointersLayer.add(headEntity);
        this._heightsLayer.add(heightLabelEntity);
        this._trackEntity.polyline!.appendPoint3v(headEntity.getCartesian());

        groundEntity.properties.lonLatEll.lon = ellLonLat.lon;
        groundEntity.properties.lonLatEll.lat = ellLonLat.lat;
        groundEntity.properties.lonLatEll.height = ellLonLat.height;

        return new Promise((resolve) => {
            this.getHeightELLAsync(lonLat).then((hEll: number) => {

                groundEntity.properties.lonLatEll.height = hEll;

                let altitude = 10,
                    groundPos: Vec3;

                if (lonLat.height === 0) {
                    groundPos = headPos.add(n.scaleTo(hEll));
                    headPos = groundPos.add(n.scaleTo(altitude));
                } else {
                    altitude = lonLat.height - hEll;
                    groundPos = headPos.sub(n.scaleTo(altitude));
                }

                groundEntity.setCartesian3v(groundPos);
                heightLabelEntity.setCartesian3v(headPos);
                heightLabelEntity.label!.setText(`${hEll.toFixed(1)} m`);
                heightLabelEntity.childrenNodes[0].label!.setText(`${altitude.toFixed(1)} m`);
                headEntity.properties.altitude = altitude;
                headEntity.setCartesian3v(headPos);
                headEntity.properties.columnEntity.ray!.setStartPosition3v(groundPos);
                headEntity.properties.columnEntity.ray!.setEndPosition3v(headPos);
                this._trackEntity.polyline?.setPoint3v(headPos, headEntity.properties.index);

                if (!stopPropagation) {
                    this.events.dispatch(this.events.addpoint, headEntity, this);
                    this.events.dispatch(this.events.change, this);
                }

                resolve(headEntity);
            });
        });
    }

    public addGroundPointLonLatAsync(lonLat: LonLat, altitude: number = 10, stopPropagation: boolean = false): Promise<Entity> {
        let groundPos = this._planet!.ellipsoid.lonLatToCartesian(lonLat)!;
        return this._addPoint(groundPos, lonLat, altitude, stopPropagation);
    }

    public addGroundPoint3vAsync(groundPos: Vec3, altitude: number = 10, stopPropagation: boolean = false): Promise<Entity> {
        let lonLat = this._planet!.ellipsoid.cartesianToLonLat(groundPos)!;
        return this._addPoint(groundPos, lonLat, altitude, stopPropagation);
    }

    protected _addPoint(groundPos: Vec3, lonLat: LonLat, altitude: number, stopPropagation: boolean = false): Promise<Entity> {
        return new Promise((resolve, reject) => {
            let {
                headEntity,
                groundEntity,
                columnEntity,
                heightLabelEntity
            } = this._createGroundPointer(groundPos, altitude);
            this._groundPointersLayer.add(groundEntity);
            this._columnPointersLayer.add(columnEntity);
            this._headPointersLayer.add(headEntity);
            this._heightsLayer.add(heightLabelEntity);
            this._trackEntity.polyline!.appendPoint3v(headEntity.getCartesian());

            groundEntity.properties.lonLatEll.lon = lonLat.lon;
            groundEntity.properties.lonLatEll.lat = lonLat.lat;
            groundEntity.properties.lonLatEll.height = lonLat.height;

            this.getHeightELLAsync(lonLat).then((hEll: number) => {
                groundEntity.properties.lonLatEll.height = lonLat.height = hEll;
                let groundPos = this._planet!.ellipsoid.lonLatToCartesian(lonLat);
                let groundNormal = this._planet!.ellipsoid.getSurfaceNormal3v(groundPos);
                let headPos = groundPos.add(groundNormal.scale(altitude));
                heightLabelEntity.setCartesian3v(headPos);
                heightLabelEntity.label!.setText(`${hEll.toFixed(1)} m`);
                heightLabelEntity.childrenNodes[0].label!.setText(`${altitude.toFixed(1)} m`);
                headEntity.setCartesian3v(headPos);
                headEntity.properties.columnEntity.ray!.setEndPosition3v(headPos);
                this._trackEntity.polyline?.setPoint3v(headPos, headEntity.properties.index);
                if (!stopPropagation) {
                    this.events.dispatch(this.events.addpoint, headEntity, this);
                    this.events.dispatch(this.events.change, this);
                }
                resolve(headEntity);
            });
        });
    }

    protected _onLClick = (e: IMouseState) => {
        let groundPos = this._planet!.getCartesianFromPixelTerrain(e.pos);
        if (groundPos) {
            this.addGroundPoint3vAsync(groundPos);
        }
    }

    protected _onMouseMove = (e: IMouseState) => {
        let mouseCart = this._planet!.getCartesianFromMouseTerrain();
        if (this._pickedGroundEntity) {
            let d = new Vec2(e.x, e.y).sub(this._startClickPos),
                p = this._startEntityPos.add(d);
            let groundCart = this._planet!.getCartesianFromPixelTerrain(p);
            if (groundCart) {
                this.setGroundPointCartesian3v(this._pickedGroundEntity!.properties.index, groundCart);
            }
        } else if (this._pickedHeadEntity) {

            let cam = this._planet!.camera;
            let p0 = this._pickedHeadEntity.properties.groundEntity.getCartesian();
            let groundNormal = this._planet!.ellipsoid.getSurfaceNormal3v(p0);
            let p1 = p0.add(groundNormal);
            let p2 = p0.add(cam.getRight());
            let px = new Vec3();

            if (new Ray(cam.eye, e.direction).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {
                let h = Vec3.proj_b_to_a(px, p0);
                let s = h.sub(p0).dot(p0);
                let headPos = p0.add(groundNormal.scale(Math.sign(s) * h.distance(p0)));
                this.setHeadPointCartesian3v(this._pickedHeadEntity.properties.index, headPos);
            }
        }
    }

    public setHeadPointCartesian3v(entityIndex: number, headPos: Vec3) {

        const headEntity = this._headPointersLayer.getEntities()[entityIndex];

        if (headEntity) {
            let groundPos = this._planet!.ellipsoid.lonLatToCartesian(headEntity.properties.lonLatEll);
            let altitude = headPos.length() - groundPos.length();

            if (altitude <= 0) {
                headPos = groundPos;
                altitude = 0;
            }

            headEntity.properties.altitude = altitude;
            headEntity.setCartesian3v(headPos);
            headEntity.properties.columnEntity.ray!.setEndPosition3v(headPos);
            headEntity.properties.heightLabelEntity.setCartesian3v(headPos);
            headEntity.properties.heightLabelEntity.childrenNodes[0].label!.setText(`${altitude.toFixed(1)} m`);

            this._trackEntity.polyline!.setPoint3v(headPos, entityIndex);

            this.events.dispatch(this.events.change, this._pickedHeadEntity);
        }
    }

    public setGroundPointCartesian3v(entityIndex: number, groundPos: Vec3) {

        let groundEntity = this._groundPointersLayer.getEntities()[entityIndex];

        if (groundEntity) {

            let lonLat = this._planet!.ellipsoid.cartesianToLonLat(groundPos);

            groundEntity.properties.lonLatEll.lon = lonLat.lon;
            groundEntity.properties.lonLatEll.lat = lonLat.lat;
            groundEntity.properties.lonLatEll.height = lonLat.height;

            let groundNormal = this._planet!.ellipsoid.getSurfaceNormal3v(groundPos);
            let headEntity = groundEntity.properties.headEntity;
            let heightLabelEntity = groundEntity.properties.heightLabelEntity;
            let altitude = groundEntity.properties.altitude;

            groundEntity.setCartesian3v(groundPos);

            let headPos = groundPos.add(groundNormal.scale(altitude));
            headEntity.setCartesian3v(headPos);
            headEntity.properties.columnEntity.ray!.setStartPosition3v(groundPos);
            headEntity.properties.columnEntity.ray!.setEndPosition3v(headPos);
            this._trackEntity.polyline?.setPoint3v(headPos, headEntity.properties.index);

            heightLabelEntity.setCartesian3v(headPos);
            heightLabelEntity.label!.setText(`${lonLat.height.toFixed(1)} m`);
            heightLabelEntity.childrenNodes[0].label!.setText(`${altitude.toFixed(1)} m`);

            this.events.dispatch(this.events.change, groundEntity.properties.headEntity);
        }
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
        this._clampToGround = false;
        this.renderer!.controls.mouseNavigation.deactivate();
        this._pickedGroundEntity = e.pickingObject;
        const coords = this._pickedGroundEntity!.getCartesian();
        this._startClickPos.set(e.x, e.y);
        this._startEntityPos = this._planet!.getPixelFromCartesian(coords);
    }

    protected _onGroundPointerLUp = (e: IMouseState) => {
        this._clampToGround = true;
        this.renderer!.controls.mouseNavigation.activate();
        this._pickedGroundEntity = null;
    }

    protected _onHeadPointerEnter = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "pointer";
    }

    protected _onHeadPointerLeave = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "default";
    }

    protected _onHeadPointerLDown = (e: IMouseState) => {
        this.renderer!.controls.mouseNavigation.deactivate();
        this._pickedHeadEntity = e.pickingObject;
    }

    protected _onHeadPointerLUp = (e: IMouseState) => {
        this.renderer!.controls.mouseNavigation.activate();
        this._pickedHeadEntity = null;
    }

    protected _deactivate() {

        this.renderer!.events.off("ldblclick", this._onLClick);
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
        this._heightsLayer.remove();
        this._pointerLayer.remove();

        this.clear();
    }


    public setVisibility(visibility: boolean) {
        this._groundPointersLayer.setVisibility(visibility);
        this._trackLayer.setVisibility(visibility);
        this._columnPointersLayer.setVisibility(visibility);
        this._headPointersLayer.setVisibility(visibility);
        this._trackLayer.setVisibility(visibility);
        this._heightsLayer.setVisibility(visibility);
        this._pointerLayer.setVisibility(visibility);
    }


    public clear() {
        this._headPointersLayer.setEntities([]);
        this._groundPointersLayer.setEntities([]);
        this._columnPointersLayer.setEntities([]);
        this._heightsLayer.setEntities([]);
        this._trackEntity.polyline!.setPath3v([]);
    }

    public override frame() {
        if (this._clampToGround) {
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
