import { Material } from "../../src/layer/Material";

test("Testing Material", () => {
    const material = new Material("name", {});
    expect(material).toBeTruthy();
});
