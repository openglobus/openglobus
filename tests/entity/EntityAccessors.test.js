import { EntityCollection } from "../../src/entity/EntityCollection";
import { Entity } from "../../src/entity/Entity";
import { Billboard } from "../../src/entity/billboard/Billboard";
import { Label } from "../../src/entity/label/Label";
import { LOCK_UPDATE } from "../../src/entity/label/LabelWorker";
import "../../src/entity/label/LabelWorker.worker.js";
import { Ray } from "../../src/entity/ray/Ray";
import { Vec4 } from "../../src/math/Vec4";

function handlerSize(billboard) {
    const a = billboard._handler._sizeArr;
    const i = billboard._handlerIndex * 12;
    return [a[i], a[i + 1]];
}

describe("Billboard.setScale", () => {
    test("updates handler size of an attached billboard", () => {
        const ec = new EntityCollection();
        const e = new Entity({ billboard: { width: 10, height: 20 } });
        ec.add(e);
        const b = e.billboard;

        b.setScale(3);
        expect(b.getScale()).toBe(3);
        expect(handlerSize(b)).toEqual([30, 60]);

        b.setSize(5, 7);
        expect(handlerSize(b)).toEqual([15, 21]);
        expect(b.getSize()).toEqual({ width: 5, height: 7 });
    });

    test("is applied when the image size arrives later", () => {
        const ec = new EntityCollection();
        const e = new Entity({ billboard: {} });
        ec.add(e);
        const b = e.billboard;

        b.setScale(2);
        expect(handlerSize(b)).toEqual([0, 0]);

        b._applyImageSize({ width: 16, height: 8 });
        expect(b.getSize()).toEqual({ width: 16, height: 8 });
        expect(handlerSize(b)).toEqual([32, 16]);
    });

    test("works on a detached billboard", () => {
        const b = new Billboard({ width: 4, height: 4 });
        b.setScale(0.5);
        expect(b.getScale()).toBe(0.5);
        expect(b.getSize()).toEqual({ width: 4, height: 4 });
    });
});

describe("billboard scale", () => {
    test("goes to the handler multiplied, getters return what was set", () => {
        const ec = new EntityCollection();
        const e = new Entity({ billboard: { width: 2, height: 4, offset: [100, 50] } });
        ec.add(e);
        const b = e.billboard;

        b.setScale(10);

        expect(handlerSize(b)).toEqual([20, 40]);
        expect(b.getScale()).toBe(10);
        expect(b.getSize()).toEqual({ width: 2, height: 4 });
        expect(b.getWidth()).toBe(2);
        expect(b.getHeight()).toBe(4);
        expect([b.getOffset().x, b.getOffset().y]).toEqual([100, 50]);
    });

    test("is applied to the first handler write", () => {
        const ec = new EntityCollection();
        const e = new Entity({ billboard: { width: 10, height: 20, scale: 2 } });
        ec.add(e);

        expect(handlerSize(e.billboard)).toEqual([20, 40]);
    });

    test("keeps an explicit zero", () => {
        expect(new Billboard({ scale: 0 }).getScale()).toBe(0);
        expect(new Billboard({ scale: null }).getScale()).toBe(1);
    });

    test("does not depend on the entity scale", () => {
        const ec = new EntityCollection();
        const e = new Entity({ scale: 7, billboard: { width: 10, height: 20 }, label: { size: 10 } });
        ec.add(e);

        e.setScale(9);

        expect(handlerSize(e.billboard)).toEqual([10, 20]);
        expect(e.billboard.getScale()).toBe(1);
        expect(e.label.getScale()).toBe(1);
    });
});

