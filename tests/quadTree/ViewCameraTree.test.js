import { Node } from "../../src/quadTree/Node";
import { QuadTreeStrategy } from "../../src/quadTree/QuadTreeStrategy";
import { MAX_RENDERED_NODES, NOTRENDERING, RENDERING, WALKTHROUGH } from "../../src/quadTree/quadTree";
import { DepthCameraHandler } from "../../src/renderer/depthCamera/DepthCameraHandler";
import { Vec3 } from "../../src/math/Vec3";

const LOD_SIZE = 100;

function createStrategy(planet = {}) {
    const qts = new QuadTreeStrategy({ planet });
    planet.quadTreeStrategy = qts;
    qts._lodSize = LOD_SIZE;
    return qts;
}

// Slot 0 of the strategy with the frustum lists, as _collectViewCamerasRenderNodes prepares them
function openSlot(qts, frustumsCount = 1) {
    qts._viewCamerasRenderedNodes[0] = [];
    for (let i = 0; i < frustumsCount; i++) {
        qts._viewCamerasRenderedNodes[0][i] = [];
    }
    return qts._viewCamerasRenderedNodes[0];
}

/**
 * Node of the view camera walk. projected is the node size the main camera LOD sees: at LOD_SIZE and more the walk
 * goes down. Children are given as params and appear in nodes after createChildNodes, unless ready is true.
 */
function viewNode(qts, params = {}) {
    const corner = params.corner || new Vec3(0, 0, 0);
    const node = {
        quadTreeStrategy: qts,
        state: params.state !== undefined ? params.state : NOTRENDERING,
        ready: !!params.ready,
        nodes: [],
        _viewWalkFrame: -1,
        mask: params.mask !== undefined ? params.mask : 1,
        segment: {
            tileZoom: params.zoom !== undefined ? params.zoom : 10,
            terrainReady: params.terrainReady !== undefined ? params.terrainReady : true,
            initialized: true,
            plainProcessing: false,
            plainReady: params.plainReady !== undefined ? params.plainReady : true,
            _sw: corner,
            _nw: corner,
            _ne: corner,
            _se: corner,
            lodCenter: { projected: params.projected !== undefined ? params.projected : 0 },
            _plainRadius: 1,
            checkZoom: () => true,
            initialize: vi.fn(),
            createPlainSegmentAsync: vi.fn(),
            loadTerrain: vi.fn()
        },
        getFrustumMask: () => node.mask,
        whileTerrainLoading: vi.fn(),
        createChildNodes: vi.fn(() => {
            node.ready = true;
            node.nodes = params.children || [];
        }),
        renderViewCameraTree: Node.prototype.renderViewCameraTree
    };

    if (node.ready) {
        node.nodes = params.children || [];
    }

    return node;
}

const mainCamera = { projectedSize: (center) => center.projected };
const viewCamera = { eye: new Vec3(0, 0, 0) };

function walk(qts, root, { frustumMask = 1, horizonDist2 = Infinity, mainState = true } = {}) {
    root.renderViewCameraTree(0, viewCamera, frustumMask, mainCamera, horizonDist2, mainState, null);
}

