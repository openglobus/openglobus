import { describe, test, expect } from "vitest";
import { collectMemoryReport } from "./memoryReport.js";

const FILE_VERTICES = 257 * 257,
    MESH_VERTICES = 65 * 65;

function createNode(segment, nodes = []) {
    return {
        segment,
        traverseTree(callback) {
            callback(this);
            nodes.forEach((n) => n.traverseTree(callback));
        }
    };
}

function createIndexesCache(maxLog2, buffers) {
    const n = maxLog2 + 1,
        level = (depth) => Array.from({ length: n }, () => (depth === 4 ? { buffer: null } : level(depth + 1))),
        cache = level(0);
    for (const [i, j, k, m, q, numItems] of buffers) {
        cache[i][j][k][m][q].buffer = { numItems, itemSize: 1 };
    }
    return cache;
}

function createPlanet() {
    const terrainVertices = new Float64Array(MESH_VERTICES * 3);

    const withTerrain = {
        terrainExists: true,
        terrainVertices,
        terrainVerticesHigh: new Float32Array(MESH_VERTICES * 3),
        terrainVerticesLow: new Float32Array(MESH_VERTICES * 3),
        // The same array as terrainVertices, counted once
        renderVertices: terrainVertices,
        normalMapVertices: new Float64Array(FILE_VERTICES * 3),
        normalMapNormals: new Float32Array(FILE_VERTICES * 3),
        elevationData: new Float32Array(FILE_VERTICES),
        vertexPositionBufferHigh: { numItems: MESH_VERTICES, itemSize: 3 },
        vertexPositionBufferLow: { numItems: MESH_VERTICES, itemSize: 3 },
        normalMapTexturePtr: {},
        materials: { 3: { textureExists: true, texture: {} }, 4: { textureExists: true, texture: { default: true } } }
    };

    const waiting = {
        terrainExists: false,
        plainReady: true,
        plainVertices: new Float64Array(MESH_VERTICES * 3),
        normalMapVertices: new Float64Array(FILE_VERTICES * 3),
        normalMapNormals: new Float32Array(FILE_VERTICES * 3),
        materials: []
    };

    // A loaded tile with its 4 level tiles in one buffer
    const heights = new Float32Array(FILE_VERTICES * 5),
        cache = {};
    for (let k = 0; k < 5; k++) {
        cache[`tile${k}`] = { heights: heights.subarray(k * FILE_VERTICES, (k + 1) * FILE_VERTICES) };
    }

    return {
        _createdNodesCount: 2,
        quadTreeStrategy: {
            _renderedNodes: [],
            _quadTreeList: [createNode(withTerrain, [createNode(waiting)])]
        },
        terrain: { _imageSize: 512, plainGridSize: 256, _elevationCache: cache, _imageDataCache: { size: 2 } },
        renderer: {
            handler: { canvas: { width: 200, height: 100 }, pixelRatio: 2 },
            screen: { _fbo: {}, _width: 200, _height: 100, _targets: [{ internalFormat: "RGBA16F" }], _useDepth: true },
            deferredShadingPass: {
                _framebuffer: { _fbo: {}, _width: 200, _height: 100, _targets: [{ internalFormat: "RGBA32F" }] }
            },
            transparencyPass: {}
        },
        _normalMapCreator: { width: 128, height: 128, queueSize: 0 },
        _indexesCache: createIndexesCache(6, [
            [6, 6, 6, 6, 6, 8450],
            [6, 5, 6, 6, 6, 8450]
        ]),
        _terrainWorker: { pendingQueue: [] },
        _plainSegmentWorker: { pendingQueue: [] }
    };
}

describe("memory report", () => {
    const r = collectMemoryReport(createPlanet());

    test("counts every array buffer once, by its place in the segment", () => {
        expect(r.nodes).toMatchObject({ total: 2, terrain: 1, noTerrain: 1 });
        expect(r.cpu.mesh).toBe(MESH_VERTICES * 3 * (8 + 4 + 4) + MESH_VERTICES * 3 * 8);
        expect(r.cpu.normalMapVertices).toBe(2 * FILE_VERTICES * 3 * 8);
        expect(r.cpu.normalMapNormals).toBe(2 * FILE_VERTICES * 3 * 4);
        expect(r.cpu.elevationData).toBe(FILE_VERTICES * 4);
    });

    test("takes a loaded tile with its level tiles as one buffer", () => {
        expect(r.elevationCache).toEqual({ tiles: 5, buffers: 1, bytes: FILE_VERTICES * 5 * 4 });
        expect(r.cpu.imageDataCache).toBe(2 * 512 * 512 * 4);
    });

    test("estimates the GPU objects", () => {
        expect(r.gpu.vertexBuffers).toBe(2 * MESH_VERTICES * 3 * 4);
        expect(r.gpu.normalMapTextures).toBe(128 * 128 * 4);
        expect(r.layerTextures).toBe(1);
        expect(r.gpu.indexCache).toBe(2 * 8450 * 4);
        expect(r.framebuffers).toBe(2);
        expect(r.gpu.framebuffers).toBe(200 * 100 * (8 + 4) + 200 * 100 * 16);
    });

    test("gives what the proposals free", () => {
        expect(r.whatIf.P4).toBe(FILE_VERTICES * 5 * 4 - FILE_VERTICES * 4 - 512 * 512 * 4);
        // One of the two 64 grid centers stays
        expect(r.whatIf.P5b).toBe(7938 * 4);
    });
});
