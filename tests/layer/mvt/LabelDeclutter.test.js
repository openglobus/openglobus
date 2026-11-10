import { getLabelCollisionBox, LabelDeclutter } from "../../../src/layer/mvt/LabelDeclutter";

describe("LabelDeclutter", () => {
    test("places boxes that don't overlap placed ones", () => {
        const d = new LabelDeclutter(64);
        d.reset(800, 600);
        expect(d.tryPlace(10, 10, 110, 30)).toBe(true);
        expect(d.tryPlace(100, 20, 200, 40)).toBe(false);
        // Touching edges isn't an overlap
        expect(d.tryPlace(110, 10, 200, 30)).toBe(true);
        expect(d.tryPlace(10, 30, 110, 50)).toBe(true);
    });

    test("finds overlaps across grid cells", () => {
        const d = new LabelDeclutter(16);
        d.reset(800, 600);
        // A long box spanning many cells
        expect(d.tryPlace(0, 100, 700, 110)).toBe(true);
        expect(d.tryPlace(650, 105, 660, 106)).toBe(false);
        expect(d.tryPlace(650, 111, 660, 120)).toBe(true);
    });

    test("rejects boxes outside the screen and clips partially visible ones", () => {
        const d = new LabelDeclutter(64);
        d.reset(800, 600);
        expect(d.tryPlace(-200, 10, -100, 30)).toBe(false);
        expect(d.tryPlace(850, 10, 900, 30)).toBe(false);
        expect(d.tryPlace(10, 650, 100, 700)).toBe(false);
        expect(d.tryPlace(-50, 10, 50, 30)).toBe(true);
        expect(d.tryPlace(0, 20, 10, 25)).toBe(false);
    });

    test("reset removes placed boxes", () => {
        const d = new LabelDeclutter(64);
        d.reset(800, 600);
        expect(d.tryPlace(10, 10, 110, 30)).toBe(true);
        d.reset(800, 600);
        expect(d.tryPlace(10, 10, 110, 30)).toBe(true);
        d.reset(1600, 1200);
        expect(d.tryPlace(1000, 1000, 1100, 1030)).toBe(true);
        expect(d.tryPlace(1050, 1010, 1060, 1020)).toBe(false);
    });
});

describe("getLabelCollisionBox", () => {
    test("scales the text box around its center and adds the padding", () => {
        expect(getLabelCollisionBox(100, 50, 200, 70, 1, 0)).toEqual([100, 50, 200, 70]);
        expect(getLabelCollisionBox(100, 50, 200, 70, 1, 2)).toEqual([98, 48, 202, 72]);
        expect(getLabelCollisionBox(100, 50, 200, 70, 0.5, 0)).toEqual([125, 55, 175, 65]);
        expect(getLabelCollisionBox(100, 50, 200, 70, 2, 1)).toEqual([49, 39, 251, 81]);
    });

    test("zero strength leaves only the padding, so labels with no padding never collide", () => {
        expect(getLabelCollisionBox(100, 50, 200, 70, 0, 3)).toEqual([147, 57, 153, 63]);
        expect(getLabelCollisionBox(100, 50, 200, 70, -1, 0)).toEqual([150, 60, 150, 60]);

        const d = new LabelDeclutter();
        d.reset(800, 600);
        const box = getLabelCollisionBox(100, 50, 200, 70, 0, 0);
        expect(d.tryPlace(...box)).toBe(true);
        expect(d.tryPlace(...box)).toBe(true);
    });

    test("writes into the given array", () => {
        const out = [0, 0, 0, 0];
        expect(getLabelCollisionBox(0, 0, 10, 10, 1, 0, out)).toBe(out);
    });
});
