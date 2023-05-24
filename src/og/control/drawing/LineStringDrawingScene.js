import {
    OUTLINE_ALT,
    CORNER_OPTIONS,
    NUM_SEGMENTS,
    OUTLINE_OPTIONS,
    CENTER_OPTIONS,
    PolygonDrawingScene
} from "./PolygonDrawingScene.js";
import { Entity } from "../../entity/Entity.js";
import { Line3, Vec2, Vec3 } from "../../math/index.js";
import * as math from "../../math.js";
import { GeometryType } from "../../entity/Geometry.js";

class LineStringDrawingScene extends PolygonDrawingScene {
    constructor(props) {
        super(props);
    }

    get geometryType() {
        return "LineString";
    }

    _addNew(cart) {
        this._appendCart(cart);
    }

    _appendCart(cart) {
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

            let prevCart = prevCorn.getCartesian();

            let vecPrev = corner.getCartesian().sub(prevCart);

            let distPrev = vecPrev.length();

            vecPrev.normalize();

            let prevPath = [];

            for (let i = 0; i <= NUM_SEGMENTS; i++) {
                let p = vecPrev.scaleTo(i * distPrev / NUM_SEGMENTS).addA(prevCart);
                prevPath.push(p);
            }

            let entity = new Entity({
                polyline: {
                    path3v: [prevPath],
                    isClosed: false,
                    properties: {
                        index: segNum + 1
                    },
                    ...OUTLINE_OPTIONS
                }
            });
            entity.polyline.altitude = OUTLINE_ALT;
            this._outlineLayer.add(entity);

            let prevCenterCart = vecPrev.scaleTo(distPrev * 0.5).addA(prevCart);

            let center = new Entity({
                geoObject: CENTER_OPTIONS,
            });
            center.setCartesian3v(prevCenterCart);
            center.addTo(this._centerLayer);
            this._checkTerrainCollision(center);

        }
    }

    _clearGhostPointer() {
        this._ghostOutlineLayer.getEntities()[0].polyline.clear();
    }

    _moveCorner(indexCurrent, indexPrev, indexCenter) {
        let corners = this._cornerLayer.getEntities();
        if (corners.length == 0) return;
        if (corners.length == 1) {
            indexCurrent = indexPrev = indexCenter = 0;
        }
        let cartCurr = corners[indexCurrent].getCartesian();
        let vecCurr = this._pickedCorner.getCartesian().sub(cartCurr);
        let distCurr = vecCurr.length();
        vecCurr.normalize();

        let path = [];
        for (let i = 0; i <= NUM_SEGMENTS; i++) {
            let p = vecCurr.scaleTo(i * distCurr / NUM_SEGMENTS).addA(cartCurr);
            path.push(p);
        }

        let entities = this._outlineLayer.getEntities();

        let prevPolyline = entities[indexPrev].polyline;

        prevPolyline.setPath3v([path]);

        //
        // Move center points
        let centers = this._centerLayer.getEntities();
        let center = centers[indexCenter];

        if (center) {
            let centerCart = vecCurr.scaleTo(distCurr * 0.5).addA(cartCurr);
            center.setCartesian3v(centerCart);
            this._checkTerrainCollision(center);
        }
    }

    _moveCornerPoint(e) {
        let d = new Vec2(e.x, e.y).sub(this._startClick),
            p = this._startPos.add(d);

        let groundCoords = this._planet.getCartesianFromPixelTerrain(p);

        if (groundCoords) {

            this._pickedCorner.setCartesian3v(groundCoords);

            let corners = this._cornerLayer.getEntities();

            if (corners.length) {
                let ind = this._pickedCorner.layerIndex;
                let size = corners.length;

                if (ind === 0) {
                    this._moveCorner(ind + 1, ind + 1, ind);
                } else if (ind === corners.length - 1) {
                    this._moveCorner(ind - 1, ind, ind - 1);
                } else {
                    this._moveCorner(ind + 1, ind + 1, ind);
                    this._moveCorner(ind - 1, ind, ind - 1);
                }
            }
        }
    }

    _updateGhostOutlinePointer(groundPos) {

        let corners = this._cornerLayer.getEntities();
        let size = corners.length;

        if (size > 0) {

            let ind = size - 1;

            this._insertCornerIndex = ind;

            let cartPrev = corners[ind].getCartesian();

            let vecPrev = this._ghostCorner.getCartesian().sub(cartPrev);

            let distPrev = vecPrev.length();

            vecPrev.normalize();

            let pathPrev = [];

            for (let i = 0; i <= NUM_SEGMENTS; i++) {
                let p = vecPrev.scaleTo(i * distPrev / NUM_SEGMENTS).addA(cartPrev);
                pathPrev.push(p);
            }

            let entities = this._ghostOutlineLayer.getEntities();

            let prevPolyline = entities[0].polyline;

            prevPolyline.setPath3v([pathPrev]);
        }
    }

    _initGhostLayerPointer() {
        this._ghostOutlineLayer.setEntities([
            new Entity({
                polyline: {
                    path3v: [],
                    isClosed: false,
                    ...OUTLINE_OPTIONS
                },
                properties: {
                    index: 0
                }
            }),
            this._ghostCorner
        ]);

        this._ghostOutlineLayer.getEntities()[0].polyline.altitude = OUTLINE_ALT;
    }
}

export { LineStringDrawingScene };