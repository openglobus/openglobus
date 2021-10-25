import { EntityCollectionNode, EntityCollectionNodeWGS84 } from '../../src/og/quadTree/EntityCollectionNode';


describe('EntityCollectionNode class', () => {
    test('EntityCollectionNode', () => {
        const item = new EntityCollectionNode();
        expect(item).toBeTruthy();
        expect(item.buildTree).toBeTruthy();
        expect(item.renderCollection).toBeTruthy();
    });
    test('EntityCollectionNodeWGS84', () => {
        const item = new EntityCollectionNodeWGS84(3);
        expect(item).toBeTruthy();
        expect(item.layer).toBe(3);
        expect(item.buildTree).toBeTruthy();
        expect(item.renderCollection).toBeTruthy();
    });
});
