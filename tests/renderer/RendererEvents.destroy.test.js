import { RendererEvents } from "../../src/renderer/RendererEvents";
import { input } from "../../src/input/input";

/**
 * A Renderer/Globe cannot be instantiated here, because jsdom has no webgl2 context,
 * see tests/setupTests.js. RendererEvents is the seam that used to throw on teardown,
 * so the teardown is checked on it directly.
 */
function createRendererEvents() {
    const canvas = document.createElement("canvas");
    const renderer = {
        handler: { canvas: canvas },
        requestRedraw: () => {}
    };
    return new RendererEvents(renderer);
}

test("Testing RendererEvents destroy removes document key listeners", () => {
    const added = [];
    const removed = [];

    const addSpy = vi.spyOn(document, "addEventListener").mockImplementation((type, listener) => {
        added.push({ type, listener });
    });
    const removeSpy = vi.spyOn(document, "removeEventListener").mockImplementation((type, listener) => {
        removed.push({ type, listener });
    });

    try {
        const events = createRendererEvents();

        const keyListeners = added.filter((it) => it.type === "keydown" || it.type === "keyup");
        expect(keyListeners.length).toBe(2);

        events.destroy();

        for (const it of keyListeners) {
            expect(removed).toContainEqual(it);
        }
    } finally {
        addSpy.mockRestore();
        removeSpy.mockRestore();
    }
});

test("Testing RendererEvents unbinding a key event after destroy does not throw", () => {
    const events = createRendererEvents();

    const _onToggleKey = () => {};

    // A default control, e.g. FreeNavigation, binds its toggle key on init
    events.on("keyfree", input.KEY_F, _onToggleKey);

    events.destroy();

    // ...and unbinds it on remove
    expect(() => events.off("keyfree", input.KEY_F, _onToggleKey)).not.toThrow();
});
