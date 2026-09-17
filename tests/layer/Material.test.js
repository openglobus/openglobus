import { Material } from "../../src/layer/Material";

const INTERNAL_FORMAT = 0x8058; // gl.RGBA8

function image(width = 256, height = 256) {
    return { width, height };
}

/**
 * Builds a material with mocked layer, segment and handler.
 * The createTexture mock repeats the handler contract: it re-uploads the image
 * into the passed texture, otherwise it creates a new one.
 */
function createMaterial() {
    let textureId = 0;

    const deleteTexture = vi.fn();

    const createTexture = vi.fn((img, internalFormat, texParami, texture) => {
        return texture || { id: ++textureId };
    });

    const layer = {
        _planet: {},
        _internalFormat: INTERNAL_FORMAT,
        createTexture
    };

    const segment = {
        initialized: true,
        node: { nodeId: 7 },
        handler: { gl: { deleteTexture } },
        planet: { renderer: null }
    };

    return {
        material: new Material(segment, layer),
        createTexture,
        deleteTexture
    };
}

/** The texture argument createTexture has been called with on the last call. */
function lastPassedTexture(createTexture) {
    const calls = createTexture.mock.calls;
    return calls[calls.length - 1][3];
}

test("Testing Material", () => {
    const material = new Material("name", {});
    expect(material).toBeTruthy();
});

describe("Material texture creation", () => {
    test("passes the image, the internal format and no texture on the first image", () => {
        const { material, createTexture } = createMaterial();

        const img = image();
        material.applyImage(img);

        expect(createTexture).toHaveBeenCalledTimes(1);
        expect(createTexture).toHaveBeenCalledWith(img, INTERNAL_FORMAT, null, null);
        expect(material.texture).toBeTruthy();
        expect(material.isReady).toBe(true);
    });

    test("passes its texture as the fourth argument on the next image", () => {
        const { material, createTexture, deleteTexture } = createMaterial();

        material.applyImage(image());
        const texture = material.texture;

        material.applyImage(image());

        expect(createTexture).toHaveBeenCalledTimes(2);
        expect(lastPassedTexture(createTexture)).toBe(texture);
        // The same texture is reused, so no new one leaks
        expect(material.texture).toBe(texture);
        expect(deleteTexture).not.toHaveBeenCalled();
    });

    test("never puts the texture into the texParami slot", () => {
        const { material, createTexture } = createMaterial();

        material.applyImage(image());
        material.applyImage(image());

        for (const call of createTexture.mock.calls) {
            expect(call[2]).toBeNull();
        }
    });

    test("does not pass the texture while the material is not ready", () => {
        const { material, createTexture } = createMaterial();

        // BaseTileMaterialLayer puts a parent tile texture into a material which is not ready yet
        material.texture = { id: "parent" };

        material.applyImage(image());

        expect(lastPassedTexture(createTexture)).toBeNull();
    });

    test("does nothing when the segment is not initialized", () => {
        const { material, createTexture } = createMaterial();
        material.segment.initialized = false;

        material.applyImage(image());

        expect(createTexture).not.toHaveBeenCalled();
        expect(material.texture).toBeNull();
    });
});
