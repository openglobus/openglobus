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
import {MoveAxisEntity} from "./MoveAxisEntity";
import {Ray} from "../../math/Ray";

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
    protected _rotateLayer: Vector;

    protected _selectedEntity: Entity | null;
    protected _selectedEntityCart: Vec3;
    protected _selectedEntityLonLat: LonLat;
    protected _clickPos: Vec2;

    protected _axisEntity: MoveAxisEntity;

    protected _selectedMove: string | null;

    protected _ops: Record<string, (mouseState: IMouseState) => void>;

    constructor(options: IGeoObjectEditorSceneParams = {}) {
        super(options.name || 'GeoObjectEditorScene');

        this.events = createEvents(GEOOBJECTEDITORCENE_EVENTS);

        this._planet = options.planet || null;

        this._startPos = null;
        this._startClick = new Vec2();

        this._axisEntity = new MoveAxisEntity();

        this._moveLayer = new Vector("move", {
            scaleByDistance: [1, MAX32, 1],
            useLighting: false,
            pickingScale: [5, 1.1, 5],
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
            this._rotateLayer.addTo(this._planet);

            this._moveLayer.add(this._axisEntity);

            this._moveLayer.events.on("mouseenter", this._onAxisLayerMouseEnter);
            this._moveLayer.events.on("mouseleave", this._onAxisLayerMouseLeave);
            this._moveLayer.events.on("lup", this._onAxisLayerLUp);
            this._moveLayer.events.on("ldown", this._onAxisLayerLDown);
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
            this._selectedEntityLonLat = this._selectedEntity.getLonLat().clone();
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
    }

    public setAxisLonLat(lonLat: LonLat) {
        this._axisEntity.setLonLat(lonLat);
    }

    public setVisibility(visibility: boolean) {
        this._moveLayer.setVisibility(visibility);
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
        this._planet!.removeLayer(this._rotateLayer);
    }

    public override frame() {
        if (this._selectedEntity) {
            this._axisEntity.setCartesian3v(this._selectedEntity.getCartesian());
        }
    }

    public get ellipsoid(): Ellipsoid | null {
        return this._planet ? this._planet.ellipsoid : null;
    }

    protected _moveX = () => {
        console.log("moveX");
    }

    protected _moveY = (e: IMouseState) => {

        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;
        let groundNormal = this._planet!.ellipsoid.getSurfaceNormal3v(p0);
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

    protected _moveZ = () => {
        console.log("moveZ");
    }

    protected _moveXZ = () => {
        console.log("moveXZ");
    }

    protected _moveXY = () => {
        console.log("moveXY");
    }

    protected _moveZY = () => {
        console.log("moveZY");
    }

    protected _rotatePitch = () => {
    }

    protected _rotateYaw = () => {
    }

    protected _rotateRoll = () => {
    }

    protected _scale = () => {
    }

    protected _scaleX = () => {
    }

    protected _scaleY = () => {
    }

    protected _scaleZ = () => {
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