describe("Node.renderViewCameraTree", () => {
    test("stops at the main rendered nodes and goes down where the main camera went down", () => {
        const qts = createStrategy();
        const rf = openSlot(qts);

        const mainRendered = viewNode(qts, { state: RENDERING, projected: LOD_SIZE * 10 });
        const culled = viewNode(qts, { state: NOTRENDERING, projected: LOD_SIZE / 2 });
        const root = viewNode(qts, { state: WALKTHROUGH, ready: true, children: [mainRendered, culled] });

        walk(qts, root);

        // The main rendered node comes from the main list, the walk doesn't take it again
        expect(rf[0]).toEqual([culled]);
        expect(mainRendered.createChildNodes).not.toHaveBeenCalled();
        expect(root._viewWalkFrame).toBe(qts._viewWalkFrame);
    });

    test("takes its own nodes by the main camera LOD where the main camera did not go", () => {
        const qts = createStrategy();
        const rf = openSlot(qts);

        const small = viewNode(qts, { zoom: 11, projected: LOD_SIZE / 2 });
        const big = viewNode(qts, { zoom: 10, projected: LOD_SIZE * 2, children: [small] });

        walk(qts, big);

        expect(big.createChildNodes).toHaveBeenCalledTimes(1);
        expect(rf[0]).toEqual([small]);
        expect(big._viewWalkFrame).toBe(qts._viewWalkFrame);
        // Leaves are not marked, clearTree keeps the branches above them only
        expect(small._viewWalkFrame).toBe(-1);
    });

    test("doesn't read the node state once the main list is full", () => {
        const qts = createStrategy();
        const rf = openSlot(qts);

        const node = viewNode(qts, { state: RENDERING, projected: LOD_SIZE / 2 });

        walk(qts, node, { mainState: false });

        expect(rf[0]).toEqual([node]);
    });

    test("doesn't go down where the LOD is not reached, the terrain is not ready or the zoom limit is hit", () => {
        const qts = createStrategy();
        qts.maxZoomLimit = 12;
        const rf = openSlot(qts);

        const lowLod = viewNode(qts, { zoom: 10, projected: LOD_SIZE - 1 });
        const noTerrain = viewNode(qts, { zoom: 10, projected: LOD_SIZE * 2, terrainReady: false });
        const zoomLimit = viewNode(qts, { zoom: 12, projected: LOD_SIZE * 2 });

        for (const n of [lowLod, noTerrain, zoomLimit]) {
            walk(qts, n);
        }

        expect(rf[0]).toEqual([lowLod, noTerrain, zoomLimit]);
        for (const n of [lowLod, noTerrain, zoomLimit]) {
            expect(n.createChildNodes).not.toHaveBeenCalled();
        }
    });

    test("skips the nodes out of the camera frustums and behind the horizon", () => {
        const qts = createStrategy();
        const rf = openSlot(qts);

        const outOfFrustum = viewNode(qts, { mask: 0b10, projected: LOD_SIZE / 2 });
        walk(qts, outOfFrustum, { frustumMask: 0b01 });

        const behindHorizon = viewNode(qts, { zoom: 10, corner: new Vec3(10, 0, 0), projected: LOD_SIZE / 2 });
        walk(qts, behindHorizon, { horizonDist2: 1 });

        // The horizon test is skipped past zoom 19
        const highZoom = viewNode(qts, { zoom: 20, corner: new Vec3(10, 0, 0), projected: LOD_SIZE / 2 });
        walk(qts, highZoom, { horizonDist2: 1 });

        expect(rf[0]).toEqual([highZoom]);
    });

    test("puts the node in every open frustum it is in, and skips the full ones", () => {
        const qts = createStrategy();
        const rf = openSlot(qts, 3);

        rf[1].length = MAX_RENDERED_NODES;
        rf[1].fill(null);

        const node = viewNode(qts, { mask: 0b111, projected: LOD_SIZE / 2 });
        walk(qts, node, { frustumMask: 0b111 });

        expect(rf[0]).toEqual([node]);
        expect(rf[1].includes(node)).toBe(false);
        expect(rf[2]).toEqual([node]);

        const onlyInFull = viewNode(qts, { mask: 0b010, projected: LOD_SIZE / 2 });
        walk(qts, onlyInFull, { frustumMask: 0b111 });

        expect(rf[0]).toEqual([node]);
        expect(rf[2]).toEqual([node]);
    });

    test("loads the terrain of its own nodes and keeps the frames coming until it is there", () => {
        const qts = createStrategy();
        const rf = openSlot(qts);
        qts._viewCamerasTerrainCompleted = true;

        const leaf = viewNode(qts, { zoom: 11, projected: LOD_SIZE / 2, terrainReady: false, plainReady: false });
        leaf.segment.initialized = false;
        const parent = viewNode(qts, { zoom: 10, projected: LOD_SIZE * 2, ready: true, children: [leaf] });

        walk(qts, parent);

        expect(rf[0]).toEqual([leaf]);
        expect(leaf.segment.initialize).toHaveBeenCalledTimes(1);
        expect(leaf.whileTerrainLoading).toHaveBeenCalledWith(parent.segment);
        expect(leaf.segment.createPlainSegmentAsync).toHaveBeenCalledTimes(1);
        expect(leaf.segment.loadTerrain).not.toHaveBeenCalled();
        expect(qts._viewCamerasTerrainCompleted).toBe(false);

        // The next frame the plain segment is ready: the request is forced, the main traversal state doesn't drop it
        rf[0].length = 0;
        leaf.segment.plainProcessing = true;
        leaf.segment.plainReady = true;
        walk(qts, parent);

        expect(leaf.segment.loadTerrain).toHaveBeenCalledWith(true);
    });

    test("leaves the terrain flag alone when its nodes have the terrain", () => {
        const qts = createStrategy();
        openSlot(qts);
        qts._viewCamerasTerrainCompleted = true;

        walk(qts, viewNode(qts, { projected: LOD_SIZE / 2 }));

        expect(qts._viewCamerasTerrainCompleted).toBe(true);
    });
});

