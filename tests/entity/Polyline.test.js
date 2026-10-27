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

test("getColorHTML and getColor4v return a single HTML color", () => {
    const polyline = new Polyline({ path3v: makePaths(), color: "red" });

    expect(polyline.getColorHTML()).toBe("red");

    const color = polyline.getColor4v();
    expect(color.x).toBeCloseTo(1);
    expect(color.y).toBeCloseTo(0);
    expect(color.z).toBeCloseTo(0);
    expect(color.w).toBeCloseTo(1);
});

test("getColorHTML and getColor4v return an indexed color from a color array", () => {
    const polyline = new Polyline({ path3v: makePaths(), color: ["white", "green"] });

    expect(polyline.getColorHTML(0)).toBe("white");
    expect(polyline.getColorHTML(1)).toBe("green");

    const green = polyline.getColor4v(1);
    expect(green.x).toBeCloseTo(0);
    expect(green.y).toBeCloseTo(128 / 255);
    expect(green.z).toBeCloseTo(0);
    expect(green.w).toBeCloseTo(1);
});

test("getColorHTML and getColor4v fall back to the first color for an unset segment", () => {
    const polyline = new Polyline({ path3v: makePaths(), color: ["white", "green"] });

    expect(polyline.getColorHTML(7)).toBe("white");
    expect(polyline.getColorHTML()).toBe(polyline.getColorHTML(0));

    const fallback = polyline.getColor4v(7);
    expect(fallback.x).toBeCloseTo(1);
    expect(fallback.y).toBeCloseTo(1);
    expect(fallback.z).toBeCloseTo(1);
    expect(fallback.w).toBeCloseTo(1);
});

test("getColorHTML and getColor4v return undefined when no color is configured", () => {
    const polyline = new Polyline({ path3v: makePaths() });

    expect(polyline.getColorHTML()).toBeUndefined();
    expect(polyline.getColorHTML(3)).toBeUndefined();
    expect(polyline.getColor4v()).toBeUndefined();
    expect(polyline.getColor4v(3)).toBeUndefined();
});

test("getColor4v returns correct RGB and the alpha encoded in the color", () => {
    const polyline = new Polyline({ path3v: makePaths(), color: "rgba(255,128,0,0.25)" });

    const color = polyline.getColor4v();
    expect(color.x).toBeCloseTo(1);
    expect(color.y).toBeCloseTo(128 / 255);
    expect(color.z).toBeCloseTo(0);
    expect(color.w).toBeCloseTo(0.25);
});

test("getColor4v does not apply Polyline opacity", () => {
    const entityCollection = new EntityCollection();
    const handler = entityCollection.polylineHandler;

    const polyline = new Polyline({
        path3v: makePaths(),
        color: "rgba(255,128,0,0.5)",
        opacity: 0.25
    });

    handler.add(polyline);

    expect(polyline.getOpacity()).toBe(0.25);
    expect(polyline.getColor4v().w).toBeCloseTo(0.5);

    polyline.setOpacity(1.0);
    expect(polyline.getColor4v().w).toBeCloseTo(0.5);

    const opaqueColored = new Polyline({ path3v: makePaths(), color: "red", opacity: 0.3 });
    expect(opaqueColored.getColor4v().w).toBeCloseTo(1);
});
