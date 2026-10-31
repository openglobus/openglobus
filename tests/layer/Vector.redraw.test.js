import { Vector } from "../../src/layer/Vector";
import { GeometryHandler } from "../../src/entity/geometry/GeometryHandler";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { NOTRENDERING, RENDERING } from "../../src/quadTree/quadTree";

const texture = { name: "previous texture" };
const pickingMask = { name: "previous picking mask" };

test("Vector.applyMaterial keeps showing the previous texture while a tile is redrawn", () => {
    const vector = new Vector("name", {});
    vector.loadMaterial = vi.fn();
    const material = {
        isReady: false,
        isLoading: true,
        _updateTexture: texture,
        _updatePickingMask: pickingMask,
        segment: { tileZoom: 5 },
        texOffset: [0.5, 0.5, 0.25, 0.25]
    };

    expect(vector.applyMaterial(material)).toEqual([0, 0, 1, 1]);
    expect(material.texture).toBe(texture);
    expect(material.pickingMask).toBe(pickingMask);
    expect(vector.loadMaterial).not.toHaveBeenCalled();

    material.isLoading = false;
    vector.applyMaterial(material);
    expect(vector.loadMaterial).toHaveBeenCalledWith(material);
});

test("Removing a geometry keeps the texture of rendered tiles and clears the others", () => {
    const layer = { __id: 7, clearMaterial: vi.fn() };
    const handler = new GeometryHandler(layer);
    const tileExtent = new Extent(new LonLat(0, 0), new LonLat(10, 10));

    const makeNode = (state) => {
        const node = { ready: false, nodes: [], getState: () => state };
        const material = { isReady: true, pickingReady: true, texture, pickingMask, layer };
        material.segment = { node };
        node.segment = { materials: { 7: material }, getExtentLonLat: () => tileExtent };
        return { node, material };
    };
    const rendered = makeNode(RENDERING);
    const hidden = makeNode(NOTRENDERING);
    const root = { ready: true, nodes: [rendered.node, hidden.node] };

    handler._refreshRecursevelyExt(new Extent(new LonLat(1, 1), new LonLat(2, 2)), root);

    expect(rendered.material.isReady).toBe(false);
    expect(rendered.material.pickingReady).toBe(false);
    expect(rendered.material._updateTexture).toBe(texture);
    expect(rendered.material._updatePickingMask).toBe(pickingMask);
    expect(layer.clearMaterial).toHaveBeenCalledTimes(1);
    expect(layer.clearMaterial).toHaveBeenCalledWith(hidden.material);
});
