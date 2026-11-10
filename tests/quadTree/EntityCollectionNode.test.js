import { Extent } from "../../src/Extent";
import { Vec3 } from "../../src/math/Vec3";
import { wgs84 } from "../../src/ellipsoid/wgs84";

describe("EntityCollectionNode class", () => {
    const strategy = {
        _layer: {
            _nodeCapacity: 64
        }
    };

    test("EntityCollectionNode", async () => {
        const { EntityCollectionNode } = await import("../../src/quadTree/EntityCollectionNode");

        const item = new EntityCollectionNode(strategy, 0, null, Extent.createFromArray([-1, -1, 1, 1]), null, 0);
        expect(item).toBeTruthy();
        expect(item.buildTree).toBeTruthy();
        expect(item.renderCollection).toBeTruthy();
    }, 10000);
});

describe("EntityCollectionNode.alignEntityToTheGround", () => {
    const GROUND = new Vec3(1, 2, 3);

    async function align(renderVertices) {
        const { EntityCollectionNode } = await import("../../src/quadTree/EntityCollectionNode");
        const node = new EntityCollectionNode(
            { _layer: { _nodeCapacity: 64, relativeToGround: false, _planet: { ellipsoid: wgs84 } } },
            0,
            null,
            Extent.createFromArray([-1, -1, 1, 1]),
            null,
            0
        );
        const entity = { _altitude: 0, _setCartesian3vSilent: vi.fn() };
        const segment = { renderVertices, getEntityTerrainPoint: vi.fn((e, res) => res.copy(GROUND)) };

        node.alignEntityToTheGround(entity, segment);

        return entity._setCartesian3vSilent;
    }

    test("puts the entity on the terrain of the tile", async () => {
        expect(await align([0, 0, 0])).toHaveBeenCalledWith(GROUND);
    });

    test("a tile with no terrain yet keeps the entity where it is", async () => {
        expect(await align(null)).not.toHaveBeenCalled();
        expect(await align([])).not.toHaveBeenCalled();
    });
});
