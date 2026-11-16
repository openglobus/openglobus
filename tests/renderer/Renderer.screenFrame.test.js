import { Renderer } from "../../src/renderer/Renderer";

/**
 * jsdom has no webgl2 context, so _screenFrame runs on a stub renderer and gl that record
 * which passes it draws.
 */
function createRenderer({ msaa = 0, output = "screen", width = 800, height = 600, canvasWidth = 800 } = {}) {
    const calls = [];
    const gl = new Proxy(
        { FRAMEBUFFER: "FRAMEBUFFER", TEXTURE0: 0, TEXTURE_2D: "TEXTURE_2D", ARRAY_BUFFER: "ARRAY_BUFFER" },
        {
            get(target, key) {
                if (key in target) return target[key];
                return (...args) => calls.push([key, ...args]);
            }
        }
    );
    const program = (name) => ({
        attributes: { corners: 0 },
        uniforms: { hdrBuffer: 1, gamma: 2, exposure: 3, texture: 4 },
        activate: () => calls.push(["activate", name])
    });
    const forwardTexture = { name: "forward" };
    const hdrTexture = { name: "hdr" };
    const forward = {
        width,
        height,
        textures: [forwardTexture],
        blitTo: (target) => calls.push(["blitTo", target === renderer.hdrFramebuffer])
    };
    const renderer = {
        handler: {
            gl,
            canvas: { width: canvasWidth, height: 600 },
            programs: { toneMapping: program("toneMapping"), screenFrame: program("screenFrame") }
        },
        forwardFramebuffer: forward,
        hdrFramebuffer: msaa > 0 ? { textures: [hdrTexture] } : null,
        toneMappingFramebuffer: {
            activate: () => calls.push(["toneMappingFramebuffer.activate"]),
            deactivate: () => calls.push(["toneMappingFramebuffer.deactivate"])
        },
        screenFramePositionBuffer: {},
        outputTexture: { name: "output" },
        _currentOutput: output,
        gamma: 2.2,
        exposure: 1,
        whitepoint: 1
    };
    Renderer.prototype._screenFrame.call(renderer);
    return { calls, forwardTexture, hdrTexture };
}

const names = (calls) => calls.map((c) => c[0]);
const boundTextures = (calls) => calls.filter((c) => c[0] === "bindTexture").map((c) => c[2]);

test("without MSAA the forward texture is tone mapped straight into the canvas", () => {
    const { calls, forwardTexture } = createRenderer();
    expect(names(calls)).not.toContain("blitTo");
    expect(names(calls)).not.toContain("toneMappingFramebuffer.activate");
    expect(calls).toContainEqual(["bindFramebuffer", "FRAMEBUFFER", null]);
    expect(calls).not.toContainEqual(["activate", "screenFrame"]);
    expect(boundTextures(calls)).toEqual([forwardTexture]);
    expect(names(calls).filter((n) => n === "drawArrays").length).toBe(1);
});

test("with MSAA the image is resolved first, then tone mapped into the canvas", () => {
    const { calls, hdrTexture } = createRenderer({ msaa: 4 });
    expect(calls).toContainEqual(["blitTo", true]);
    expect(boundTextures(calls)).toEqual([hdrTexture]);
    expect(names(calls)).not.toContain("toneMappingFramebuffer.activate");
});

test("another output keeps the tone mapping target and the screen pass", () => {
    const { calls, forwardTexture } = createRenderer({ output: "depth" });
    expect(names(calls)).toContain("toneMappingFramebuffer.activate");
    expect(calls).toContainEqual(["activate", "screenFrame"]);
    expect(boundTextures(calls)).toEqual([forwardTexture, { name: "output" }]);
    expect(names(calls).filter((n) => n === "drawArrays").length).toBe(2);
});

test("an image of another size than the canvas keeps the screen pass", () => {
    const { calls } = createRenderer({ width: 400, canvasWidth: 800 });
    expect(names(calls)).toContain("toneMappingFramebuffer.activate");
    expect(calls).toContainEqual(["activate", "screenFrame"]);
});
