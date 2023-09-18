import { XYZ } from "../../src/layer/XYZ";

test("Testing Extent", () => {
    const xyz = new XYZ("name", {});
    expect(xyz).toBeTruthy();
});
