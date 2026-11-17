import { normalizeHdrFormat } from "../../src/renderer/Renderer";
import { cons } from "../../src/cons";

/**
 * A Renderer cannot be instantiated here (jsdom has no webgl2 context), so the option is
 * checked through the helper the constructor uses.
 */
describe("Renderer hdrFormat option", () => {
    test("defaults to RGBA16F", () => {
        expect(normalizeHdrFormat()).toBe("RGBA16F");
        expect(normalizeHdrFormat("")).toBe("RGBA16F");
    });

    test("takes the 8-bit formats in any case", () => {
        expect(normalizeHdrFormat("RGBA8")).toBe("RGBA8");
        expect(normalizeHdrFormat("srgb8_alpha8")).toBe("SRGB8_ALPHA8");
        expect(normalizeHdrFormat("rgba16f")).toBe("RGBA16F");
    });

    test("falls back to RGBA16F with a warning for anything else", () => {
        const warn = vi.spyOn(cons, "logWrn").mockImplementation(() => {});
        try {
            expect(normalizeHdrFormat("RGB565")).toBe("RGBA16F");
            expect(warn).toHaveBeenCalledTimes(1);
        } finally {
            warn.mockRestore();
        }
    });
});
