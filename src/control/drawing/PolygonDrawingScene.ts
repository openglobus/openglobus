import * as math from "../../math";
import {createEvents, EventsHandler} from '../../Events';
import {CoordinatesType} from "../../entity/Geometry";
import {Entity} from '../../entity/Entity';
import {IMouseState} from "../../renderer/RendererEvents";
import {MouseNavigation} from "../MouseNavigation";
import {LonLat} from '../../LonLat';
import {Line3} from '../../math/Line3';
import {Object3d} from '../../Object3d';
import {Planet} from '../../scene/Planet';
import {RenderNode} from '../../scene/RenderNode';
import {Vec2} from '../../math/Vec2';
import {Vec3} from '../../math/Vec3';
import {Vector} from '../../layer/Vector';

type PolygonDrawingSceneEventsList = ["change", "startpoint"];

const POLYGONDRAWINGSCENE_EVENTS: PolygonDrawingSceneEventsList = ["change", "startpoint"];

export interface IPolygonDrawingSceneParams {
    coordinates?: CoordinatesType[];
    name: string;
}

const POINTER_OBJ3D = Object3d.createCylinder(1, 1, 2.0, 20, 1, true, false, 0, -0.5, 0);

export const NUM_SEGMENTS = 200;
export const OUTLINE_ALT = 0.3;
export const COORDINATES_COLOR = "rgb(350, 350, 0)";
export const CENTER_COLOR = "rgb(0, 350, 50)";
export const OUTLINE_COLOR = "rgb(0, 350, 50)";
export const OUTLINE_THICKNESS = 3.5;

export const CORNER_OPTIONS = {
    scale: 0.5,
    instanced: true,
    tag: "corners",
    color: COORDINATES_COLOR,
    object3d: POINTER_OBJ3D
};

export const CENTER_OPTIONS = {
    scale: 0.4,
    instanced: true,
    tag: "centers",
    color: CENTER_COLOR,
    object3d: POINTER_OBJ3D
};

export const OUTLINE_OPTIONS = {
    thickness: OUTLINE_THICKNESS,
    color: OUTLINE_COLOR
}

class PolygonDrawingScene extends RenderNode {
    public events: EventsHandler<PolygonDrawingSceneEventsList>;
    public _planet: Planet | null;
    protected _initCoordinates: CoordinatesType[];
    protected _pickedCorner: Entity | null;
    protected _pickedCenter: Entity | null;
    protected _startPos: Vec2 | null;
    protected _startClick: Vec2;
    protected _geometryLayer: Vector;
    protected _cornerLayer: Vector;
    protected _centerLayer: Vector;
    protected _outlineLayer: Vector;
    protected _ghostCorner: Entity;
    protected _ghostOutlineLayer: Vector;
    protected _showGhostPointer: boolean;
    protected _isStartPoint: boolean;
    protected _insertCornerIndex: number;
    protected _cornerDblClick = false;

    constructor(options: IPolygonDrawingSceneParams) {
        super(options.name);

        this.events = createEvents(POLYGONDRAWINGSCENE_EVENTS);

        this._planet = null;

        this._initCoordinates = options.coordinates || [];

        this._pickedCorner = null;
        this._pickedCenter = null;

        this._startPos = null;
        this._startClick = new Vec2();

        this._geometryLayer = new Vector();

        //
        // outline vectors
        //
        this._cornerLayer = new Vector("corners", {
            pickingScale: 3,
            pickingEnabled: true,
            polygonOffsetUnits: -5,
            relativeToGround: true,
            scaleByDistance: [100, 4000000, 1.0]
        });

        this._centerLayer = new Vector("centers", {
            pickingScale: 3,
            pickingEnabled: true,
            polygonOffsetUnits: -5,
            relativeToGround: true,
            scaleByDistance: [100, 4000000, 1.0]
        });

        this._outlineLayer = new Vector("outline", {
            entities: [new Entity({
                polyline: {
                    path3v: [],
                    isClosed: false,
                    ...OUTLINE_OPTIONS
                }
            })],
            pickingEnabled: false,
            polygonOffsetUnits: -5,
            relativeToGround: true
        });

        this._outlineLayer.getEntities()[0].polyline!.altitude = OUTLINE_ALT;

        //
        // Ghost cursor pointer
        //
        this._ghostCorner = new Entity({
            geoObject: CORNER_OPTIONS
        });

        this._ghostOutlineLayer = new Vector("ghost-pointer", {
            pickingEnabled: false,
            polygonOffsetUnits: -5,
            relativeToGround: true,
            scaleByDistance: [100, 4000000, 1.0],
            opacity: 0.5
        });

        this._showGhostPointer = false;

        this._isStartPoint = false;

        this._insertCornerIndex = -1;
    }

