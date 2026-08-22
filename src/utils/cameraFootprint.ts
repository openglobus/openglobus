import type { PlanetCamera } from "../camera/PlanetCamera";
import { Vec3 } from "../math/Vec3";

const FOOTPRINT_SCREEN_EDGE_SEARCH_STEPS = 4;

function getEllipsoidHit(camera: PlanetCamera, x: number, y: number): Vec3 | undefined {
    let ray = camera.getRay(x, y);
    return camera.planet.ellipsoid.hitRay(ray.origin, ray.direction);
}

/**
 * Tangency point of the line from the camera to the sphere it stands on.
 */
function getHorizonPointByDirection(camera: PlanetCamera, direction: Vec3): Vec3 | undefined {
    let up = camera.eye.getNormal();
    let horizonDirection = Vec3.proj_b_to_plane(direction, up);

    if (horizonDirection.length2() < 1e-8) {
        return undefined;
    }

    horizonDirection.normalize();

    let distanceToCamera = camera.eye.length();
    let radius = distanceToCamera - camera.getHeight();

    if (distanceToCamera <= radius) {
        return undefined;
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
    hitX: number,
    missX: number,
    y: number
): Vec3 | undefined {
    let x0 = hitX;
    let x1 = missX;
    let hit = getEllipsoidHit(camera, x0, y);

    if (!hit) {
        return undefined;
    }

    for (let i = 0; i < FOOTPRINT_SCREEN_EDGE_SEARCH_STEPS; i++) {
        let x = (x0 + x1) * 0.5;
        let midHit = getEllipsoidHit(camera, x, y);

        if (midHit) {
            x0 = x;
            hit = midHit;
        } else {
            x1 = x;
        }
    }

    return hit;
}

/**
 * Ellipsoid points under the four screen corners, as [leftTop, rightTop, leftBottom, rightBottom].
 *
 * @param {PlanetCamera} camera - Camera to take the footprint of.
 * @param {number} [screenMargin=100] - Border of the screen, in pixels, the corners are sampled inside of.
 */
export function getCameraFootprint(
    camera: PlanetCamera,
    screenMargin: number = 100
): [Vec3 | undefined, Vec3 | undefined, Vec3 | undefined, Vec3 | undefined] {
    let screenLeft = screenMargin;
    let screenRight = camera.width - screenMargin;
    let screenTop = screenMargin;
    let screenBottom = camera.height - screenMargin;

    let rawHitLt = getEllipsoidHit(camera, screenLeft, screenTop);
    let rawHitRt = getEllipsoidHit(camera, screenRight, screenTop);
    let rawHitLb = getEllipsoidHit(camera, screenLeft, screenBottom);
    let rawHitRb = getEllipsoidHit(camera, screenRight, screenBottom);

    let rayLt = camera.getRay(screenLeft, screenTop);
    let rayRt = camera.getRay(screenRight, screenTop);
    let rayLb = camera.getRay(screenLeft, screenBottom);
    let rayRb = camera.getRay(screenRight, screenBottom);

    let hitLt = rawHitLt;
    let hitRt = rawHitRt;
    let hitLb = rawHitLb;
    let hitRb = rawHitRb;
    let hasAnyRawHit = rawHitLt || rawHitRt || rawHitLb || rawHitRb;

    if (!hitLt && hasAnyRawHit) {
        hitLt = getHorizonPointByDirection(camera, rayLt.direction);
    }

    if (!hitRt && hasAnyRawHit) {
        hitRt = getHorizonPointByDirection(camera, rayRt.direction);
    }

    if (!hitLb && hasAnyRawHit) {
        hitLb = getHorizonPointByDirection(camera, rayLb.direction);
    }

    if (!hitRb && hasAnyRawHit) {
        hitRb = getHorizonPointByDirection(camera, rayRb.direction);
    }

    let isLeftColumnOnly = rawHitLt && rawHitLb && !rawHitRt && !rawHitRb;
    let isRightColumnOnly = rawHitRt && rawHitRb && !rawHitLt && !rawHitLb;

    if (isLeftColumnOnly) {
        hitRt = getFootprintBoundaryOnScreenSegment(camera, screenLeft, screenRight, screenTop) || hitRt;
        hitRb = getFootprintBoundaryOnScreenSegment(camera, screenLeft, screenRight, screenBottom) || hitRb;
    } else if (isRightColumnOnly) {
        hitLt = getFootprintBoundaryOnScreenSegment(camera, screenRight, screenLeft, screenTop) || hitLt;
        hitLb = getFootprintBoundaryOnScreenSegment(camera, screenRight, screenLeft, screenBottom) || hitLb;
    }

    return [hitLt, hitRt, hitLb, hitRb];
}
