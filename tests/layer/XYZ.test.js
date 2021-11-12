import { XYZ } from "../../src/og/layer/XYZ";

test("Testing Extent", () => {
    const xyz = new XYZ("name", {});
    expect(xyz).toBeTruthy();
});
