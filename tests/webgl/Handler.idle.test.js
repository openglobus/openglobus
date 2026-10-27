import { Handler } from "../../src/webgl/Handler";

function createHandler(params) {
    // autoActivate is off, so no gl context is required to run drawFrame
    return new Handler(undefined, { autoActivate: false, ...params });
}

describe("Handler idle mode", () => {
    test("draws every frame when the idle mode is off", () => {
        const handler = createHandler();
        const frameCallback = vi.fn();
        handler.setFrameCallback(frameCallback);

        handler.drawFrame();
        handler.drawFrame();
        handler.drawFrame();

        expect(frameCallback).toHaveBeenCalledTimes(3);
    });

    test("skips a frame when nothing has been changed", () => {
        const handler = createHandler({ idleMode: true });
        const frameCallback = vi.fn();
        handler.setFrameCallback(frameCallback);

        // The very first frame is always drawn
        handler.drawFrame();
        expect(frameCallback).toHaveBeenCalledTimes(1);

        handler.drawFrame();
        handler.drawFrame();
        expect(frameCallback).toHaveBeenCalledTimes(1);
        expect(handler.isIdle).toBe(true);
    });

    test("draws the frame when needRedraw is raised", () => {
        const handler = createHandler({ idleMode: true });
        const frameCallback = vi.fn();
        handler.setFrameCallback(frameCallback);

        handler.drawFrame();
        handler.drawFrame();
        expect(frameCallback).toHaveBeenCalledTimes(1);

        handler.needRedraw = true;
        handler.drawFrame();

        expect(frameCallback).toHaveBeenCalledTimes(2);
        // The flag is lowered by the frame itself, so nothing keeps the loop awake anymore
        expect(handler.needRedraw).toBe(false);
        expect(handler.isIdle).toBe(true);
    });

    test("keeps the loop alive when a frame requests a redraw while it is being drawn", () => {
        const handler = createHandler({ idleMode: true });

        // Emulates something that is still animating or loading: it re-arms the flag
        // from inside the frame, exactly as the camera, the quad tree and the fading
        // layers do.
        let framesLeft = 3;
        const frameCallback = vi.fn(() => {
            if (--framesLeft > 0) {
                handler.needRedraw = true;
            }
        });
        handler.setFrameCallback(frameCallback);

        handler.drawFrame();
        handler.drawFrame();
        handler.drawFrame();
        expect(frameCallback).toHaveBeenCalledTimes(3);

        // The animation is over, so the loop falls asleep
        handler.drawFrame();
        expect(frameCallback).toHaveBeenCalledTimes(3);
        expect(handler.isIdle).toBe(true);
    });

    test("wakes up when the idle mode is switched off", () => {
        const handler = createHandler({ idleMode: true });
        const frameCallback = vi.fn();
        handler.setFrameCallback(frameCallback);

        handler.drawFrame();
        handler.drawFrame();
        expect(frameCallback).toHaveBeenCalledTimes(1);

        handler.idleMode = false;
        handler.drawFrame();
        handler.drawFrame();

        expect(frameCallback).toHaveBeenCalledTimes(3);
    });
});
