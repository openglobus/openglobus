import { Extent } from "../../src/Extent";

describe('EntityCollectionNode class', () => {
    const strategy = {
        _layer: {
            _nodeCapacity: 64
        }
    };

    test('EntityCollectionNode', async () => {
        const { EntityCollectionNode } = await import("../../src/quadTree/EntityCollectionNode");

        const item = new EntityCollectionNode(
            strategy,
            0,
            null,
            Extent.createFromArray([-1, -1, 1, 1]),
            null,
            0
        );
        expect(item).toBeTruthy();
        expect(item.buildTree).toBeTruthy();
        expect(item.renderCollection).toBeTruthy();
    });
});
