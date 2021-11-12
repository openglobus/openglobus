import { Vector } from "../../src/og/layer/Vector";

test("Testing Vector", () => {
    const vector = new Vector("name", {});
    expect(vector).toBeTruthy();
});
