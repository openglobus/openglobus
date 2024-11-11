import {createEvents, EventCallback, EventsHandler} from '../../Events';
import {MAX32} from "../../math";
import {Planet} from "../../scene/Planet";
import {RenderNode} from '../../scene/RenderNode';
import {Vector} from '../../layer/Vector';
import {Vec2} from '../../math/Vec2';
import {Vec3} from '../../math/Vec3';
import {Quat} from '../../math/Quat';
import {IMouseState} from "../../renderer/RendererEvents";
import {Ellipsoid} from "../../ellipsoid/Ellipsoid";
import {LonLat} from "../../LonLat";
import {Entity} from "../../entity/Entity";
import {MoveAxisEntity} from "./MoveAxisEntity";
import {Ray} from "../../math/Ray";
import {Sphere} from "../../bv/Sphere";
import {Object3d} from "../../Object3d";

const planeObj = Object3d.createPlane(1, 1, -0.5, 0, 0.5);

export interface IGeoObjectEditorSceneParams {
    planet?: Planet;
    name?: string;
}

type GeoObjectSceneEventsList = [
    "move",
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
    "select",
    "unselect",
];

class GeoObjectEditorScene extends RenderNode {
    public events: EventsHandler<GeoObjectSceneEventsList>;
    protected _planet: Planet | null;
    protected _startPos: Vec2 | null;
    protected _startClick: Vec2;
    protected _moveLayer: Vector;
    protected _planeLayer: Vector;
    protected _rotateLayer: Vector;

    protected _selectedEntity: Entity | null;
    protected _selectedEntityCart: Vec3;
    protected _clickPos: Vec2;

    protected _axisEntity: MoveAxisEntity;
    protected _planeXZ: Entity;

    protected _selectedMove: string | null;

    protected _ops: Record<string, (mouseState: IMouseState) => void>;

    constructor(options: IGeoObjectEditorSceneParams = {}) {
        super(options.name || 'GeoObjectEditorScene');

        this.events = createEvents(GEOOBJECTEDITORCENE_EVENTS);

        this._planet = options.planet || null;

        this._startPos = null;
        this._startClick = new Vec2();

        this._axisEntity = new MoveAxisEntity();

        this._planeXZ = new Entity({
            independentPicking: true,
            geoObject: {
                color: "rgba(255,255,255,0.7)",
                scale: 0.02,
                instanced: true,
                tag: "plane",
                object3d: planeObj,
                yaw: 0,
                pitch: 0,
                roll: 0
            },
            properties: {opName: "move_xz"}
        });

        this._moveLayer = new Vector("move", {
            scaleByDistance: [1, MAX32, 1],
            useLighting: false,
            pickingScale: [5, 1.1, 5],
            visibility: false,
            depthOrder: 1000
        });

        this._planeLayer = new Vector("move-plane", {
            scaleByDistance: [1, MAX32, 1],
            useLighting: false,
            //pickingScale: [5, 1.1, 5],
            visibility: false,
            depthOrder: 1000
        });

        this._rotateLayer = new Vector("rotate", {
            scaleByDistance: [1, MAX32, 1],
            useLighting: false,
            pickingScale: [5, 1.1, 5],
            visibility: false
        });

        this._selectedEntity = null;
        this._clickPos = new Vec2();
        this._selectedEntityCart = new Vec3();
        this._selectedMove = null;

        this._ops = {
            move_x: this._moveX,
            move_y: this._moveY,
            move_z: this._moveZ,
            move_xz: this._moveXZ,
            move_xy: this._moveXY,
            move_zy: this._moveZY,
            rotate_pitch: this._rotatePitch,
            rotate_yaw: this._rotateYaw,
            rotate_roll: this._rotateRoll,
            scale: this._scale,
            scale_x: this._scaleX,
            scale_y: this._scaleY,
            scale_z: this._scaleZ,
        }
    }

    public bindPlanet(planet: Planet) {
        this._planet = planet;
        this._addAxisLayers();
    }

    public override init() {
        this.activate();
    }

    public override onremove() {
        this.deactivate();
    }