    public get geometryType(): string {
        return "POLYGON";
    }

    public getCoordinates(): CoordinatesType[] {
        let corners = this._cornerLayer.getEntities();
        if (corners.length > 0) {
            return corners.map((c: Entity) => {
                let ll = c.getLonLat();
                return [ll.lon, ll.lat, ll.height];
            });
        } else {
            return this._initCoordinates;
        }
    }

    public bindPlanet(planet: Planet) {
        this._planet = planet;
    }

    public override init() {

        this._initEvents();

        this._initGhostLayerPointer();

        if (this._initCoordinates.length) {
            this.setCoordinates(this._initCoordinates);
        }

        this._planet!.addLayer(this._outlineLayer);
        this._planet!.addLayer(this._cornerLayer);
        this._planet!.addLayer(this._centerLayer);

        this.showGhostPointer();
        this.startNewPoint();

        (this._planet!.renderer!.controls.mouseNavigation as MouseNavigation).deactivateDoubleClickZoom();

        this._geometryLayer.addTo(this._planet!);

        this.events.on("change", this._onChange, this);
    }

    protected _onChange = (e: PolygonDrawingScene) => {
        if (e.geometryType === "POLYGON") {
            let coords = this.getCoordinates();
            let entity = new Entity({
                'geometry': {
                    'type': e.geometryType,
                    'coordinates': [coords],
                    'style': {
                        'fillColor': "rgba(0,146,247,0.2)"
                    }
                }
            });
            this._geometryLayer.clear();
            this._geometryLayer.add(entity);
        }
    }

    override onremove() {
        this._clearEvents();
        this.hideGhostPointer();
        this.stopNewPoint();
        this.clear();
        this._geometryLayer.remove();
    }

    public clear() {

        this._geometryLayer.clear();

        let corners = this._cornerLayer.getEntities();

        let i = corners.length;
        while (i--) {
            corners[i].remove();
        }

        let centers = this._centerLayer.getEntities();
        i = centers.length;
        while (i--) {
            centers[i].remove();
        }

        let entities = this._outlineLayer.getEntities();
        i = entities.length;
        while (i--) {
            entities[i].polyline!.clear();
            if (i > 0) {
                entities[i].remove();
            }
        }

        this._clearGhostPointer();
    }

    public setCoordinates(coords: CoordinatesType[]) {
        this.clear();
        for (let i = 0; i < coords.length; i++) {
            let ci = coords[i];
            let cart = this._planet!.ellipsoid.lonLatToCartesian(new LonLat(ci[0], ci[1], ci[2]));
            this._appendCart(cart);
        }
        this.events.dispatch(this.events.change, this);
    }

    public stopNewPoint() {
        if (this.renderer) {
            this.renderer.events.off("ldblclick", this._onMouseDblClick);
        }
    }

    public startNewPoint() {
        this.renderer!.events.on("ldblclick", this._onMouseDblClick, this);
    }

    public showGhostPointer() {
        this._showGhostPointer = true;
        this._planet!.addLayer(this._ghostOutlineLayer);
        this._insertCornerIndex = this._cornerLayer.getEntities().length;
    }

    public hideGhostPointer() {
        this._showGhostPointer = false;
        this._ghostOutlineLayer.remove();
        this._insertCornerIndex = -1;
    }

    public setGhostPointerPosition(groundPos: Vec3) {
        if (groundPos) {
            this._ghostCorner.setCartesian3v(groundPos);
            this._updateGhostOutlinePointer(groundPos);
        }
    }

