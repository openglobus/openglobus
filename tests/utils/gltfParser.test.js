import { Gltf } from "../../src/utils/gltf/gltfParser";
import { GeoObject } from "../../src/entity/geoObject/GeoObject";
import { LINEAR, srgbToLinear } from "../../src/utils/colorSpace";

function triangle(baseColorFactor) {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);

    return {
        bin: [positions.buffer],
        gltf: {
            asset: { version: "2.0" },
            scenes: [{ nodes: [0] }],
            nodes: [{ mesh: 0 }],
            meshes: [{ name: "Triangle", primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
            materials: [{ name: "paint", pbrMetallicRoughness: { baseColorFactor } }],
            accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
            bufferViews: [{ buffer: 0, byteLength: positions.byteLength }],
            buffers: [{ byteLength: positions.byteLength }]
        }
    };
}

describe("Gltf", () => {
    test("keeps the base color as authored and marks it linear", () => {
        const factor = [0.8, 0.22, 0.018, 0.5];
        const [object3d] = new Gltf(triangle(factor)).getObjects3d();

        expect(Array.from(object3d.color)).toEqual(Array.from(new Float32Array(factor)));
        expect(object3d.colorSpace).toBe(LINEAR);
    });

    test("renders the authored base color, so a geo object does not darken it twice", () => {
        const factor = [0.8, 0.22, 0.018, 0.5];
        const [object3d] = new Gltf(triangle(factor)).getObjects3d();
        const color = new GeoObject({ object3d })._color;

        // GeoObjectHandler uploads srgbToLinear of the geo object color
        expect(srgbToLinear(color.x)).toBeCloseTo(factor[0], 5);
        expect(srgbToLinear(color.y)).toBeCloseTo(factor[1], 5);
        expect(srgbToLinear(color.z)).toBeCloseTo(factor[2], 5);
        expect(color.w).toBeCloseTo(factor[3], 5);
    });
});
