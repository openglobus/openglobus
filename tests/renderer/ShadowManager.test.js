import { ShadowManager, MAX_SHADOW_MAPS } from "../../src/renderer/shadows/ShadowManager";
import { ShadowMap } from "../../src/renderer/shadows/ShadowMap";
import { DepthCamera } from "../../src/renderer/depthCamera/DepthCamera";

/**
 * jsdom has no webgl2 context, so the manager runs on a stub gl and a stub depth camera handler.
 */
function createManager() {
    const renderer = {
        handler: {
            gl: { FRAMEBUFFER_COMPLETE: 1 },
            floatTextureFilter: "NEAREST",
            createEmptyTexture2DArrayExt: () => ({})
        },
        depthCameraHandler: {
            initialized: true,
            add: vi.fn((depthCamera) => {
                depthCamera._handlerIndex = 0;
            }),
            remove: vi.fn((depthCamera) => {
                depthCamera._handlerIndex = -1;
            })
        },
        addProgram: vi.fn(),
        requestRedraw: vi.fn()
    };
    return { renderer, manager: new ShadowManager(renderer) };
}

function createShadowMap(params = {}) {
    const depthCamera = new DepthCamera(params);
    depthCamera._initialized = true;
    depthCamera.framebuffer = {
        _fbo: {},
        width: depthCamera.width,
        height: depthCamera.height,
        textures: [{}],
        activate: () => {},
        deactivate: () => {},
        bindOutputTextureLayer: () => {},
        bindOutputTexture: () => {},
        checkStatus: () => 1
    };
    return new ShadowMap({ depthCamera });
}

describe("ShadowManager.add", () => {
    beforeEach(() => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("registers the camera and takes a slot", () => {
        const { renderer, manager } = createManager();
        const shadowMap = createShadowMap();

        expect(manager.add(shadowMap)).toBe(shadowMap.id);
        expect(renderer.depthCameraHandler.add).toHaveBeenCalledTimes(1);
        expect(shadowMap.slot).not.toBe(-1);
        expect(manager.active).toEqual([shadowMap]);
    });

    test("before the renderer is initialized the camera is not registered", () => {
        const { renderer, manager } = createManager();
        renderer.depthCameraHandler.initialized = false;
        const shadowMap = createShadowMap();

        expect(manager.add(shadowMap)).toBe(-1);
        expect(renderer.depthCameraHandler.add).not.toHaveBeenCalled();
        expect(shadowMap.depthCamera._handlerIndex).toBe(-1);
    });

    test("a non square frame is refused before the camera is registered", () => {
        const { renderer, manager } = createManager();
        const shadowMap = createShadowMap({ width: 256, height: 128 });

        expect(manager.add(shadowMap)).toBe(-1);
        expect(renderer.depthCameraHandler.add).not.toHaveBeenCalled();
    });

    test("a size other than the one of the depth array is refused before the camera is registered", () => {
        const { renderer, manager } = createManager();
        manager.add(createShadowMap({ width: 512, height: 512 }));
        renderer.depthCameraHandler.add.mockClear();

        const other = createShadowMap({ width: 1024, height: 1024 });

        expect(manager.add(other)).toBe(-1);
        expect(renderer.depthCameraHandler.add).not.toHaveBeenCalled();
    });

    test("no free layer is refused before the camera is registered", () => {
        const { renderer, manager } = createManager();
        for (let i = 0; i < MAX_SHADOW_MAPS; i++) {
            manager.add(createShadowMap());
        }
        renderer.depthCameraHandler.add.mockClear();

        expect(manager.add(createShadowMap())).toBe(-1);
        expect(renderer.depthCameraHandler.add).not.toHaveBeenCalled();
    });

    test("a failed layer binding takes back the camera the manager has registered", () => {
        const { renderer, manager } = createManager();
        const shadowMap = createShadowMap();
        shadowMap.depthCamera.framebuffer._fbo = null;

        expect(manager.add(shadowMap)).toBe(-1);
        expect(renderer.depthCameraHandler.remove).toHaveBeenCalledWith(shadowMap.depthCamera);
        expect(shadowMap.depthCamera._handlerIndex).toBe(-1);
        expect(shadowMap.slot).toBe(-1);
        expect(manager.active).toEqual([]);

        // The slot is given back
        expect(manager.add(createShadowMap())).not.toBe(-1);
    });

    test("a failed layer binding keeps a camera the caller has registered", () => {
        const { renderer, manager } = createManager();
        const shadowMap = createShadowMap();
        shadowMap.depthCamera._handlerIndex = 3;
        shadowMap.depthCamera.framebuffer._fbo = null;

        expect(manager.add(shadowMap)).toBe(-1);
        expect(renderer.depthCameraHandler.add).not.toHaveBeenCalled();
        expect(renderer.depthCameraHandler.remove).not.toHaveBeenCalled();
        expect(shadowMap.depthCamera._handlerIndex).toBe(3);
    });
});
