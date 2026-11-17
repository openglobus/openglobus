import { Extent } from "../../Extent";
import { LonLat } from "../../LonLat";
import type { Entity } from "../../entity/Entity";
import type { CubeProj } from "../../proj/cube";
import type { Planet } from "../../scene/Planet";
import { EntityCollectionNode } from "../EntityCollectionNode";
import type { CubeEntityCollectionsTreeStrategy } from "./CubeEntityCollectionsTreeStrategy";

/**
 * Node of the entity collections tree on a cube face, its extent is in the face coordinates as the planet tiles.
 * @class
 */
export class CubeEntityCollectionNode extends EntityCollectionNode {
    public override strategy: CubeEntityCollectionsTreeStrategy;

    constructor(
        strategy: CubeEntityCollectionsTreeStrategy,
        partId: number,
        parent: CubeEntityCollectionNode | null,
        extent: Extent,
        planet: Planet,
        zoom: number
    ) {
        super(strategy, partId, parent, extent, planet, zoom);
        this.strategy = strategy;
    }

    protected get _projection(): CubeProj {
        return this.strategy.quadTreeStrategy.projection as CubeProj;
    }

    // The corners, the middles of the sides and the point nearest to the face center, a face bulges there
    protected override _setExtentBounds() {
        const ellipsoid = this.layer._planet!.ellipsoid,
            proj = this._projection,
            { southWest: sw, northEast: ne } = this.extent,
            face = Math.floor(sw.lon),
            centerLon = Math.min(Math.max(face + 0.5, sw.lon), ne.lon),
            centerLat = Math.min(Math.max(0.5, sw.lat), ne.lat);

        const bounds: [number, number, number, number, number, number] = [
            Infinity,
            Infinity,
            Infinity,
            -Infinity,
            -Infinity,
            -Infinity
        ];

        for (const lat of [sw.lat, centerLat, ne.lat]) {
            for (const lon of [sw.lon, centerLon, ne.lon]) {
                const v = ellipsoid.lonLatToCartesian(proj.toLonLat(lon, lat, face));
                bounds[0] = Math.min(bounds[0], v.x);
                bounds[1] = Math.min(bounds[1], v.y);
                bounds[2] = Math.min(bounds[2], v.z);
                bounds[3] = Math.max(bounds[3], v.x);
                bounds[4] = Math.max(bounds[4], v.y);
                bounds[5] = Math.max(bounds[5], v.z);
            }
        }

        this.bsphere.setFromBounds(bounds);
    }

    // Returns the position of the entity on the cube: the face plus the position on it, as of the planet tiles
    public override __setLonLat__(entity: Entity): LonLat {
        if (entity._lonLat.isZero() && !entity._cartesian.isZero()) {
            entity._lonLat = this.layer._planet!.ellipsoid.cartesianToLonLat(entity._cartesian);
        }
        return this._projection.fromLonLat(entity._lonLat);
    }

    public override isInside(entity: Entity): boolean {
        return this.extent.isInside(this._projection.fromLonLat(entity._lonLat));
    }
}
