import { Vector } from "../../src/layer/Vector";

test("Testing Vector", () => {
    const vector = new Vector("name", {});
    expect(vector).toBeTruthy();
});