describe("label scale", () => {
    let post;

    beforeEach(() => {
        post = vi.spyOn(self, "postMessage").mockImplementation(() => {});
    });

    afterEach(() => {
        post.mockRestore();
    });

    function addThroughWorker(handler, entity) {
        const label = entity.label;
        label._handler = handler;
        post.mockClear();
        self.onmessage({ data: { labelData: label.serializeWorkerData(1) } });
        label._lockId = 1;
        handler.workerCallback(post.mock.calls[0][0], label);
        return label;
    }

    function labelSize(label) {
        const h = label._handler;
        return h._sizeArr[label._handlerIndex * 6 * h._maxLetters];
    }

    test("does not change the font size", () => {
        const l = new Label({ size: 10, scale: 2 });
        expect(l.getScale()).toBe(2);
        expect(l.getSize()).toBe(10);

        l.setScale(3);
        expect(l.getScale()).toBe(3);
        expect(l.getSize()).toBe(10);
    });

    test("reaches the handler through the worker", () => {
        const h = new EntityCollection().labelHandler;
        const l = addThroughWorker(h, new Entity({ label: { size: 10, scale: 2 } }));

        expect(labelSize(l)).toBe(20);
    });

    test("setters write the size multiplied by the scale", () => {
        const h = new EntityCollection().labelHandler;
        const l = addThroughWorker(h, new Entity({ label: { size: 10 } }));

        l.setScale(2);
        expect(labelSize(l)).toBe(20);

        l.setSize(5);
        expect(labelSize(l)).toBe(10);
        expect(l.getSize()).toBe(5);
    });

    test("a change during the worker round trip requests the label again", () => {
        const l = new Label({ size: 10 });
        l._lockId = 1;

        l.setScale(2);

        expect(l._lockId).toBe(LOCK_UPDATE);
    });
});

describe("getters return what the setters wrote", () => {
    test("BaseBillboard.getOpacity", () => {
        const b = new Billboard();
        b.setOpacity(0.25);
        expect(b.getOpacity()).toBe(0.25);

        const ec = new EntityCollection();
        const e = new Entity({ billboard: {} });
        ec.add(e);
        e.billboard.setOpacity(0.75);
        expect(e.billboard.getOpacity()).toBe(0.75);
    });

    test("Label.isRtl and getOpacity", () => {
        const l = new Label();
        expect(l.isRtl).toBe(false);
        l.isRtl = true;
        expect(l.isRtl).toBe(true);
        expect(new Label({ isRTL: true }).isRtl).toBe(true);

        const ec = new EntityCollection();
        const e = new Entity({ label: { text: "a" } });
        ec.add(e);
        e.label.isRtl = true;
        expect(e.label.isRtl).toBe(true);
        e.label.setOpacity(0.5);
        expect(e.label.getOpacity()).toBe(0.5);
    });

    test("Ray.getThickness and colors", () => {
        const check = (r) => {
            r.setThickness(7);
            expect(r.getThickness()).toBe(7);

            r.setOpacity(0.5);
            r.setColors4v(new Vec4(1, 0, 0, 1), new Vec4(0, 1, 0, 0.8));
            expect(r.getStartColor()).toEqual(new Vec4(1, 0, 0, 1));
            expect(r.getEndColor()).toEqual(new Vec4(0, 1, 0, 0.8));

            r.setColorsHTML("blue");
            expect(r.getStartColor()).toEqual(new Vec4(0, 0, 1, 1));
            expect(r.getEndColor()).toEqual(new Vec4(0, 1, 0, 0.8));

            r.getStartColor().x = 0.3;
            r.getEndColor().y = 0.3;
            expect(r.getStartColor()).toEqual(new Vec4(0, 0, 1, 1));
            expect(r.getEndColor()).toEqual(new Vec4(0, 1, 0, 0.8));
        };

        check(new Ray());

        const ec = new EntityCollection();
        const e = new Entity({ ray: { startPosition: [0, 0, 0], endPosition: [1, 1, 1] } });
        ec.add(e);
        check(e.ray);

        const rgba = ec.rayHandler._rgbaArr;
        expect(rgba[3]).toBeCloseTo(0.4);
        expect(rgba[7]).toBeCloseTo(0.5);
    });
});
