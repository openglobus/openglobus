import { Vector } from "../../src/layer/Vector";
import { GeometryHandler } from "../../src/entity/geometry/GeometryHandler";
import { Extent } from "../../src/Extent";
import { LonLat } from "../../src/LonLat";
import { Node } from "../../src/quadTree/Node";
import { NOTRENDERING, RENDERING, WALKTHROUGH } from "../../src/quadTree/quadTree";

const texture = { name: "previous texture" };
const pickingMask = { name: "previous picking mask" };
const tileExtent = new Extent(new LonLat(0, 0), new LonLat(10, 10));
const fadingNodes = new Map();
const quadTreeStrategy = { _fadingNodes: fadingNodes };

let nodeId = 0;

// A tree node with the real visibility checks of Node
const makeTreeNode = (state, fading = false) => {
    const node = Object.create(Node.prototype);
    Object.assign(node, { __id: nodeId++, quadTreeStrategy, ready: false, nodes: [], getState: () => state });
    node.segment = { getExtentLonLat: () => tileExtent };
    fading && fadingNodes.set(node.__id, node);
    return node;
};

afterEach(() => {
    fadingNodes.clear();
});

test("Vector.applyMaterial keeps showing the previous texture while a tile is redrawn", () => {
    const vector = new Vector("name", {});
    vector.loadMaterial = vi.fn();
    const material = {
        isReady: false,
        isLoading: true,
        textureExists: true,
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

    const makeNode = (state) => {
        const node = makeTreeNode(state);
        const material = { isReady: true, pickingReady: true, textureExists: true, texture, pickingMask, layer };
        material.segment = { node };
        node.segment.materials = { 7: material };
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

test("Vector.applyMaterial uses the parent path for a tile without its own texture", () => {
    const vector = new Vector("name", {});
    const base = vi.spyOn(Object.getPrototypeOf(Vector.prototype), "applyMaterial").mockReturnValue("parent path");
    const material = {
        isReady: false,
        isLoading: true,
        textureExists: false,
        _updateTexture: texture,
        segment: { tileZoom: 5 },
        texOffset: [0.5, 0.5, 0.25, 0.25]
    };

    expect(vector.applyMaterial(material)).toBe("parent path");
    expect(material.texture).toBeUndefined();
    base.mockRestore();
});

test("Removing a geometry clears a tile that shows a parent texture", () => {
    const layer = { __id: 7, clearMaterial: vi.fn() };
    const handler = new GeometryHandler(layer);
    const node = makeTreeNode(RENDERING);
    const material = { isReady: true, textureExists: false, texture, layer, segment: { node } };
    node.segment.materials = { 7: material };

    handler._refreshRecursevelyExt(new Extent(new LonLat(1, 1), new LonLat(2, 2)), { ready: true, nodes: [node] });

    expect(layer.clearMaterial).toHaveBeenCalledWith(material);
    expect(material._updateTexture).toBeUndefined();
});

test("Vector.clearMaterial releases the previous texture of a tile that is being redrawn", () => {
    const vector = new Vector("name", {});
    const gl = { deleteTexture: vi.fn() };
    const material = {
        isReady: false,
        isLoading: false,
        textureExists: true,
        texture,
        pickingMask,
        _updateTexture: texture,
        _updatePickingMask: pickingMask,
        segment: { handler: { gl } }
    };

    vector.clearMaterial(material);

    expect(gl.deleteTexture).toHaveBeenCalledTimes(2);
    expect(gl.deleteTexture).toHaveBeenCalledWith(texture);
    expect(gl.deleteTexture).toHaveBeenCalledWith(pickingMask);
    expect(material.texture).toBe(null);
    expect(material._updateTexture).toBe(null);
    expect(material.textureExists).toBe(false);
});

test("Changing a geometry keeps the texture of fading tiles", () => {
    const layer = { __id: 7, _id: 7, clearMaterial: vi.fn() };
    const handler = new GeometryHandler(layer);

    const makeNode = (state, fading) => {
        const node = makeTreeNode(state, fading);
        const material = { isReady: true, pickingReady: true, textureExists: true, texture, pickingMask, layer };
        material.segment = { node };
        node.segment.materials = { 7: material };
        return { node, material };
    };
    // A parent fading out after zooming in, and a child fading out after zooming out
    const fadingParent = makeNode(WALKTHROUGH, true);
    const fadingChild = makeNode(NOTRENDERING, true);
    const hidden = makeNode(NOTRENDERING, false);
    const root = { ready: true, nodes: [fadingParent.node, fadingChild.node, hidden.node] };

    handler._refreshRecursevelyExt(new Extent(new LonLat(1, 1), new LonLat(2, 2)), root);

    for (const { material } of [fadingParent, fadingChild]) {
        expect(material.isReady).toBe(false);
        expect(material._updateTexture).toBe(texture);
        expect(material._updatePickingMask).toBe(pickingMask);
    }
    expect(layer.clearMaterial).toHaveBeenCalledTimes(1);
    expect(layer.clearMaterial).toHaveBeenCalledWith(hidden.material);

    layer.clearMaterial.mockClear();
    const geometry = { overlaps: () => true, _pickingReady: true };
    const updated = makeNode(NOTRENDERING, true);
    handler._refreshRecursevely(geometry, { ready: true, nodes: [updated.node] });

    expect(layer.clearMaterial).not.toHaveBeenCalled();
    expect(updated.material._updateTexture).toBe(texture);
});
