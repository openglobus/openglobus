import type { Ellipsoid } from "../ellipsoid/Ellipsoid";
import type { Planet } from "../scene/Planet";
import type { PlanetCamera } from "../camera/PlanetCamera";
import type { CameraFootprint } from "./cameraFootprint";
import { Vec3 } from "../math/Vec3";
import { EPS12 } from "../math";

const SHADOW_FOOTPRINT_TEST_DISTANCE = 100000;
const SHADOW_CASTER_DEPTH_PADDING = 10000;
const SHADOW_RECEIVER_DEPTH_PADDING = 100;
const SHADOW_NEAR = 1000;
const SHADOW_MIN_CAMERA_ALTITUDE = 1000;
const SHADOW_CASTER_HEIGHT_PADDING = 10000;
const SHADOW_SUNWARD_CAMERA_OFFSET = 50000;
const SHADOW_TEXEL_SNAP_ENABLED = true;
const SHADOW_ORTHO_TEXEL_PADDING = 2;
const SHADOW_ORTHO_CASTER_MARGIN = 25000;
const SHADOW_REFERENCE_TEXTURE_SIZE = 1024;

export interface ILightSpaceBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
}

interface IExpandedLightSpaceBounds extends ILightSpaceBounds {
    casterMarginX: number;
    casterMarginY: number;
    tightWidth: number;
    tightHeight: number;
}

export interface IShadowCameraAltitudeClamp {
    altitude: number;
    offset: Vec3;
    terrainAvailable: boolean;
}

function getAveragePoint(points: Vec3[]): Vec3 {
    let center = new Vec3();

    for (let i = 0; i < points.length; i++) {
        center.addA(points[i]);
    }

    return center.scale(1.0 / points.length);
}

/** Filled in by fitShadowCamera when it is given one, for readouts and debugging. */
export interface IShadowCameraFitData {
    footprintCenter?: Vec3;
    sunDirection?: Vec3;
    cameraPosition?: Vec3;
    bounds?: ILightSpaceBounds;
    originalBounds?: ILightSpaceBounds;
    textureWidth?: number;
    textureHeight?: number;
    orthoWidth?: number;
    orthoHeight?: number;
    referenceTexelSizeX?: number;
    referenceTexelSizeY?: number;
    casterMarginX?: number;
    casterMarginY?: number;
    originalNear?: number;
    originalFar?: number;
    near?: number;
    far?: number;
    depthShift?: number;
    cameraForwardShift?: number;
    altitudeClamp?: IShadowCameraAltitudeClamp;
}

function getStableLightUp(ellipsoid: Ellipsoid, lightDirection: Vec3, footprintCenter: Vec3): Vec3 {
    // let surfaceUp = ellipsoid.getSurfaceNormal3v(footprintCenter);
    // let candidates = [surfaceUp, Vec3.NORTH, Vec3.UNIT_Y, Vec3.UNIT_X];
    //
    // for (let i = 0; i < candidates.length; i++) {
    //     let projected = candidates[i].sub(lightDirection.scaleTo(candidates[i].dot(lightDirection)));
    //     if (projected.length2() > EPS12) {
    //         return projected.normalize();
    //     }
    // }
    //
    // return Vec3.UNIT_Y;

    let surfaceUp = ellipsoid.getSurfaceNormal3v(footprintCenter);
    let projected = surfaceUp.sub(lightDirection.scaleTo(surfaceUp.dot(lightDirection)));
    return projected.normalize();
}

/**
 * The camera basis, not its view matrix: the matrix is protected, and the two are the same transform -
 * x along right, y along up, z along forward.
 */
function getLightSpaceBounds(camera: PlanetCamera, points: Vec3[]): ILightSpaceBounds {
    let right = camera.getRight();
    let up = camera.getUp();
    let forward = camera.getForward();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < points.length; i++) {
        let p = points[i].sub(camera.eye);
        let x = p.dot(right);
        let y = p.dot(up);
        let z = p.dot(forward);

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
    }

    return { minX, maxX, minY, maxY, minZ, maxZ };
}

function getTerrainHeightFactor(planet: Planet): number {
    return planet._heightFactor || 1.0;
}

