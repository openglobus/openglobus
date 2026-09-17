import { Handler } from "../../src/webgl/Handler";

const GL_CONSTANTS = {
    TEXTURE_2D: 0x0de1,
    RGBA: 0x1908,
    RGBA8: 0x8058,
    UNSIGNED_BYTE: 0x1401,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    REPEAT: 0x2901,
    CLAMP_TO_EDGE: 0x812f
};

const TEXTURE_MAX_ANISOTROPY_EXT = 0x84fe;

function createGlMock() {
    let textureId = 0;
    return {
        ...GL_CONSTANTS,
        createTexture: vi.fn(() => ({ id: ++textureId })),
        bindTexture: vi.fn(),
        texStorage2D: vi.fn(),
        texSubImage2D: vi.fn(),
        texParameteri: vi.fn(),
        texParameterf: vi.fn(),
        generateMipmap: vi.fn(),
        deleteTexture: vi.fn()
    };
}

function createHandler() {
    // autoActivate is off, so the real gl context is never requested
    const handler = new Handler(undefined, { autoActivate: false });
    handler.gl = createGlMock();
    handler.extensions.EXT_texture_filter_anisotropic = {
        TEXTURE_MAX_ANISOTROPY_EXT
    };
    return handler;
}

function image(width = 256, height = 256) {
    return { width, height };
}

function wrapCalls(gl) {
    return gl.texParameteri.mock.calls.filter(
        (call) => call[1] === GL_CONSTANTS.TEXTURE_WRAP_S || call[1] === GL_CONSTANTS.TEXTURE_WRAP_T
    );
}

const FILTERS = ["NEAREST", "LINEAR", "MIPMAP", "ANISOTROPIC"];

describe("Handler texture creation", () => {
    test.each(FILTERS)("%s allocates the storage when no texture is passed", (filter) => {
        const handler = createHandler();
        const gl = handler.gl;

        const texture = handler.createTexture[filter](image());

        expect(gl.createTexture).toHaveBeenCalledTimes(1);
        expect(gl.texStorage2D).toHaveBeenCalledTimes(1);
        expect(gl.texSubImage2D).toHaveBeenCalledTimes(1);
        expect(texture).toBe(gl.createTexture.mock.results[0].value);
    });

    test.each(FILTERS)("%s re-uploads the image into the passed texture", (filter) => {
        const handler = createHandler();
        const gl = handler.gl;

        const texture = handler.createTexture[filter](image());

        gl.createTexture.mockClear();
        gl.texStorage2D.mockClear();
        gl.texSubImage2D.mockClear();

        const reused = handler.createTexture[filter](image(), null, null, texture);

        expect(reused).toBe(texture);
        expect(gl.createTexture).not.toHaveBeenCalled();
        // texStorage2D on an already allocated immutable texture is an INVALID_OPERATION
        expect(gl.texStorage2D).not.toHaveBeenCalled();
        expect(gl.texSubImage2D).toHaveBeenCalledTimes(1);
        expect(gl.bindTexture).toHaveBeenCalledWith(GL_CONSTANTS.TEXTURE_2D, texture);
        expect(gl.deleteTexture).not.toHaveBeenCalled();
    });

    test("MIPMAP and ANISOTROPIC regenerate mipmaps on the passed texture", () => {
        for (const filter of ["MIPMAP", "ANISOTROPIC"]) {
            const handler = createHandler();
            const gl = handler.gl;

            const texture = handler.createTexture[filter](image());
            gl.generateMipmap.mockClear();

            handler.createTexture[filter](image(), null, null, texture);

            expect(gl.generateMipmap).toHaveBeenCalledTimes(1);
        }
    });

    test.each(FILTERS)("%s wraps S/T with CLAMP_TO_EDGE by default", (filter) => {
        const handler = createHandler();
        const gl = handler.gl;

        const texture = handler.createTexture[filter](image());
        // The texture argument must never leak into the texParami slot
        handler.createTexture[filter](image(), null, null, texture);

        const calls = wrapCalls(gl);
        expect(calls.length).toBe(4);
        for (const call of calls) {
            expect(typeof call[2]).toBe("number");
            expect(call[2]).toBe(GL_CONSTANTS.CLAMP_TO_EDGE);
        }
    });

    test.each(FILTERS)("%s passes the given wrap mode through", (filter) => {
        const handler = createHandler();
        const gl = handler.gl;

        handler.createTexture[filter](image(), null, GL_CONSTANTS.REPEAT);

        const calls = wrapCalls(gl);
        expect(calls.length).toBe(2);
        for (const call of calls) {
            expect(call[2]).toBe(GL_CONSTANTS.REPEAT);
        }
    });
});