describe("Node.getFrustumMask", () => {
    test("tests the box when the terrain is there from zoom 6, the sphere otherwise", () => {
        const box = {},
            sphere = {};
        const inside = { containsBox: (b) => b === box, containsSphere: () => false };
        const insideSphere = { containsBox: () => false, containsSphere: (s) => s === sphere };
        const cam = { frustums: [inside, insideSphere, inside] };

        const node = { segment: { tileZoom: 6, terrainReady: true, bbox: box, bsphere: sphere } };
        expect(Node.prototype.getFrustumMask.call(node, cam)).toBe(0b101);

        node.segment.terrainReady = false;
        expect(Node.prototype.getFrustumMask.call(node, cam)).toBe(0b010);

        node.segment.terrainReady = true;
        node.segment.tileZoom = 5;
        expect(Node.prototype.getFrustumMask.call(node, cam)).toBe(0b010);
    });
});

describe("Node.clearTree", () => {
    function treeNode(qts, state, viewWalkFrame, children = []) {
        const node = {
            quadTreeStrategy: qts,
            state,
            parentNode: null,
            _viewWalkFrame: viewWalkFrame,
            nodes: children,
            getState: Node.prototype.getState,
            clearTree: Node.prototype.clearTree,
            destroyBranches: vi.fn()
        };
        children.forEach((c) => (c.parentNode = node));
        return node;
    }

    function createTree() {
        const qts = { _viewWalkFrame: 5 };
        const viewLeaf = treeNode(qts, NOTRENDERING, -1);
        const tree = {
            mainRendered: treeNode(qts, RENDERING, -1),
            viewLeaf,
            viewBranch: treeNode(qts, NOTRENDERING, 5, [viewLeaf]),
            oldViewBranch: treeNode(qts, NOTRENDERING, 4)
        };
        tree.root = treeNode(qts, WALKTHROUGH, 5, [tree.mainRendered, tree.viewBranch, tree.oldViewBranch]);
        return tree;
    }

    test("keeps the branches the last view camera collection went through", () => {
        const t = createTree();

        t.root.clearTree(true);

        expect(t.root.destroyBranches).not.toHaveBeenCalled();
        expect(t.mainRendered.destroyBranches).toHaveBeenCalledTimes(1);
        expect(t.viewBranch.destroyBranches).not.toHaveBeenCalled();
        expect(t.viewLeaf.destroyBranches).toHaveBeenCalledTimes(1);
        expect(t.oldViewBranch.destroyBranches).toHaveBeenCalledTimes(1);
    });

    test("destroys every branch the main camera doesn't render by default", () => {
        const t = createTree();

        t.root.clearTree();

        expect(t.viewBranch.destroyBranches).toHaveBeenCalledTimes(1);
        expect(t.viewLeaf.destroyBranches).not.toHaveBeenCalled();
    });
});

