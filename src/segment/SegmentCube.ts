import { Entity } from "../entity/Entity";
import { Extent } from "../Extent";
import { Layer } from "../layer/Layer";
import { LonLat } from "../LonLat";
import { CUBE_BOTTOM, CUBE_OPSIDE, CUBE_TOP } from "../proj/cube";
import type { CubeProj } from "../proj/cube";
import { Vec3 } from "../math/Vec3";
import { PlanetCamera } from "../camera/PlanetCamera";
import { Node } from "../quadTree/Node";
import { E, N, S, W } from "../quadTree/quadTree";
import { QuadTreeStrategy } from "../quadTree";
import { Segment } from "./Segment";

/**
 * Planet segment of a cube face. Its extent is in the native coordinates of the cube, see proj/cube.
 * @class
 * @extends {Segment}
 */
class SegmentCube extends Segment {
    public override _projection: CubeProj;

    constructor(node: Node, quadTreeStrategy: QuadTreeStrategy, tileZoom: number, extent: Extent) {
        super(node, quadTreeStrategy, tileZoom, extent);
        this._projection = quadTreeStrategy.projection as CubeProj;
    }

    /**
     * Returns the geodetic coordinates of the native point.
     * @public
     * @param {number} lon - Native longitude.
     * @param {number} lat - Native latitude.
     * @returns {LonLat} -
     */
    public getLonLat(lon: number, lat: number): LonLat {
        return this._projection.toLonLat(lon, lat, this.tileGroup);
    }

    protected override _assignTileIndexes() {
        const e = this._extent,
            face = Math.floor(e.getCenter().lon);

        this.tileGroup = face;
        this.tileX = Math.round((e.southWest.lon - face) / e.getWidth());
        this.tileY = Math.round((1.0 - e.northEast.lat) / e.getHeight());
        this.tileIndex = Layer.getTileIndex(this.tileX, this.tileY, this.tileZoom, face);

        const x = this.tileX,
            y = this.tileY,
            last = this.powTileZoom - 1;

        this.opside =
            CUBE_OPSIDE[face][
                (y === 0 ? 1 << N : 0) | (x === last ? 1 << E : 0) | (y === last ? 1 << S : 0) | (x === 0 ? 1 << W : 0)
            ];
    }

    /**
     * The points of the extent that reach the farthest in any direction: its corners and the ones that are the
     * closest to the center of the face.
     */
    protected _getExtremePoints(): LonLat[] {
        const e = this._extent,
            west = e.southWest.lon,
            south = e.southWest.lat,
            east = e.northEast.lon,
            north = e.northEast.lat,
            centerLon = Math.min(Math.max(this.tileGroup + 0.5, west), east),
            centerLat = Math.min(Math.max(0.5, south), north),
            points = [];

        for (const lat of [south, centerLat, north]) {
            for (const lon of [west, centerLon, east]) {
                points.push(new LonLat(lon, lat));
            }
        }

        return points;
    }

    /**
     * The lon lat rectangle around the tile. An extent can't wrap, so the tile with a pole or on the antimeridian
     * takes all the longitudes.
     */
    public override _setExtentLonLat() {
        let lonMin = 180,
            lonMax = -180,
            latMin = 90,
            latMax = -90;

        for (const p of this._getExtremePoints()) {
            const ll = this.getLonLat(p.lon, p.lat);
            lonMin = Math.min(lonMin, ll.lon);
            lonMax = Math.max(lonMax, ll.lon);
            latMin = Math.min(latMin, ll.lat);
            latMax = Math.max(latMax, ll.lat);
        }

        const face = this.tileGroup,
            e = this._extent,
            hasPole =
                (face === CUBE_TOP || face === CUBE_BOTTOM) &&
                e.southWest.lon <= face + 0.5 &&
                e.northEast.lon >= face + 0.5 &&
                e.southWest.lat <= 0.5 &&
                e.northEast.lat >= 0.5;

        if (hasPole || lonMax - lonMin > 180) {
            lonMin = -180;
            lonMax = 180;
        }

        this._extentLonLat = new Extent(new LonLat(lonMin, latMin), new LonLat(lonMax, latMax));
    }

    public override projectNative(lonLat: LonLat): LonLat {
        return this._projection.fromLonLat(lonLat);
    }

    public override getInsideLonLat(obj: Entity | PlanetCamera): LonLat {
        return this._projection.fromLonLat(obj._lonLat);
    }

    public override isLonLatInside(lonLat: LonLat): boolean {
        return this._extent.isInside(this._projection.fromLonLat(lonLat));
    }

    protected override _projToDeg(lon: number, lat: number): LonLat {
        return this.getLonLat(lon, lat);
    }

    protected override _getExtentCorners(): [Vec3, Vec3, Vec3, Vec3] {
        const e = this.planet.ellipsoid,
            sw = this._extent.southWest,
            ne = this._extent.northEast;

        return [
            e.lonLatToCartesian(this.getLonLat(sw.lon, sw.lat)),
            e.lonLatToCartesian(this.getLonLat(sw.lon, ne.lat)),
            e.lonLatToCartesian(this.getLonLat(ne.lon, ne.lat)),
            e.lonLatToCartesian(this.getLonLat(ne.lon, sw.lat))
        ];
    }

    public override createBoundsByExtent() {
        this._createExtentNormals();

        const e = this.planet.ellipsoid,
            min = new Vec3(Infinity, Infinity, Infinity),
            max = new Vec3(-Infinity, -Infinity, -Infinity);

        for (const p of this._getExtremePoints()) {
            const v = e.lonLatToCartesian(this.getLonLat(p.lon, p.lat));
            min.set(Math.min(min.x, v.x), Math.min(min.y, v.y), Math.min(min.z, v.z));
            max.set(Math.max(max.x, v.x), Math.max(max.y, v.y), Math.max(max.z, v.z));
        }

        this.setBoundingVolume3v(min, max);
    }

    public override layerOverlap(layer: Layer): boolean {
        return this._extentLonLat.overlaps(layer._extent);
    }

    // The night and specular textures are in the Web Mercator
    protected override _assignGlobalTextureCoordinates() {}
}

export { SegmentCube };