    protected _onCornerMouseEnter = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "pointer";
        this.hideGhostPointer();
    }

    _onCornerMouseLeave = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "default";
        this.showGhostPointer();
    }

    _onCenterMouseEnter = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "pointer";
        this.hideGhostPointer();
    }

    _onCenterMouseLeave = (e: IMouseState) => {
        e.renderer.handler.canvas!.style.cursor = "default";
        if (!(this._pickedCenter || this._pickedCorner)) {
            this.showGhostPointer();
        }
    }

    protected _onLup = (e: IMouseState) => {
        (this._planet!.renderer!.controls.mouseNavigation as MouseNavigation).activate();
        if (this._pickedCorner || this._pickedCenter) {
            this.events.dispatch(this.events.change, this);
            this.setGhostPointerPosition(this._planet!.getCartesianFromPixelTerrain(e)!);
            this.showGhostPointer();
            this._pickedCorner = null;
            this._pickedCenter = null;
        }
    }

    protected _getLdown(e: IMouseState): Entity | null {
        (this._planet!.renderer!.controls.mouseNavigation as MouseNavigation).deactivate();
        this._startClick.set(e.x, e.y);
        let coords = e.pickingObject.getCartesian();
        this._startPos = this._planet!.getPixelFromCartesian(coords);
        return e.pickingObject;
    }

    protected _onCornerLdown = (e: IMouseState) => {
        this._pickedCorner = this._getLdown(e);
    }

    protected _onCenterLdown = (e: IMouseState) => {
        this._pickedCenter = this._getLdown(e);
    }

    protected _onMouseMove = (e: IMouseState) => {
        if (this._pickedCenter) {
            this._moveCenterPoint();
        } else if (this._pickedCorner) {
            this._moveCornerPoint(e.pos!);
        } else {
            this.setGhostPointerPosition(this._planet!.getCartesianFromPixelTerrain(e.pos)!);
        }
    }

    protected _onCornerLdblclick = (e: IMouseState) => {
        this._cornerDblClick = true;
        let coords = this.getCoordinates();
        coords.splice(e.pickingObject.layerIndex, 1);
        this.setCoordinates(coords);
    }

    protected _onMouseDblClick = (e: IMouseState) => {

        if (this._cornerDblClick) {
            this._cornerDblClick = false;
            return;
        }

        if (!this._showGhostPointer) {
            return;
        }

        let cart = this._planet!.getCartesianFromPixelTerrain(e);
        if (cart) {
            this._addNew(cart);
            if (!this._isStartPoint && this._cornerLayer.getEntities().length > 2) {
                this._isStartPoint = true;
                this.events.dispatch(this.events.startpoint, this);
            }
            this.events.dispatch(this.events.change, this);
        }
    }

    protected _initEvents() {

        this._cornerLayer.events.on("ldblclick", this._onCornerLdblclick, this);
        this._cornerLayer.events.on("ldown", this._onCornerLdown, this);
        this._centerLayer.events.on("ldown", this._onCenterLdown, this);

        this.renderer!.events.on("lup", this._onLup, this);
        this.renderer!.events.on("mousemove", this._onMouseMove, this);

        this._cornerLayer.events.on("mouseenter", this._onCornerMouseEnter, this);
        this._cornerLayer.events.on("mouseleave", this._onCornerMouseLeave, this);
        this._centerLayer.events.on("mouseenter", this._onCenterMouseEnter, this);
        this._centerLayer.events.on("mouseleave", this._onCenterMouseLeave, this);
    }

    protected _clearEvents() {
        this._cornerLayer.events.off("ldblclick", this._onCornerLdblclick);
        this._cornerLayer.events.off("ldown", this._onCornerLdown);
        this._centerLayer.events.off("ldown", this._onCenterLdown);

        this.renderer!.events.off("lup", this._onLup);
        this.renderer!.events.off("mousemove", this._onMouseMove);

        this._cornerLayer.events.off("mouseenter", this._onCornerMouseEnter);
        this._cornerLayer.events.off("mouseleave", this._onCornerMouseLeave);
        this._centerLayer.events.off("mouseenter", this._onCenterMouseEnter);
        this._centerLayer.events.off("mouseleave", this._onCenterMouseLeave);
    }

    protected _drawCorners() {
        let corners = this._cornerLayer.getEntities();
        for (let i = 0; i < corners.length; i++) {
            let ai = corners[i];
            this._checkTerrainCollision(ai);
        }
    }

    protected _drawCenters() {
        let centers = this._centerLayer.getEntities();
        for (let i = 0; i < centers.length; i++) {
            let ai = centers[i];
            this._checkTerrainCollision(ai);
        }
    }

    protected _drawGhostCorner() {
        if (this._showGhostPointer) {
            this._checkTerrainCollision(this._ghostCorner);
        }
    }

    public override frame() {
        this._drawCorners();
        this._drawCenters();
        this._drawGhostCorner();
    }

    protected _checkTerrainCollision(entity: Entity) {
        let _tempTerrPoint = new Vec3();
        let nodes = this._planet!._renderedNodes;
        for (let j = 0; j < nodes.length; j++) {
            let seg = nodes[j].segment;
            if (seg && seg._extentLonLat.isInside(entity.getLonLat())) {
                seg.getEntityTerrainPoint(entity, _tempTerrPoint);
                entity.setCartesian3v(_tempTerrPoint);
                break;
            }
        }
    }

    protected _moveCenterPoint() {
        let coords = this.getCoordinates(),
            index = this._pickedCenter!.layerIndex + 1,
            ll = this._pickedCenter!.getLonLat();
        let newCorner: CoordinatesType = [ll.lon, ll.lat, ll.height];

        coords.splice(index, 0, newCorner);

        this.setCoordinates(coords);

        this._pickedCenter = null;

        this._pickedCorner = this._cornerLayer.getEntities()[index];
    }

    protected _addNew(cart: Vec3) {
        if (this._insertCornerIndex === -1 || this._cornerLayer.getEntities().length < 2) {
            this._appendCart(cart);
        } else {
            let area = this.getCoordinates(),
                index = this._insertCornerIndex;
            let ll = this._planet!.ellipsoid.cartesianToLonLat(cart);
            let newCorner: CoordinatesType = [ll.lon, ll.lat, ll.height];
            area.splice(index, 0, newCorner);
            this.clear();
            this.setCoordinates(area);
        }
    }

    protected _appendCart(cart: Vec3) {
        let corners = this._cornerLayer.getEntities();

        let segNum = corners.length - 1;
        let prevCorn = corners[segNum];

        let corner = new Entity({
            geoObject: CORNER_OPTIONS,
        });

        corner.setCartesian3v(cart);
        corner.addTo(this._cornerLayer);
        this._checkTerrainCollision(corner);

        if (prevCorn) {

            let firstCart = corners[0].getCartesian(),
                prevCart = prevCorn.getCartesian();

            let vecPrev = corner.getCartesian().sub(prevCart),
                vecFirst = corner.getCartesian().sub(firstCart);

            let distPrev = vecPrev.length(),
                distFirst = vecFirst.length();

            vecPrev.normalize();
            vecFirst.normalize();

            let prevPath = [],
                firstPath = [];

            for (let i = 0; i <= NUM_SEGMENTS; i++) {
                let p = vecPrev.scaleTo(i * distPrev / NUM_SEGMENTS).addA(prevCart);
                prevPath.push(p);

                let f = vecFirst.scaleTo(i * distFirst / NUM_SEGMENTS).addA(firstCart);
                firstPath.push(f);
            }

            this._outlineLayer.getEntities()[0].polyline!.setPath3v([firstPath]);

            let entity = new Entity({
                polyline: {
                    path3v: [prevPath],
                    isClosed: false,
                    ...OUTLINE_OPTIONS
                }
            });
            entity.polyline!.altitude = OUTLINE_ALT;
            this._outlineLayer.add(entity);

            let centers = this._centerLayer.getEntities();
            let firstCenter = centers[centers.length - 1];

            let prevCenterCart = vecPrev.scaleTo(distPrev * 0.5).addA(prevCart),
                firstCenterCart = vecFirst.scaleTo(distFirst * 0.5).addA(firstCart);

            let center = new Entity({
                geoObject: CENTER_OPTIONS,
            });
            center.setCartesian3v(prevCenterCart);
            center.addTo(this._centerLayer);
            this._checkTerrainCollision(center);

            //moveToEnd
            firstCenter.remove();
            firstCenter.addTo(this._centerLayer);

            firstCenter.setCartesian3v(firstCenterCart);

        } else {
            let center = new Entity({
                geoObject: CENTER_OPTIONS,
            });
            center.addTo(this._centerLayer);
        }
    }

    protected _clearGhostPointer() {
        const g = this._ghostOutlineLayer;
        g.getEntities()[0].polyline!.clear();
        g.getEntities()[1].polyline!.clear();
    }

    protected _moveCornerPoint(e: Vec2) {
        let d = new Vec2(e.x, e.y).sub(this._startClick),
            p = this._startPos!.add(d);

        let groundCoords = this._planet!.getCartesianFromPixelTerrain(p);

        if (groundCoords) {

            this._pickedCorner!.setCartesian3v(groundCoords);

            let corners = this._cornerLayer.getEntities();

            if (corners.length) {
                let ind = this._pickedCorner!.layerIndex;
                let size = corners.length;

                let cartPrev = corners[ind === 0 ? (size - 1) : (ind - 1)].getCartesian(),
                    cartNext = corners[(ind + 1) % size].getCartesian();

                let vecPrev = this._pickedCorner!.getCartesian().sub(cartPrev),
                    vecNext = this._pickedCorner!.getCartesian().sub(cartNext);

                let distPrev = vecPrev.length(),
                    distNext = vecNext.length();

                vecPrev.normalize();
                vecNext.normalize();

                let pathPrev = [],
                    pathNext = [];

                for (let i = 0; i <= NUM_SEGMENTS; i++) {
                    let p = vecPrev.scaleTo(i * distPrev / NUM_SEGMENTS).addA(cartPrev);
                    pathPrev.push(p);

                    let f = vecNext.scaleTo(i * distNext / NUM_SEGMENTS).addA(cartNext);
                    pathNext.push(f);
                }

                let entities = this._outlineLayer.getEntities();

                let prevPolyline = entities[ind].polyline,
                    nextPolyline = entities[(ind + 1) % size].polyline;

                prevPolyline?.setPath3v([pathPrev]);
                nextPolyline?.setPath3v([pathNext]);

                //
                // Move center points
                let centers = this._centerLayer.getEntities();
                let prevCenter = centers[ind === 0 ? (size - 1) : (ind - 1)],
                    nextCenter = centers[ind];

                let prevCenterCart = vecPrev.scaleTo(distPrev * 0.5).addA(cartPrev),
                    nextCenterCart = vecNext.scaleTo(distNext * 0.5).addA(cartNext);

                prevCenter.setCartesian3v(prevCenterCart);
                this._checkTerrainCollision(prevCenter);

                nextCenter.setCartesian3v(nextCenterCart);
                this._checkTerrainCollision(nextCenter);
            }
        }
    }

    protected _updateGhostOutlinePointer(groundPos: Vec3) {

        let corners = this._cornerLayer.getEntities();
        let size = corners.length;

        if (size > 0) {

            let ind = 0;

            let minDist = math.MAX;

            for (let i = 0; i < size; i++) {
                let ci = corners[i];
                let dist = ci.getCartesian().distance(groundPos);
                if (dist < minDist) {
                    minDist = dist;
                    ind = i;
                }
            }

            let cCurr = corners[ind].getCartesian(),
                cNext = corners[(ind + 1) % size].getCartesian(),
                cPrev = corners[ind === 0 ? (size - 1) : (ind - 1)].getCartesian();

            let nPrev = cPrev.sub(cCurr).normalize(),
                nNext = cNext.sub(cCurr).normalize(),
                nGround = groundPos.sub(cCurr).normalize();

            let midVec = nPrev.add(nNext).normalize();

            let toMid = nGround.cross(midVec),
                up = nPrev.cross(nNext);

            if (toMid.dot(up) > 0) {
                ind--;
                if (ind < 0) {
                    ind = size - 1;
                }
            }

            let temp = new Vec3();

            for (let i = 0; i < size; i++) {
                let side = new Line3(corners[i].getCartesian(), corners[(i + 1) % size].getCartesian());
                let u = side.getNearestDistancePoint(groundPos, temp);
                if (u) {
                    let dist = temp.distance(groundPos);
                    if (dist < minDist) {
                        minDist = dist;
                        ind = i;
                    }
                }
            }

            this._insertCornerIndex = (ind + 1) % size;

            let cartPrev = corners[ind % size].getCartesian(),
                cartNext = corners[(ind + 1) % size].getCartesian();

            let vecPrev = this._ghostCorner.getCartesian().sub(cartPrev),
                vecNext = this._ghostCorner.getCartesian().sub(cartNext);

            let distPrev = vecPrev.length(),
                distNext = vecNext.length();

            vecPrev.normalize();
            vecNext.normalize();

            let pathPrev = [],
                pathNext = [];

            for (let i = 0; i <= NUM_SEGMENTS; i++) {
                let p = vecPrev.scaleTo(i * distPrev / NUM_SEGMENTS).addA(cartPrev);
                pathPrev.push(p);

                let f = vecNext.scaleTo(i * distNext / NUM_SEGMENTS).addA(cartNext);
                pathNext.push(f);
            }

            let entities = this._ghostOutlineLayer.getEntities();

            let prevPolyline = entities[0].polyline,
                nextPolyline = entities[1].polyline;

            prevPolyline?.setPath3v([pathPrev]);
            nextPolyline?.setPath3v([pathNext]);
        }
    }

    protected _initGhostLayerPointer() {
        this._ghostOutlineLayer.setEntities([
            new Entity({
                polyline: {
                    path3v: [],
                    isClosed: false,
                    ...OUTLINE_OPTIONS
                }
            }), new Entity({
                polyline: {
                    path3v: [],
                    isClosed: false,
                    ...OUTLINE_OPTIONS
                }
            }),
            this._ghostCorner
        ]);

        const g = this._ghostOutlineLayer;
        g.getEntities()[0].polyline!.altitude = g.getEntities()[1].polyline!.altitude = OUTLINE_ALT;
    }
}

export {PolygonDrawingScene};
