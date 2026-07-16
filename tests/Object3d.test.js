import { Object3d } from "../src/Object3d.ts";

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