function getCasterBoundsPoints(planet: Planet, points: Vec3[]): Vec3[] {
    let heightPadding = SHADOW_CASTER_HEIGHT_PADDING * getTerrainHeightFactor(planet);
    let casterPoints = points.slice();

    for (let i = 0; i < points.length; i++) {
        let surfaceNormal = planet.ellipsoid.getSurfaceNormal3v(points[i]);
        casterPoints.push(points[i].add(surfaceNormal.scaleTo(heightPadding)));
    }

    return casterPoints;
}

function getCasterExpandedLightSpaceBounds(
    bounds: ILightSpaceBounds,
    textureWidth: number,
    textureHeight: number
): IExpandedLightSpaceBounds {
    let width = bounds.maxX - bounds.minX;
    let height = bounds.maxY - bounds.minY;

    let snapPaddingScaleX = SHADOW_TEXEL_SNAP_ENABLED ? 1.0 + (2.0 * SHADOW_ORTHO_TEXEL_PADDING) / textureWidth : 1.0;
    let snapPaddingScaleY = SHADOW_TEXEL_SNAP_ENABLED ? 1.0 + (2.0 * SHADOW_ORTHO_TEXEL_PADDING) / textureHeight : 1.0;

    let maxQualityWidth = (width * (textureWidth / SHADOW_REFERENCE_TEXTURE_SIZE)) / snapPaddingScaleX;
    let maxQualityHeight = (height * (textureHeight / SHADOW_REFERENCE_TEXTURE_SIZE)) / snapPaddingScaleY;

    let marginX = Math.min(SHADOW_ORTHO_CASTER_MARGIN, Math.max(0.0, (maxQualityWidth - width) * 0.5));
    let marginY = Math.min(SHADOW_ORTHO_CASTER_MARGIN, Math.max(0.0, (maxQualityHeight - height) * 0.5));

    return {
        minX: bounds.minX - marginX,
        maxX: bounds.maxX + marginX,
        minY: bounds.minY - marginY,
        maxY: bounds.maxY + marginY,
        minZ: bounds.minZ,
        maxZ: bounds.maxZ,
        casterMarginX: marginX,
        casterMarginY: marginY,
        tightWidth: width,
        tightHeight: height
    };
}

function getSnappedLightSpaceBounds(
    camera: PlanetCamera,
    bounds: ILightSpaceBounds,
    textureWidth: number,
    textureHeight: number
): ILightSpaceBounds {
    if (!SHADOW_TEXEL_SNAP_ENABLED || textureWidth <= 0 || textureHeight <= 0) {
        return bounds;
    }

    let sourceWidth = bounds.maxX - bounds.minX;
    let sourceHeight = bounds.maxY - bounds.minY;
    let sourceTexelSizeX = sourceWidth / textureWidth;
    let sourceTexelSizeY = sourceHeight / textureHeight;

    if (sourceTexelSizeX <= 0.0 || sourceTexelSizeY <= 0.0) {
        return bounds;
    }

    let paddedMinX = bounds.minX - sourceTexelSizeX * SHADOW_ORTHO_TEXEL_PADDING;
    let paddedMaxX = bounds.maxX + sourceTexelSizeX * SHADOW_ORTHO_TEXEL_PADDING;
    let paddedMinY = bounds.minY - sourceTexelSizeY * SHADOW_ORTHO_TEXEL_PADDING;
    let paddedMaxY = bounds.maxY + sourceTexelSizeY * SHADOW_ORTHO_TEXEL_PADDING;
    let width = paddedMaxX - paddedMinX;
    let height = paddedMaxY - paddedMinY;
    let texelSizeX = width / textureWidth;
    let texelSizeY = height / textureHeight;
    let right = camera.getRight();
    let up = camera.getUp();
    let eyeX = camera.eye.dot(right);
    let eyeY = camera.eye.dot(up);
    let worldLeft = eyeX + paddedMinX;
    let worldBottom = eyeY + paddedMinY;
    let snappedWorldLeft = Math.floor(worldLeft / texelSizeX) * texelSizeX;
    let snappedWorldBottom = Math.floor(worldBottom / texelSizeY) * texelSizeY;
    let snappedMinX = snappedWorldLeft - eyeX;
    let snappedMinY = snappedWorldBottom - eyeY;

    return {
        minX: snappedMinX,
        maxX: snappedMinX + width,
        minY: snappedMinY,
        maxY: snappedMinY + height,
        minZ: bounds.minZ,
        maxZ: bounds.maxZ
    };
}

