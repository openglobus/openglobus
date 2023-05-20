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

class LineStringDrawingScene extends PolygonDrawingScene {
    constructor(props) {
        super(props);
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

            this._outlineLayer.getEntities()[0].polyline.setPath3v([firstPath]);

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

    _clearGhostPointer() {
        this._ghostOutlineLayer.getEntities()[0].polyline.clear();
        this._ghostOutlineLayer.getEntities()[1].polyline.clear();
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

                let cartPrev = corners[ind === 0 ? (size - 1) : (ind - 1)].getCartesian(),
                    cartNext = corners[(ind + 1) % size].getCartesian();

                let vecPrev = this._pickedCorner.getCartesian().sub(cartPrev),
                    vecNext = this._pickedCorner.getCartesian().sub(cartNext);

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

                prevPolyline.setPath3v([pathPrev]);
                nextPolyline.setPath3v([pathNext]);

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

    _updateGhostOutlinePointer(groundPos) {

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

            prevPolyline.setPath3v([pathPrev]);
            nextPolyline.setPath3v([pathNext]);
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
            }), new Entity({
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

        this._ghostOutlineLayer.getEntities()[0].polyline.altitude =
            this._ghostOutlineLayer.getEntities()[1].polyline.altitude = OUTLINE_ALT;
    }
}

export { LineStringDrawingScene };