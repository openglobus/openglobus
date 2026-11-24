import { Segment } from "../../src/segment/Segment";

// What Segment.elevationsNotExists does with the mesh, parents are the terrainExists of the parents from the nearest
function createSegment(tileZoom, parents) {
    let parentNode = null;
    for (let i = parents.length - 1; i >= 0; i--) {
        parentNode = { segment: { terrainExists: parents[i] }, parentNode };
    }

    // The parent mesh whileTerrainLoading has applied, 2x2 cells
    const mesh = new Float64Array(27),
        plain = new Float64Array(27);

    return {
        planet: {
            terrain: { plainGridSize: 2, maxNativeZoom: 14 },
            _normalMapCreator: { queue: vi.fn() },
            _plainSegmentWorker: { make: vi.fn() }
        },
        tileZoom,
        plainReady: true,
        terrainIsLoading: true,
        node: { nodeId: 5, equalizedSideWithNodeId: [], parentNode },
        terrainVertices: mesh,
        renderVertices: mesh,
        plainVertices: plain,
        plainVerticesHigh: new Float32Array(27),
        plainVerticesLow: new Float32Array(27),
        plainNormals: new Float32Array(27),
        normalMapNormals: null,
        lodCenter: { copy: () => {} },
        _deleteSkirtBuffers: () => {}
    };
}

test.each([3, 14, 20])(
    "a segment of the zoom %s with no elevations keeps the mesh of the nearest parent with them, maxNativeZoom 14",
    (tileZoom) => {
        const seg = createSegment(tileZoom, [false, true]),
            mesh = seg.renderVertices;

        Segment.prototype.elevationsNotExists.call(seg);

        expect(seg.renderVertices).toBe(mesh);
        expect(seg.terrainVertices).toBe(mesh);
        expect(seg.terrainReady).toBe(true);
        expect(seg.passReady).toBe(true);
        expect(seg.terrainExists).toBe(false);
        expect(seg.terrainIsLoading).toBe(false);
        // The normal map is the parent one
        expect(seg.planet._normalMapCreator.queue).not.toHaveBeenCalled();
    }
);

test.each([
    ["no parent", []],
    ["no parent with elevations", [false, false]]
])("a segment with %s is plain, on any zoom", (_, parents) => {
    const seg = createSegment(20, parents);

    Segment.prototype.elevationsNotExists.call(seg);

    expect(seg.renderVertices).toBe(seg.plainVertices);
    expect(seg.terrainVertices).toBe(seg.plainVertices);
    expect(seg.terrainReady).toBe(true);
    expect(seg.terrainExists).toBe(false);
    expect(seg.planet._normalMapCreator.queue).toHaveBeenCalledWith(seg);
});
