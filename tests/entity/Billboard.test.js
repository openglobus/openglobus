import { Billboard } from "../../src/og/entity/Billboard";

test("Testing Billboard", () => {
    let billboard = new Billboard();

    billboard.setSize(100, 100);
    expect(billboard.getHeight()).toBe(100);
    expect(billboard.getWidth()).toBe(100);

    billboard.setHeight(200);
    billboard.setWidth(200);
    expect(billboard.getSize()).toStrictEqual({ width: 200, height: 200 });
});
