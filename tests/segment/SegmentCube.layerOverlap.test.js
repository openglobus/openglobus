import { describe, expect, test } from "vitest";
import { Extent } from "../../src/Extent";
import { CUBE_BACK } from "../../src/proj/cube";
import { CubeQuadTreeStrategy, EquiangularCubeQuadTreeStrategy } from "../../src/quadTree/cube/CubeQuadTreeStrategy";
import { createStrategy } from "../quadTree/quadTreeScene";

// The tile x, y of the zoom on the face, the parts go NW, NE, SW, SE
function tileAt(qts, face, zoom, x, y) {
    let node = qts.quadTreeList[face];
    for (let z = zoom - 1; z >= 0; z--) {
        node.createChildNodes();
        node = node.nodes[(((y >> z) & 1) << 1) | ((x >> z) & 1)];
    }
    return node.segment;
}

describe.each([
    ["gnomonic", CubeQuadTreeStrategy],
    ["equiangular", EquiangularCubeQuadTreeStrategy]
])("a layer over the antimeridian on the %s cube", (_, Strategy) => {
    // The longitudes go on over 180, as the corners of a geo image over the antimeridian
    const layer = { _extent: Extent.createFromArray([165, -10, 195, 10]) };

    test("meets the tiles on both sides of it", () => {
        const qts = createStrategy(Strategy);

        // The back face is from 135 to 225 degrees of longitude on the equator, the antimeridian goes in its middle
        for (const x of [6, 7, 8, 9]) {
            const segment = tileAt(qts, CUBE_BACK, 4, x, 7);
            expect(segment.layerOverlap(layer)).toBe(true);
        }
    });

    test("does not meet the tiles far from it", () => {
        const qts = createStrategy(Strategy);

        for (const x of [0, 15]) {
            expect(tileAt(qts, CUBE_BACK, 4, x, 7).layerOverlap(layer)).toBe(false);
        }
    });
});
