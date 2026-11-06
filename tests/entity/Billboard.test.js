import { Billboard } from "../../src/entity/billboard/Billboard";

test("Testing Billboard", () => {
    let billboard = new Billboard();

    billboard.setSize(100, 100);
    expect(billboard.getHeight()).toBe(100);
    expect(billboard.getWidth()).toBe(100);

    billboard.setHeight(200);
    billboard.setWidth(200);
    expect(billboard.getSize()).toStrictEqual({ width: 200, height: 200 });
});

test("Billboard scale does not affect screen offset", () => {
    let billboard = new Billboard({ scale: 2 });
    let setOffsetArr = vi.fn();
    billboard._handler = { setOffsetArr };
    billboard._isReady = true;

    billboard.setOffset(100, 50);

    let offset = setOffsetArr.mock.calls[0][1];
    expect([offset.x, offset.y]).toStrictEqual([100, 50]);
});