function clampShadowCameraAltitude(camera: PlanetCamera, cameraLook: Vec3, lightUp: Vec3): IShadowCameraAltitudeClamp {
    camera.minAltitude = SHADOW_MIN_CAMERA_ALTITUDE;

    let eyeBeforeClamp = camera.eye.clone();
    let terrainPoint = camera.checkTerrainCollision();
    let altitude = camera.getAltitude();

    if (!terrainPoint && altitude < SHADOW_MIN_CAMERA_ALTITUDE) {
        let surfacePoint = camera.planet.ellipsoid.projToSurface(camera.eye);
        let surfaceNormal = camera.planet.ellipsoid.getSurfaceNormal3v(camera.eye);

        camera.eye.copy(surfacePoint.addA(surfaceNormal.scaleTo(SHADOW_MIN_CAMERA_ALTITUDE)));
        (camera as any)._terrainAltitude = SHADOW_MIN_CAMERA_ALTITUDE;
        altitude = SHADOW_MIN_CAMERA_ALTITUDE;
    }

    let clampOffset = camera.eye.sub(eyeBeforeClamp);

    if (clampOffset.length2() > 0.0) {
        cameraLook.addA(clampOffset);
        camera.set(camera.eye, cameraLook, lightUp);
        camera.update();
        altitude = camera.getAltitude();
    }

    return {
        altitude,
        offset: clampOffset,
        terrainAvailable: Boolean(terrainPoint)
    };
}

/**
 * Fits the shadow camera view to the footprint.
 *
 * @param {PlanetCamera} camera - Orthographic camera to place and fit. Its viewport is the shadow map size.
 * @param {Vec3} sunPos - Sun position.
 * @param {CameraFootprint} footprint - Ground area to cover, see getCameraFootprint.
 * @param {IShadowCameraFitData} [fitData] - Filled in with what the fit came out to, when given.
 * @returns {boolean} - False when the footprint is incomplete or gives no usable bounds.
 */
