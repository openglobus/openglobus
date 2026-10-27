import { Ellipsoid } from "../ellipsoid/Ellipsoid";
import type { PlanetCamera } from "../camera/PlanetCamera";
import { Vec3 } from "../math/Vec3";
import { EPS8 } from "../math";

const FOOTPRINT_SCREEN_EDGE_SEARCH_STEPS = 4;

const _terrainPoint = new Vec3();

/**
 * Points under the screen corners, as [leftTop, rightTop, leftBottom, rightBottom].
 */
export type CameraFootprintCorners = [Vec3 | undefined, Vec3 | undefined, Vec3 | undefined, Vec3 | undefined];

export interface ICameraFootprintParams {
    screenMargin?: number;
    terrainHeightStep?: number;
    drop?: number;
}

function getEllipsoidHit(camera: PlanetCamera, ellipsoid: Ellipsoid, x: number, y: number): Vec3 | undefined {
    let ray = camera.getRay(x, y);
    return ellipsoid.hitRay(ray.origin, ray.direction);
}

/**
 * Returns the horizon point in the given direction: the tangency point of the line drawn from the
 * camera to the sphere of radius `radius`. Seen from the sphere center, that point sits `r^2 / d`
 * along the camera up axis and `r * sqrt(d^2 - r^2) / d` along the horizontal direction.
 */
function getHorizonPointByDirection(camera: PlanetCamera, direction: Vec3, radius: number): Vec3 | undefined {
    let up = camera.eye.getNormal();
    let horizonDirection = Vec3.proj_b_to_plane(direction, up);

    if (horizonDirection.length2() < EPS8) {
        return;
    }

    horizonDirection.normalize();

    let distanceToCamera = camera.eye.length();

    if (distanceToCamera <= radius) {
        return;
    }

    let tangentDistance = Math.sqrt(distanceToCamera * distanceToCamera - radius * radius);
    let upDistance = (radius * radius) / distanceToCamera;
    let horizonDistance = (radius * tangentDistance) / distanceToCamera;

    return up.scaleTo(upDistance).addA(horizonDirection.scaleTo(horizonDistance));
}

/**
 * Search for the boundary point between a hit and a miss along a screen row.
 */
function getFootprintBoundaryOnScreenSegment(
    camera: PlanetCamera,
    ellipsoid: Ellipsoid,
    hitX: number,
    missX: number,
    y: number
): Vec3 | undefined {
    let x0 = hitX;
    let x1 = missX;
    let hit = getEllipsoidHit(camera, ellipsoid, x0, y);

    if (!hit) return;

    for (let i = 0; i < FOOTPRINT_SCREEN_EDGE_SEARCH_STEPS; i++) {
        let x = (x0 + x1) * 0.5;
        let midHit = getEllipsoidHit(camera, ellipsoid, x, y);

        if (midHit) {
            x0 = x;
            hit = midHit;
        } else {
            x1 = x;
        }
    }

    return hit;
}

function getGroundPoint(camera: PlanetCamera, point: Vec3): Vec3 {
    _terrainPoint.copy(point);
    let distance = camera.planet.getCartesianTerrainPoint(point, _terrainPoint);
    return distance != undefined ? _terrainPoint.clone() : point.clone();
}

/**
 * Reference surface points under the four screen corners, as [leftTop, rightTop, leftBottom, rightBottom].
 *
 * @param {PlanetCamera} camera - Camera to take the footprint of.
 * @param {number} [screenMargin=100] - Border of the screen, in screen pixels, the corners are sampled inside of.
 * @param {Ellipsoid} [ellipsoid] - Reference surface, the planet ellipsoid by default. See CameraFootprint
 * for one raised to the terrain under the camera.
 */
export function getCameraFootprint(
    camera: PlanetCamera,
    screenMargin: number = 100,
    ellipsoid: Ellipsoid = camera.planet.ellipsoid
): CameraFootprintCorners {
    let screenLeft = screenMargin;
    let screenRight = camera.width - screenMargin;
    let screenTop = screenMargin;
    let screenBottom = camera.height - screenMargin;

    let rayLt = camera.getRay(screenLeft, screenTop);
    let rayRt = camera.getRay(screenRight, screenTop);
    let rayLb = camera.getRay(screenLeft, screenBottom);
    let rayRb = camera.getRay(screenRight, screenBottom);

    let rawHitLt = ellipsoid.hitRay(rayLt.origin, rayLt.direction);
    let rawHitRt = ellipsoid.hitRay(rayRt.origin, rayRt.direction);
    let rawHitLb = ellipsoid.hitRay(rayLb.origin, rayLb.direction);
    let rawHitRb = ellipsoid.hitRay(rayRb.origin, rayRb.direction);

    let hitLt = rawHitLt;
    let hitRt = rawHitRt;
    let hitLb = rawHitLb;
    let hitRb = rawHitRb;

    //
    // @todo: if it works fine, then remove radius parameters
    //  and replace to the getHorizonPointByDirection
    //
    //let radius = ellipsoid.projToSurface(camera.eye).length();
    let radius = ellipsoid.equatorialSize;

    if (!hitLt && (rawHitLb || rawHitRt)) {
        hitLt = getHorizonPointByDirection(camera, rayLt.direction, radius);
    }

    if (!hitRt && (rawHitRb || rawHitLt)) {
        hitRt = getHorizonPointByDirection(camera, rayRt.direction, radius);
    }

    if (!hitLb && (rawHitLt || rawHitRb)) {
        hitLb = getHorizonPointByDirection(camera, rayLb.direction, radius);
    }

    if (!hitRb && (rawHitRt || rawHitLb)) {
        hitRb = getHorizonPointByDirection(camera, rayRb.direction, radius);
    }

    let isLeftColumnOnly = rawHitLt && rawHitLb && !rawHitRt && !rawHitRb;
    let isRightColumnOnly = rawHitRt && rawHitRb && !rawHitLt && !rawHitLb;

    if (isLeftColumnOnly) {
        hitRt = getFootprintBoundaryOnScreenSegment(camera, ellipsoid, screenLeft, screenRight, screenTop) || hitRt;
        hitRb = getFootprintBoundaryOnScreenSegment(camera, ellipsoid, screenLeft, screenRight, screenBottom) || hitRb;
    } else if (isRightColumnOnly) {
        hitLt = getFootprintBoundaryOnScreenSegment(camera, ellipsoid, screenRight, screenLeft, screenTop) || hitLt;
        hitLb = getFootprintBoundaryOnScreenSegment(camera, ellipsoid, screenRight, screenLeft, screenBottom) || hitLb;
    }

    return [hitLt, hitRt, hitLb, hitRb];
}

