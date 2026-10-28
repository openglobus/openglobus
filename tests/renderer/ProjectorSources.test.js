import { Projector } from "../../src/renderer/projectors/Projector";
import {
    ProjectorManager,
    assignSourceSlots,
    MAX_FORWARD_PROJECTOR_SOURCES
} from "../../src/renderer/projectors/ProjectorManager";

/**
 * jsdom has no webgl2 context, so the manager runs on a stub gl that only records texture calls.
 */
function createManager() {
    const gl = {
        FRAMEBUFFER_COMPLETE: 1,
        TEXTURE_2D: 2,
        createTexture: vi.fn(() => ({})),
        deleteTexture: vi.fn(),
        bindTexture: vi.fn(),
        texParameteri: vi.fn(),
        pixelStorei: vi.fn(),
        texImage2D: vi.fn(),
        texSubImage2D: vi.fn()
    };
    const renderer = {
        handler: {
            gl,
            floatTextureFilter: "NEAREST",
            createEmptyTexture2DArrayExt: () => ({})
        }
    };
    return { gl, manager: new ProjectorManager(renderer) };
}

function createDepthCamera() {
    return {
        framebuffer: {
            _fbo: {},
            width: 256,
            height: 256,
            textures: [{}],
            activate: () => {},
            deactivate: () => {},
            bindOutputTextureLayer: () => {},
            bindOutputTexture: () => {},
            checkStatus: () => 1
        }
    };
}

function createProjector(params = {}) {
    return new Projector({ depthCamera: createDepthCamera(), ...params });
}

function createCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

describe("Projector source params", () => {
    test("the last declared of image/video/texture is active", () => {
        const image = createCanvas(4, 4);
        const video = document.createElement("video");

        expect(createProjector({ image, video }).source).toBe(video);
        expect(createProjector({ video, image }).source).toBe(image);
        expect(createProjector({ image, video: undefined }).source).toBe(image);
    });

    test("without a source the projector is color only", () => {
        const projector = createProjector({ color: "red" });
        expect(projector.source).toBe(null);
        expect(projector._sourceIndex).toBe(-1);
    });

    test("source kind detection", () => {
        expect(Projector.getSourceKind(document.createElement("video"))).toBe("video");
        expect(Projector.getSourceKind(createCanvas(1, 1))).toBe("image");
    });
});

describe("assignSourceSlots", () => {
    const ready = () => true;

    function assign(sourceIndices, isReady = ready) {
        const slots = new Int32Array(sourceIndices.length);
        const slotSources = new Int32Array(MAX_FORWARD_PROJECTOR_SOURCES);
        const used = assignSourceSlots(
            sourceIndices,
            sourceIndices.length,
            isReady,
            MAX_FORWARD_PROJECTOR_SOURCES,
            slots,
            slotSources
        );
        return { slots: Array.from(slots), slotSources: Array.from(slotSources).slice(0, used), used };
    }

    test("distinct sources past the cap fall back to color", () => {
        const { slots, slotSources } = assign([0, 1, 2, 3, 4]);
        expect(slots).toEqual([0, 1, 2, -1, -1]);
        expect(slotSources).toEqual([0, 1, 2]);
    });

    test("projectors sharing a source share its slot", () => {
        const { slots, used } = assign([5, 5, 5, 5]);
        expect(slots).toEqual([0, 0, 0, 0]);
        expect(used).toBe(1);
    });

    test("color projectors and not uploaded sources get no slot", () => {
        const { slots, slotSources } = assign([-1, 7, 2, -1], (index) => index !== 7);
        expect(slots).toEqual([-1, -1, 0, -1]);
        expect(slotSources).toEqual([2]);
    });
});

describe("ProjectorManager sources", () => {
    test("projectors sharing a source upload it once into one texture", () => {
        const { gl, manager } = createManager();
        const canvas = createCanvas(320, 240);
        const a = createProjector({ image: canvas });
        const b = createProjector({ image: canvas });

        manager.add(a);
        manager.add(b);
        manager.updateSources();

        expect(a._sourceIndex).toBe(b._sourceIndex);
        expect(gl.createTexture).toHaveBeenCalledTimes(1);
        expect(gl.texImage2D).toHaveBeenCalledTimes(1);
    });

    test("each source gets its own texture, reused across uploads", () => {
        const { gl, manager } = createManager();
        const small = createCanvas(512, 512);
        const large = createCanvas(1920, 1080);

        manager.add(createProjector({ image: small }));
        manager.add(createProjector({ image: large }));
        manager.add(createProjector());
        manager.updateSources();

        expect(gl.createTexture).toHaveBeenCalledTimes(2);
        expect(gl.texImage2D).toHaveBeenCalledTimes(2);

        small.width = 256;
        manager.updateSources();
        expect(gl.texImage2D).toHaveBeenCalledTimes(4);
        expect(gl.texSubImage2D).not.toHaveBeenCalled();
        expect(gl.createTexture).toHaveBeenCalledTimes(2);
    });

    test("disabled projectors do not upload", () => {
        const { gl, manager } = createManager();
        manager.add(createProjector({ image: createCanvas(8, 8), enabled: false }));
        manager.updateSources();
        expect(gl.texImage2D).not.toHaveBeenCalled();
    });

    test("the texture is deleted when the last projector using it goes away", () => {
        const { gl, manager } = createManager();
        const canvas = createCanvas(16, 16);
        const a = createProjector({ image: canvas });
        const b = createProjector({ image: canvas });
        manager.add(a);
        manager.add(b);
        manager.updateSources();

        manager.remove(a);
        expect(gl.deleteTexture).not.toHaveBeenCalled();

        b.source = null;
        expect(b._sourceIndex).toBe(-1);
        expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
    });

    test("a user texture is bound as is and never deleted", () => {
        globalThis.WebGLTexture ??= class WebGLTexture {};
        const { gl, manager } = createManager();
        const texture = new WebGLTexture();
        const projector = createProjector({ texture });

        manager.add(projector);
        manager.updateSources();
        manager.remove(projector);

        expect(gl.texImage2D).not.toHaveBeenCalled();
        expect(gl.deleteTexture).not.toHaveBeenCalled();
    });

    test("projectors with a source go first on equal priority", () => {
        const { manager } = createManager();
        const color = createProjector();
        const sourced = createProjector({ image: createCanvas(4, 4) });
        const high = createProjector({ priority: 1 });

        manager.add(color);
        manager.add(sourced);
        manager.add(high);

        expect(manager.active).toEqual([high, sourced, color]);
    });
});