describe("QuadTreeStrategy._collectViewCamerasRenderNodes", () => {
    function depthCamera(frustumsCount = 1, params = {}) {
        return {
            enabled: params.enabled !== undefined ? params.enabled : true,
            initialized: params.initialized !== undefined ? params.initialized : true,
            frustumMask: params.frustumMask !== undefined ? params.frustumMask : (1 << frustumsCount) - 1,
            camera: { isOrthographic: true, frustums: new Array(frustumsCount).fill({}) }
        };
    }

    function renderedNode(opacity, mask = 0b1) {
        return { segment: { _transitionOpacity: opacity }, getFrustumMask: () => mask };
    }

    function createScene(depthCameras) {
        const planet = {
            disableDepthCamera: false,
            renderer: { depthCameraHandler: { _depthCameras: depthCameras } }
        };
        const qts = createStrategy(planet);
        qts._quadTreeList = [];
        return qts;
    }

    test("takes the opaque main nodes in the frustums the depth camera renders", () => {
        const qts = createScene([depthCamera(2, { frustumMask: 0b01 })]);
        const both = renderedNode(1.0, 0b11),
            second = renderedNode(1.0, 0b10);
        qts._renderedNodes = [both, second];

        qts._collectViewCamerasRenderNodes(mainCamera);

        expect(qts.getViewCameraRenderedNodes(0, 0)).toEqual([both]);
        expect(qts.getViewCameraRenderedNodes(0, 1)).toEqual([]);
    });

    test("takes each fading node once, the fading in ones are replaced by the opaque ones", () => {
        const qts = createScene([depthCamera()]);
        const fadingIn = renderedNode(0.4),
            fadingOut = renderedNode(1.6),
            justOpaque = renderedNode(1.0);
        qts._renderedNodes = [fadingIn, justOpaque];
        qts._fadingNodes.set(1, fadingOut);
        qts._fadingNodes.set(2, justOpaque);

        qts._collectViewCamerasRenderNodes(mainCamera);

        expect(qts.getViewCameraRenderedNodes(0)).toEqual([justOpaque, fadingOut]);
    });

    test("takes every main node when the transition opacity is off", () => {
        const qts = createScene([depthCamera()]);
        qts._transitionOpacityEnabled = false;
        const node = renderedNode(0.4);
        qts._renderedNodes = [node];

        qts._collectViewCamerasRenderNodes(mainCamera);

        expect(qts.getViewCameraRenderedNodes(0)).toEqual([node]);
    });

    test("keeps a slot per depth camera, empty for a disabled one", () => {
        const cameras = [depthCamera(), depthCamera(1, { enabled: false }), depthCamera(1, { initialized: false })];
        const qts = createScene(cameras);
        const node = renderedNode(1.0);
        qts._renderedNodes = [node];

        qts._collectViewCamerasRenderNodes(mainCamera);

        expect(qts._viewCamerasRenderedNodes.length).toBe(3);
        expect(qts.getViewCameraRenderedNodes(0)).toEqual([node]);
        expect(qts.getViewCameraRenderedNodes(1)).toEqual([]);
        expect(qts.getViewCameraRenderedNodes(2)).toEqual([]);

        cameras.length = 1;
        qts._collectViewCamerasRenderNodes(mainCamera);

        expect(qts._viewCamerasRenderedNodes.length).toBe(1);
        expect(qts.getViewCameraRenderedNodes(1)).toEqual([]);
    });

    test("leaves everything to the view walk when the main list is full", () => {
        const qts = createScene([depthCamera()]);
        const node = renderedNode(1.0);
        qts._renderedNodes = new Array(MAX_RENDERED_NODES).fill(node);
        qts._fadingNodes.set(1, renderedNode(1.6));

        const root = { renderViewCameraTree: vi.fn() };
        qts._quadTreeList = [root];

        qts._collectViewCamerasRenderNodes(mainCamera);

        // The walk would find the main nodes again, they are not taken twice
        expect(qts.getViewCameraRenderedNodes(0)).toEqual([]);
        // mainState is false: the stale node states are not read
        expect(root.renderViewCameraTree.mock.calls[0][5]).toBe(false);
    });

    test("collects nothing for a planet with the depth cameras off", () => {
        const qts = createScene([depthCamera()]);
        qts.planet.disableDepthCamera = true;
        qts._renderedNodes = [renderedNode(1.0)];

        qts._collectViewCamerasRenderNodes(mainCamera);

        expect(qts._viewCamerasRenderedNodes.length).toBe(0);
    });

    test("starts a new walk frame and resets the terrain flag", () => {
        const qts = createScene([]);
        qts._viewCamerasTerrainCompleted = false;
        const frame = qts._viewWalkFrame;

        qts._collectViewCamerasRenderNodes(mainCamera);

        expect(qts._viewWalkFrame).toBe(frame + 1);
        expect(qts._viewCamerasTerrainCompleted).toBe(true);
    });
});

describe("QuadTreeStrategy._checkRendercompleted", () => {
    function completedStrategy() {
        const planet = { renderer: { requestRedraw: vi.fn() } };
        const qts = createStrategy(planet);
        qts._renderCompleted = qts._renderCompletedActivated = true;
        qts._terrainCompleted = qts._terrainCompletedActivated = true;
        return qts;
    }

    test("requests a frame while the depth cameras wait for the terrain", () => {
        const qts = completedStrategy();
        const terrainCompleted = vi.fn();
        qts.events.on("terraincompleted", terrainCompleted);

        qts._viewCamerasTerrainCompleted = false;
        qts._checkRendercompleted();

        expect(qts.planet.renderer.requestRedraw).toHaveBeenCalledTimes(1);
        // The main view terrain state stays as it is
        expect(qts.terrainReady).toBe(true);
        expect(terrainCompleted).not.toHaveBeenCalled();
    });

    test("lets the renderer idle once everything is loaded", () => {
        const qts = completedStrategy();

        qts._viewCamerasTerrainCompleted = true;
        qts._checkRendercompleted();

        expect(qts.planet.renderer.requestRedraw).not.toHaveBeenCalled();
    });
});

describe("DepthCameraHandler slots", () => {
    function stubCamera() {
        return { _handlerIndex: -1, _handler: null, destroy: vi.fn() };
    }

    test("the last camera takes the slot of a removed one", () => {
        const renderer = { requestRedraw: vi.fn() };
        const handler = new DepthCameraHandler(renderer);
        const [a, b, c] = [stubCamera(), stubCamera(), stubCamera()];

        handler.add(a);
        handler.add(b);
        handler.add(c);
        expect(handler.add(b)).toBe(b);
        expect(handler._depthCameras).toEqual([a, b, c]);

        expect(handler.remove(b)).toBe(true);

        expect(handler._depthCameras).toEqual([a, c]);
        expect(c._handlerIndex).toBe(1);
        expect(b._handlerIndex).toBe(-1);
        expect(b._handler).toBe(null);
        expect(b.destroy).toHaveBeenCalledTimes(1);

        expect(handler.remove(b)).toBe(false);
    });
});