/**
 * The ground area a camera sees: the four screen corners cast onto a reference surface and dropped onto the
 * rendered terrain, plus the center, surface normals and radius derived from them.
 *
 * The reference surface is the planet ellipsoid raised to the terrain right under the camera, so that a
 * camera on a mountain does not measure its footprint against sea level. Only the height under the camera
 * is used, which keeps the footprint independent of how far the surrounding tiles have loaded.
 */
export class CameraFootprint {
    /** Border of the screen, in screen pixels, the corners are sampled inside of. */
    public screenMargin: number;

    /**
     * Terrain height under the camera is quantized to this step, in world units, before the reference
     * ellipsoid is rebuilt, so that the footprint does not jitter while flying over rough terrain.
     */
    public terrainHeightStep: number;

    /** Lowers the reference ellipsoid by this many world units. */
    public drop: number;

    /** Camera the current footprint was taken of. */
    public camera: PlanetCamera | null;

    /** Reference surface, the planet ellipsoid raised to the terrain under the camera. */
    public ellipsoid: Ellipsoid | null;

    /** Height the reference ellipsoid is raised by, in world units. */
    public ellipsoidHeight: number;

    /** Whether the last update found all four corners. */
    public isValid: boolean;

    /** Reference surface corners in screen order, as [leftTop, rightTop, leftBottom, rightBottom]. */
    public corners: CameraFootprintCorners;

    /** Reference surface corners in contour order. */
    public surfacePoints: Vec3[];

    /** Corners dropped onto the rendered terrain, in contour order. */
    public points: Vec3[];

    /** Reference surface normals under the ground points. */
    public normals: Vec3[];

    public center: Vec3;

    /** Distance from the center to the farthest ground point. */
    public radius: number;

    constructor(params: ICameraFootprintParams = {}) {
        this.screenMargin = params.screenMargin ?? 100;
        this.terrainHeightStep = params.terrainHeightStep ?? 1.0;
        this.drop = params.drop ?? 0.0;

        this.camera = null;
        this.ellipsoid = null;
        this.ellipsoidHeight = 0.0;

        this.isValid = false;
        this.corners = [undefined, undefined, undefined, undefined];
        this.surfacePoints = [];
        this.points = [];
        this.normals = [];
        this.center = new Vec3();
        this.radius = 0.0;
    }

    /**
     * Takes the footprint of the camera.
     *
     * @param {PlanetCamera} camera - Camera to take the footprint of.
     * @returns {boolean} - False when the screen misses the planet, which leaves the previous points in place.
     */
    public update(camera: PlanetCamera): boolean {
        this.camera = camera;

        this._updateEllipsoid(camera);

        let corners = getCameraFootprint(camera, this.screenMargin, this.ellipsoid!);

        this.corners = corners;

        if (!corners[0] || !corners[1] || !corners[2] || !corners[3]) {
            this.isValid = false;
            return false;
        }

        // [leftTop, rightTop, rightBottom, leftBottom], so that the points can be walked
        let surfacePoints = [corners[0], corners[1], corners[3], corners[2]];
        let points: Vec3[] = [];
        let normals: Vec3[] = [];
        let center = new Vec3();

        for (let i = 0; i < surfacePoints.length; i++) {
            points.push(getGroundPoint(camera, surfacePoints[i]));
            center.addA(points[i]);
        }

        center.scale(1.0 / points.length);

        let radius = 0.0;

        for (let i = 0; i < points.length; i++) {
            normals.push(this.ellipsoid!.getSurfaceNormal3v(points[i]));
            radius = Math.max(radius, points[i].distance(center));
        }

        this.surfacePoints = surfacePoints;
        this.points = points;
        this.normals = normals;
        this.center = center;
        this.radius = radius;
        this.isValid = true;

        return true;
    }

    /**
     * Level the reference ellipsoid is raised to: the terrain right under the camera, and nothing else.
     */
    protected _getTerrainHeight(camera: PlanetCamera): number {
        return camera.getHeight() - camera.getAltitude() - this.drop;
    }

    protected _updateEllipsoid(camera: PlanetCamera): void {
        let baseEllipsoid = camera.planet.ellipsoid;
        let terrainHeight =
            Math.round(this._getTerrainHeight(camera) / this.terrainHeightStep) * this.terrainHeightStep;

        if (this.ellipsoid && terrainHeight === this.ellipsoidHeight) {
            return;
        }

        this.ellipsoidHeight = terrainHeight;
        this.ellipsoid =
            terrainHeight === 0.0
                ? baseEllipsoid
                : new Ellipsoid(baseEllipsoid.equatorialSize + terrainHeight, baseEllipsoid.polarSize + terrainHeight);
    }
}
