import { EntityCollection } from "../../src/entity/EntityCollection";
import { Polyline } from "../../src/entity/polyline/Polyline";

const makePaths = () => [
    [[0, 0, 0], [1, 0, 0]],
    [[0, 1, 0], [1, 1, 0]]
];

test("Polyline keeps all segments in one batch renderer selected by polyline opacity", () => {
    const entityCollection = new EntityCollection();
    const handler = entityCollection.polylineHandler;

    const polyline = new Polyline({
        path3v: makePaths(),
        pathColors: [
            [[1, 0, 0, 1], [1, 0, 0, 1]],
            [[0, 1, 0, 0.5], [0, 1, 0, 0.5]]
        ]
    });

    handler.add(polyline);

    expect(polyline._batchRenderer).toBe(handler._opaqueRenderer);
    expect(polyline._batchRendererIndexes).toEqual([0, 1]);
    expect(handler._opaqueRenderer._path3v.length).toBe(2);
    expect(handler._transparentRenderer._path3v.length).toBe(0);
});

test("Polyline moves between renderers when polyline opacity changes", () => {
    const entityCollection = new EntityCollection();
    const handler = entityCollection.polylineHandler;

    const polyline = new Polyline({
        path3v: makePaths(),
        pathColors: [
            [[1, 0, 0, 1], [1, 0, 0, 1]],
            [[0, 1, 0, 0.25], [0, 1, 0, 0.25]]
        ]
    });

    handler.add(polyline);
    expect(polyline._batchRenderer).toBe(handler._opaqueRenderer);
    expect(handler._opaqueRenderer._path3v.length).toBe(2);
    expect(handler._transparentRenderer._path3v.length).toBe(0);

    polyline.setOpacity(0.4);
    expect(polyline._batchRenderer).toBe(handler._transparentRenderer);
    expect(polyline._batchRendererIndexes).toEqual([0, 1]);
    expect(handler._opaqueRenderer._path3v.length).toBe(0);
    expect(handler._transparentRenderer._path3v.length).toBe(2);

    polyline.setOpacity(1.0);
    expect(polyline._batchRenderer).toBe(handler._opaqueRenderer);
    expect(polyline._batchRendererIndexes).toEqual([0, 1]);
    expect(handler._transparentRenderer._path3v.length).toBe(0);
    expect(handler._opaqueRenderer._path3v.length).toBe(2);
});

test("Single segment with 3 points stays visible after setPathColors with alpha", () => {
    const entityCollection = new EntityCollection();
    const handler = entityCollection.polylineHandler;

    const polyline = new Polyline({
        path3v: [
            [[0, 0, 0], [1, 0, 0], [2, 0, 0]]
        ],
        pathColors: [
            [[1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1]]
        ]
    });

    handler.add(polyline);
    expect(handler._opaqueRenderer._path3v.length).toBe(1);
    expect(handler._transparentRenderer._path3v.length).toBe(0);

    polyline.setPathColors([[1, 0, 0, 1], [0, 1, 0, 1], [1, 1, 1, 0.6]], 0);

    expect(polyline._batchRenderer).toBe(handler._opaqueRenderer);
    expect(polyline._batchRendererIndexes.length).toBe(1);
    expect(polyline._batchRendererIndexes[0]).toBe(0);
    expect(handler._opaqueRenderer._path3v.length).toBe(1);
    expect(handler._transparentRenderer._path3v.length).toBe(0);
    expect(handler._opaqueRenderer._path3v[0].length).toBe(3);
});
