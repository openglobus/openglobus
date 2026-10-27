import { Object3d } from "../src/Object3d.ts";
import { GeoObject } from "../src/entity/geoObject/GeoObject.ts";
import { LINEAR, SRGB, srgbToLinear } from "../src/utils/colorSpace.ts";

function expectNormal(normals, vertexIndex, expected) {
    const offset = vertexIndex * 3;

    expect(normals[offset]).toBeCloseTo(expected[0], 10);
    expect(normals[offset + 1]).toBeCloseTo(expected[1], 10);
    expect(normals[offset + 2]).toBeCloseTo(expected[2], 10);
}

describe("Object3d", () => {
    test("generates normals for indexed geometry when normals are not provided", () => {
        const object = new Object3d({
            vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
            indices: [0, 1, 2]
        });

        expect(object.normals).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    });

    test("keeps explicitly provided normals for indexed geometry", () => {
        const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0];
        const object = new Object3d({
            vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
            indices: [0, 1, 2],
            normals
        });

        expect(object.normals).toBe(normals);
    });

    test("calculates indexed normals for a coplanar quad", () => {
        const normals = Object3d.getNormals([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], [0, 1, 2, 0, 2, 3]);

        expectNormal(normals, 0, [0, 0, 1]);
        expectNormal(normals, 1, [0, 0, 1]);
        expectNormal(normals, 2, [0, 0, 1]);
        expectNormal(normals, 3, [0, 0, 1]);
    });

    test("averages indexed normals at shared vertices", () => {
        const normals = Object3d.getNormals([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 1, 2, 0, 3, 1]);
        const halfSqrt = Math.sqrt(0.5);

        expectNormal(normals, 0, [0, halfSqrt, halfSqrt]);
        expectNormal(normals, 1, [0, halfSqrt, halfSqrt]);
        expectNormal(normals, 2, [0, 0, 1]);
        expectNormal(normals, 3, [0, 1, 0]);
    });
});

describe("Object3d color space", () => {
    test("takes colors as sRGB unless told otherwise, like every color of the API", () => {
        expect(new Object3d({ color: [0.5, 0.5, 0.5] }).colorSpace).toBe(SRGB);
        expect(new Object3d({ color: [0.5, 0.5, 0.5], colorSpace: "linear" }).colorSpace).toBe(LINEAR);
    });

    test("forgets a linear color space when a new color is set without one", () => {
        const object = new Object3d({ color: [0.5, 0.5, 0.5], colorSpace: LINEAR });

        object.setColor("#ffffff");
        expect(object.colorSpace).toBe(SRGB);

        object.setColor([0.2, 0.2, 0.2], "linear");
        expect(object.colorSpace).toBe(LINEAR);
    });

    test("leaves an sRGB color to the geo object as is, and converts a linear one to sRGB", () => {
        const srgb = new GeoObject({ object3d: new Object3d({ color: [0.5, 0.25, 1, 1] }) })._color;
        const linear = new GeoObject({
            object3d: new Object3d({ color: [0.5, 0.25, 1, 1], colorSpace: "linear" })
        })._color;

        expect([srgb.x, srgb.y, srgb.z]).toEqual([0.5, 0.25, 1]);
        expect(srgbToLinear(linear.x)).toBeCloseTo(0.5, 6);
        expect(srgbToLinear(linear.y)).toBeCloseTo(0.25, 6);
        expect(linear.z).toBeCloseTo(1, 6);
    });
});
