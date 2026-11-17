import { Planet } from "../../src/scene/Planet";
import {
    LIGHTING_FEATURE_CASCADE_SHADOWS,
    LIGHTING_FEATURE_PROJECTORS,
    LIGHTING_FEATURE_SHADOW_MAPS
} from "../../src/shaders/common/uniforms";
import * as shaders from "../../src/shaders/segment/segment";

/**
 * jsdom has no WebGL: the planet gets a stub renderer whose active features are set by the test.
 * Without a context the programs are never compiled, only built.
 */
function createPlanet(terrainProgram) {
    const planet = new Planet();
    const renderer = {
        handler: { programs: { segment_screen_wl_forward: terrainProgram } },
        activeLightingFeatures: 0
    };
    planet.renderer = renderer;
    return { planet, renderer };
}

describe("Planet forward terrain program", () => {
    test("is the terrain program itself while no lighting feature is active", () => {
        const terrain = shaders.segment_screen_wl_forward_noatmos();
        const { planet } = createPlanet(terrain);

        expect(planet._terrainForwardProgram()).toBe(terrain);
    });

    test("is the variant of the active features, the same one every frame", () => {
        const terrain = shaders.segment_screen_wl_forward_noatmos();
        const { planet, renderer } = createPlanet(terrain);

        renderer.activeLightingFeatures = LIGHTING_FEATURE_PROJECTORS;
        const projectors = planet._terrainForwardProgram();
        expect(projectors).not.toBe(terrain);
        expect(projectors._defines).toMatchObject({
            USE_PROJECTORS: true,
            USE_SHADOW_MAPS: false,
            USE_CASCADE_SHADOWS: false
        });
        expect(planet._terrainForwardProgram()).toBe(projectors);

        renderer.activeLightingFeatures = LIGHTING_FEATURE_SHADOW_MAPS | LIGHTING_FEATURE_CASCADE_SHADOWS;
        expect(planet._terrainForwardProgram()._defines).toMatchObject({
            USE_PROJECTORS: false,
            USE_SHADOW_MAPS: true,
            USE_CASCADE_SHADOWS: true
        });

        renderer.activeLightingFeatures = 0;
        expect(planet._terrainForwardProgram()).toBe(terrain);
    });

    test("variants of the atmosphere program keep its atmosphere", () => {
        const terrain = shaders.segment_screen_wl_forward_atmos();
        const { planet, renderer } = createPlanet(terrain);

        renderer.activeLightingFeatures = LIGHTING_FEATURE_PROJECTORS;
        const projectors = planet._terrainForwardProgram();

        expect(projectors._uniforms).toHaveProperty("atmosLutTexture");
    });
});