    protected _addAxisLayers() {
        if (this._planet) {
            this._moveLayer.addTo(this._planet);
            this._planeLayer.addTo(this._planet);
            this._rotateLayer.addTo(this._planet);

            this._moveLayer.add(this._axisEntity);
            this._moveLayer.events.on("mouseenter", this._onAxisLayerMouseEnter);
            this._moveLayer.events.on("mouseleave", this._onAxisLayerMouseLeave);
            this._moveLayer.events.on("lup", this._onAxisLayerLUp);
            this._moveLayer.events.on("ldown", this._onAxisLayerLDown);

            this._planeLayer.add(this._planeXZ);
            this._planeLayer.events.on("mouseenter", this._onPlaneLayerMouseEnter);
            this._planeLayer.events.on("mouseleave", this._onPlaneLayerMouseLeave);
            this._planeLayer.events.on("lup", this._onPlaneLayerLUp);
            this._planeLayer.events.on("ldown", this._onPlaneLayerLDown);
        }
    }

    protected _onAxisLayerMouseEnter = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "pointer";
    }

    protected _onAxisLayerMouseLeave = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "default";
    }

    protected _onAxisLayerLUp = (e: IMouseState) => {
        this._selectedMove = null;
        this._planet!.renderer!.controls.mouseNavigation.activate();
    }

    protected _onAxisLayerLDown = (e: IMouseState) => {
        this._clickPos = e.pos.clone();

        if (this._selectedEntity) {
            this._selectedEntityCart = this._selectedEntity.getCartesian().clone();
        }

        console.log(this._clickPos.x, this._clickPos.y);
        this._selectedMove = e.pickingObject.properties.opName;
        this._planet!.renderer!.controls.mouseNavigation.deactivate();
    }

    protected _onPlaneLayerMouseEnter = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "pointer";
    }

    protected _onPlaneLayerMouseLeave = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "default";
    }

    protected _onPlaneLayerLUp = (e: IMouseState) => {
        this._selectedMove = null;
        this._planet!.renderer!.controls.mouseNavigation.activate();
    }

    protected _onPlaneLayerLDown = (e: IMouseState) => {
        this._clickPos = e.pos.clone();

        if (this._selectedEntity) {
            this._selectedEntityCart = this._selectedEntity.getCartesian().clone();
        }

        console.log(this._clickPos.x, this._clickPos.y);
        this._selectedMove = e.pickingObject.properties.opName;
        this._planet!.renderer!.controls.mouseNavigation.deactivate();
    }

    protected _onMouseMove = (e: IMouseState) => {
        if (this._selectedEntity && this._selectedMove && this._ops[this._selectedMove]) {
            this._ops[this._selectedMove](e);
            this.events.dispatch(this.events.move, this._selectedEntity);
        }
    }

    protected _removeAxisLayers() {
        this._moveLayer.remove();
        this._planeLayer.remove();
        this._rotateLayer.remove()
    }

    public activate() {
        this.renderer!.events.on("lclick", this._onLclick);
        this.renderer!.events.on("mousemove", this._onMouseMove);
        this._addAxisLayers();
    }

    protected deactivate() {
        this.renderer!.events.off("lclick", this._onLclick);
        this.renderer!.events.off("mousemove", this._onMouseMove);
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
        this._planeXZ.setCartesian3v(cartesian);
    }

    public setAxisLonLat(lonLat: LonLat) {
        this._axisEntity.setLonLat(lonLat);
        this._planeXZ.setLonLat(lonLat);
    }

    public setVisibility(visibility: boolean) {
        this._moveLayer.setVisibility(visibility);
        this._planeLayer.setVisibility(visibility);
        this._rotateLayer.setVisibility(visibility);
    }

    public readyToEdit(entity: Entity): boolean {
        return true;
    }

    public select(entity: Entity) {
        if ((!this._selectedEntity || this._selectedEntity && !entity.isEqual(this._selectedEntity)) && this.readyToEdit(entity)) {
            if (this._selectedEntity) {
                this.unselect();
            }
            this._selectedEntity = entity;

            this.setVisibility(true);
            this.events.dispatch(this.events.select, this._selectedEntity);
        }
    }

    public unselect() {
        this.setVisibility(false);
        let selectedEntity = this._selectedEntity;
        this._selectedEntity = null;
        this.events.dispatch(this.events.unselect, selectedEntity);
    }

    protected _onLclick = (e: IMouseState) => {
        if (e.pickingObject && (e.pickingObject instanceof Entity)) {
            this.select(e.pickingObject);
        }
    }

    public clear() {
        this._planet!.removeLayer(this._moveLayer);
        this._planet!.removeLayer(this._planeLayer);
        this._planet!.removeLayer(this._rotateLayer);
    }

    public override frame() {
        if (this._selectedEntity) {
            this._axisEntity.setCartesian3v(this._selectedEntity.getCartesian());
            this._planeXZ.setCartesian3v(this._selectedEntity.getCartesian());
        }
    }

    public get ellipsoid(): Ellipsoid | null {
        return this._planet ? this._planet.ellipsoid : null;
    }

    protected _moveX = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        let clickCart = new Ray(cam.eye, clickDir).hitSphere(new Sphere(p0.length(), new Vec3()))!;
        let currCart = new Ray(cam.eye, e.direction).hitSphere(new Sphere(p0.length(), new Vec3()))!;

        let rot = Quat.getRotationBetweenVectors(
            clickCart.normal(),
            currCart.normal()
        );


        let px = rot.mulVec3(p0);

        let p0_lonLat = this._planet?.ellipsoid.cartesianToLonLat(p0)!;
        let px_lonLat = this._planet?.ellipsoid.cartesianToLonLat(px)!;

        this._planet?.ellipsoid.lonLatToCartesianRes(new LonLat(px_lonLat.lon, p0_lonLat.lat, p0_lonLat.height), px);

        this._selectedEntity.setCartesian3v(px);
    }

    protected _moveY = (e: IMouseState) => {

        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;
        //let groundNormal = this._planet!.ellipsoid.getSurfaceNormal3v(p0);
        let groundNormal = this._axisEntity.getY();
        let p1 = p0.add(groundNormal);
        let p2 = p0.add(cam.getRight());
        let px = new Vec3();

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        if (new Ray(cam.eye, clickDir).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {
            let clickCart = Vec3.proj_b_to_a(px, groundNormal);
            if (new Ray(cam.eye, e.direction).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {
                let dragCart = Vec3.proj_b_to_a(px, groundNormal);
                let dragVec = dragCart.sub(clickCart);
                let pos = this._selectedEntityCart.add(dragVec);
                this._selectedEntity.setCartesian3v(pos);
            }
        }
    }

    protected _moveZ = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        let clickCart = new Ray(cam.eye, clickDir).hitSphere(new Sphere(p0.length(), new Vec3()))!;
        let currCart = new Ray(cam.eye, e.direction).hitSphere(new Sphere(p0.length(), new Vec3()))!;

        let rot = Quat.getRotationBetweenVectors(
            clickCart.normal(),
            currCart.normal()
        );

        let px = rot.mulVec3(p0);

        let p0_lonLat = this._planet?.ellipsoid.cartesianToLonLat(p0)!;
        let px_lonLat = this._planet?.ellipsoid.cartesianToLonLat(px)!;

        this._planet?.ellipsoid.lonLatToCartesianRes(new LonLat(p0_lonLat.lon, px_lonLat.lat, p0_lonLat.height), px);

        this._selectedEntity.setCartesian3v(px);
    }

    protected _moveXZ = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        let clickCart = new Ray(cam.eye, clickDir).hitSphere(new Sphere(p0.length(), new Vec3()))!;
        let currCart = new Ray(cam.eye, e.direction).hitSphere(new Sphere(p0.length(), new Vec3()))!;

        let rot = Quat.getRotationBetweenVectors(
            clickCart.normal(),
            currCart.normal()
        );

        let px = rot.mulVec3(p0);

        this._selectedEntity.setCartesian3v(px);
    }

    protected _moveXY = (e: IMouseState) => {
        console.log("moveXY");
    }

    protected _moveZY = (e: IMouseState) => {
        console.log("moveZY");
    }

    protected _rotatePitch = (e: IMouseState) => {
    }

    protected _rotateYaw = (e: IMouseState) => {
    }

    protected _rotateRoll = (e: IMouseState) => {
    }

    protected _scale = (e: IMouseState) => {
    }

    protected _scaleX = (e: IMouseState) => {
    }

    protected _scaleY = (e: IMouseState) => {
    }

    protected _scaleZ = (e: IMouseState) => {
    }
}

const GEOOBJECTEDITORCENE_EVENTS: GeoObjectSceneEventsList = [
    "move",
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
    "select",
    "unselect"
];

export {GeoObjectEditorScene};
