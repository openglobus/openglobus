import { EntityCollectionNode } from '../../src/quadTree/EntityCollectionNode';
import { EntityCollectionsTreeStrategy } from "../../src/quadTree/EntityCollectionsTreeStrategy";
import { Vector } from "../../src/layer/Vector";

describe('EntityCollectionNode class', () => {

    let layer = new Vector();

    let strategy = new EntityCollectionsTreeStrategy(layer);

    test('EntityCollectionNode', () => {
        const item = new EntityCollectionNode(strategy);
        expect(item).toBeTruthy();
        expect(item.buildTree).toBeTruthy();
        expect(item.renderCollection).toBeTruthy();
    });
});
