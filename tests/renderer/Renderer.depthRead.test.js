import { Renderer } from "../../src/renderer/Renderer";
import { Mat4 } from "../../src/math/Mat4";
import { Vec3 } from "../../src/math/Vec3";

// A renderer stand-in for the depth lookups: identity inverse projection-view, so the depth pixel unprojects to
// (ndc x, ndc y, ndc z), a camera at z = -5 looking along +z.
const fakeRenderer = (readDepthOnPointerEvents) => {
    const r = {
        readDepthOnPointerEvents,
        _inDepthReadCallback: false,
        _depthReadInverseProjectionViews: [new Mat4().setIdentity()],
        activeCamera: {
            frustums: [{ inverseProjectionViewMatrix: new Mat4().setIdentity() }],
            depthZeroToOne: true,
            isOrthographic: false,
            eye: new Vec3(0, 0, -5),
            getForward: () => new Vec3(0, 0, 1)
        },
        handler: { canvas: { width: 100, height: 100 } },
        readDepth: (x, y, out) => {
            out[0] = 0.5;
            out[1] = 0;
        },
        depthFramebuffer: { readPixelBuffersAsync: (cb) => cb() }
    };
    r.getDistanceFromPixel = Renderer.prototype.getDistanceFromPixel;
    r._isDepthReadCurrent = Renderer.prototype._isDepthReadCurrent;
    r._readDepthBuffer = Renderer.prototype._readDepthBuffer;
    return r;
};

const moveCamera = (r) => {
    r.activeCamera.frustums[0].inverseProjectionViewMatrix = new Mat4().setIdentity();
    r.activeCamera.frustums[0].inverseProjectionViewMatrix._m[12] = 1;
};

describe("Renderer depth lookups", () => {
    const px = { x: 50, y: 50 };

    test("use the last read when it is read on pointer events, also after the view moved", () => {
        const r = fakeRenderer(true);
        expect(r.getDistanceFromPixel(px)).toBeCloseTo(5.5, 9);
        moveCamera(r);
        expect(r.getDistanceFromPixel(px)).toBeCloseTo(5.5, 9);
    });

    test("without reads on pointer events, use the last read only while the view is the same", () => {
        const r = fakeRenderer(false);
        expect(r.getDistanceFromPixel(px)).toBeCloseTo(5.5, 9);
        moveCamera(r);
        expect(r.getDistanceFromPixel(px)).toBeUndefined();
    });

    test("the callback of a read sees it, also when the view moved since it was asked for", () => {
        const r = fakeRenderer(false);
        let inside;
        // asked for with the view as it is now, read back when the view has moved
        r.depthFramebuffer.readPixelBuffersAsync = (cb) => {
            moveCamera(r);
            cb();
        };
        r._readDepthBuffer(() => {
            inside = r.getDistanceFromPixel(px);
        });
        expect(inside).toBeCloseTo(5.5, 9);
        expect(r._inDepthReadCallback).toBe(false);
        expect(r.getDistanceFromPixel(px)).toBeUndefined();
    });

    test("the flag is cleared when the callback throws", () => {
        const r = fakeRenderer(false);
        expect(() =>
            r._readDepthBuffer(() => {
                throw new Error("x");
            })
        ).toThrow("x");
        expect(r._inDepthReadCallback).toBe(false);
    });
});
