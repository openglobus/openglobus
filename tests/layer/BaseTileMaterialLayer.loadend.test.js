import { GeoTIFFLayer } from "../../src/layer/GeoTIFFLayer";

// GeoTIFFLayer stands in for any tile material layer: _checkLoadend lives in the base class.
// `planet` only has to be truthy for the check to keep rescheduling itself.
function createLayer(isIdle) {
    const layer = new GeoTIFFLayer("frame");
    Object.defineProperty(layer, "isIdle", { get: () => isIdle() });
    layer._planet = {};

    const loadend = [];
    layer.events.on("loadend", (sender) => loadend.push(sender));

    return { layer, loadend };
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

describe("A tile material layer reporting loadend", () => {
    test("says nothing within the pass, and once on the frame after it", async () => {
        const { layer, loadend } = createLayer(() => true);

        // A pass where every segment was served from a cache
        layer._checkLoadend();
        layer._checkLoadend();
        layer._checkLoadend();

        expect(loadend.length).toBe(0);

        await nextFrame();
        await nextFrame();

        expect(loadend).toEqual([layer]);
    });

    test("keeps waiting while the layer is busy, instead of giving up", async () => {
        // The last tile request reports back before its image is applied, so the layer is not
        // idle yet on the next frame
        let idle = false;
        const { layer, loadend } = createLayer(() => idle);

        layer._checkLoadend();
        await nextFrame();
        await nextFrame();

        expect(loadend.length).toBe(0);

        // Nothing calls _checkLoadend again, the rescheduled check has to catch this itself
        idle = true;
        await nextFrame();
        await nextFrame();

        expect(loadend).toEqual([layer]);
    });

    test("a layer off the planet stops waiting", async () => {
        const { layer, loadend } = createLayer(() => false);
        layer._planet = null;

        layer._checkLoadend();
        await nextFrame();
        await nextFrame();

        expect(loadend.length).toBe(0);
        expect(layer._loadendFrame).toBe(0);
    });
});