export function fitShadowCamera(
    camera: PlanetCamera,
    sunPos: Vec3,
    footprint: CameraFootprint,
    fitData?: IShadowCameraFitData
): boolean {
    let [hitLt, hitRt, hitLb, hitRb] = footprint;

    if (!hitLt || !hitRt || !hitLb || !hitRb) {
        return false;
    }

    let planet = camera.planet;
    let corners = [hitLt, hitRt, hitRb, hitLb];
    let footprintCenter = getAveragePoint(corners);

    let terrainCenter = new Vec3();
    if (planet.getCartesianTerrainPoint(footprintCenter, terrainCenter) !== undefined) {
        footprintCenter = terrainCenter;
    }

    let footprintPoints = [...corners, footprintCenter];
    let sunDirection = sunPos.normal().scale(-1.0);
    let cameraPosition = footprintCenter.sub(sunDirection.scaleTo(SHADOW_FOOTPRINT_TEST_DISTANCE));
    let lightUp = getStableLightUp(planet.ellipsoid, sunDirection, footprintCenter);

    camera.set(cameraPosition, footprintCenter, lightUp);
    camera.update();

    let casterBoundsPoints = getCasterBoundsPoints(planet, footprintPoints);
    let lightSpaceBounds = getLightSpaceBounds(camera, casterBoundsPoints);

    if (
        !Number.isFinite(lightSpaceBounds.minX) ||
        !Number.isFinite(lightSpaceBounds.maxX) ||
        !Number.isFinite(lightSpaceBounds.minY) ||
        !Number.isFinite(lightSpaceBounds.maxY) ||
        !Number.isFinite(lightSpaceBounds.minZ) ||
        !Number.isFinite(lightSpaceBounds.maxZ) ||
        lightSpaceBounds.maxX <= lightSpaceBounds.minX ||
        lightSpaceBounds.maxY <= lightSpaceBounds.minY ||
        lightSpaceBounds.maxZ <= lightSpaceBounds.minZ
    ) {
        return false;
    }

    let textureWidth = camera.width;
    let textureHeight = camera.height;
    let expandedLightSpaceBounds = getCasterExpandedLightSpaceBounds(lightSpaceBounds, textureWidth, textureHeight);
    let snappedLightSpaceBounds = getSnappedLightSpaceBounds(
        camera,
        expandedLightSpaceBounds,
        textureWidth,
        textureHeight
    );

    let originalNear = snappedLightSpaceBounds.minZ - SHADOW_CASTER_DEPTH_PADDING;
    let originalFar = snappedLightSpaceBounds.maxZ + SHADOW_RECEIVER_DEPTH_PADDING;

    let depthShift = originalNear - SHADOW_NEAR;

    let cameraForwardShift = depthShift - SHADOW_SUNWARD_CAMERA_OFFSET;

    let shiftedLightSpaceBounds = {
        minX: snappedLightSpaceBounds.minX,
        maxX: snappedLightSpaceBounds.maxX,
        minY: snappedLightSpaceBounds.minY,
        maxY: snappedLightSpaceBounds.maxY,
        minZ: snappedLightSpaceBounds.minZ - cameraForwardShift,
        maxZ: snappedLightSpaceBounds.maxZ - cameraForwardShift
    };

    let near = SHADOW_NEAR;
    let far = originalFar - cameraForwardShift;

    let cameraForward = camera.getForward();
    let cameraLook = footprintCenter.add(cameraForward.scaleTo(cameraForwardShift));
    cameraPosition = camera.eye.add(cameraForward.scaleTo(cameraForwardShift));
    camera.set(cameraPosition, cameraLook, lightUp);
    camera.update();

    let altitudeClamp = clampShadowCameraAltitude(camera, cameraLook, lightUp);

    if (altitudeClamp.offset.length2() > 0.0) {
        let altitudeClampX = altitudeClamp.offset.dot(camera.getRight());
        let altitudeClampY = altitudeClamp.offset.dot(camera.getUp());
        let altitudeClampZ = altitudeClamp.offset.dot(camera.getForward());

        shiftedLightSpaceBounds = {
            minX: shiftedLightSpaceBounds.minX - altitudeClampX,
            maxX: shiftedLightSpaceBounds.maxX - altitudeClampX,
            minY: shiftedLightSpaceBounds.minY - altitudeClampY,
            maxY: shiftedLightSpaceBounds.maxY - altitudeClampY,
            minZ: shiftedLightSpaceBounds.minZ - altitudeClampZ,
            maxZ: shiftedLightSpaceBounds.maxZ - altitudeClampZ
        };
        far = Math.max(near + 1.0, far - altitudeClampZ);
        cameraPosition = camera.eye.clone();
    }

    camera.frustum.setOrthoProjection(
        shiftedLightSpaceBounds.minX,
        shiftedLightSpaceBounds.maxX,
        shiftedLightSpaceBounds.minY,
        shiftedLightSpaceBounds.maxY,
        near,
        far
    );
    camera.update();

    if (fitData) {
        fitData.footprintCenter = footprintCenter;
        fitData.sunDirection = sunDirection;
        fitData.cameraPosition = cameraPosition;
        fitData.bounds = shiftedLightSpaceBounds;
        fitData.originalBounds = lightSpaceBounds;
        fitData.textureWidth = textureWidth;
        fitData.textureHeight = textureHeight;
        fitData.orthoWidth = shiftedLightSpaceBounds.maxX - shiftedLightSpaceBounds.minX;
        fitData.orthoHeight = shiftedLightSpaceBounds.maxY - shiftedLightSpaceBounds.minY;
        fitData.referenceTexelSizeX = expandedLightSpaceBounds.tightWidth / SHADOW_REFERENCE_TEXTURE_SIZE;
        fitData.referenceTexelSizeY = expandedLightSpaceBounds.tightHeight / SHADOW_REFERENCE_TEXTURE_SIZE;
        fitData.casterMarginX = expandedLightSpaceBounds.casterMarginX;
        fitData.casterMarginY = expandedLightSpaceBounds.casterMarginY;
        fitData.originalNear = originalNear;
        fitData.originalFar = originalFar;
        fitData.near = near;
        fitData.far = far;
        fitData.depthShift = depthShift;
        fitData.cameraForwardShift = cameraForwardShift;
        fitData.altitudeClamp = altitudeClamp;
    }

    return true;
}
