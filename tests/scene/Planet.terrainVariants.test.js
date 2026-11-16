import { Planet } from "../../src/scene/Planet";
import { Renderer } from "../../src/renderer/Renderer";
import {
    SHADER_FEATURE_CASCADE_SHADOWS,
    SHADER_FEATURE_PROJECTORS,
    SHADER_FEATURE_SHADOW_MAPS,
    SHADER_FEATURES_ALL,
    shaderFeatureParams,
    shaderFeatureProgramName,
    shaderFeatureUniforms
} from "../../src/shaders/common/uniforms";
import * as shaders from "../../src/shaders/segment/segment";

const featureUniformNames = (uniforms) =>
    Object.keys(uniforms).filter((name) => /^u_(projector|shadowMap|cascadeShadow)/.test(name));

/**
 * jsdom has no webgl2 context: the planet gets a stub renderer whose active features are set
 * by the test, and a handler that only records programs.
 */
function createPlanet(mask = 0) {
    const planet = new Planet();
    const programs = {};
    const handler = {
        programs,
        addProgram: vi.fn((program) => {
            programs[program.name] = program;
            return program;
        }),
        removeProgram: vi.fn((name) => {
            delete programs[name];
        })
    };
    const renderer = {
        handler,
        activeShaderFeatures: mask,
        projectors: { bindForward: vi.fn() },
        shadows: { bindForward: vi.fn() },
        cascadeShadowManager: { bindForward: vi.fn() }
    };
    planet.renderer = renderer;
    return { planet, renderer, handler };
}

describe("shader feature helpers", () => {
    test("uniforms come only with their feature", () => {
        expect(featureUniformNames(shaderFeatureUniforms(0))).toEqual([]);
        expect(
            featureUniformNames(shaderFeatureUniforms(SHADER_FEATURE_PROJECTORS)).every((n) =>
                n.startsWith("u_projector")
            )
        ).toBe(true);
        expect(shaderFeatureUniforms(SHADER_FEATURE_SHADOW_MAPS)).toHaveProperty("u_shadowMapCount");
        expect(shaderFeatureUniforms(SHADER_FEATURE_SHADOW_MAPS)).not.toHaveProperty("u_cascadeShadowCount");
        const all = shaderFeatureUniforms(SHADER_FEATURES_ALL);
        expect(all).toHaveProperty("u_projectorCount");
        expect(all).toHaveProperty("u_shadowMapCount");
        expect(all).toHaveProperty("u_cascadeShadowCount");
    });

    test("template parameters switch the glsl features", () => {
        expect(shaderFeatureParams(SHADER_FEATURE_CASCADE_SHADOWS)).toMatchObject({
            USE_PROJECTORS: 0,
            USE_SHADOW_MAPS: 0,
            USE_CASCADE_SHADOWS: 1
        });
        // projectors.glsl array sizes are always there
        expect(shaderFeatureParams(0)).toHaveProperty("MAX_PROJECTORS");
    });

    test("the full variant keeps the plain program name", () => {
        expect(shaderFeatureProgramName("segment_screen_wl_forward", SHADER_FEATURES_ALL)).toBe(
            "segment_screen_wl_forward"
        );
        expect(shaderFeatureProgramName("segment_screen_wl_forward", 0)).toBe("segment_screen_wl_forward_f0");
    });

    test("terrain forward factories default to every feature", () => {
        const full = shaders.segment_screen_wl_forward_noatmos();
        expect(full.name).toBe("segment_screen_wl_forward");
        expect(full._uniforms).toHaveProperty("u_projectorCount");

        const none = shaders.segment_screen_wl_forward_atmos(undefined, 0);
        expect(none.name).toBe("segment_screen_wl_forward_f0");
        expect(featureUniformNames(none._uniforms)).toEqual([]);
        expect(none._uniforms).toHaveProperty("atmosLutTexture");
    });
});

describe("Renderer.activeShaderFeatures", () => {
    const activeShaderFeatures = Object.getOwnPropertyDescriptor(Renderer.prototype, "activeShaderFeatures").get;

    test("has a bit for each manager with something active", () => {
        const counts = (p, s, c) => ({
            projectors: { activeCount: p },
            shadows: { activeCount: s },
            cascadeShadowManager: { activeCount: c }
        });
        expect(activeShaderFeatures.call(counts(0, 0, 0))).toBe(0);
        expect(activeShaderFeatures.call(counts(2, 0, 1))).toBe(
            SHADER_FEATURE_PROJECTORS | SHADER_FEATURE_CASCADE_SHADOWS
        );
        expect(activeShaderFeatures.call(counts(1, 4, 1))).toBe(SHADER_FEATURES_ALL);
    });
});

describe("Planet forward terrain program variants", () => {
    test("draws with the variant of the active features, built once", () => {
        const { planet, renderer, handler } = createPlanet(0);
        planet._addTerrainForwardProgram();
        expect(handler.programs).toHaveProperty("segment_screen_wl_forward");

        const none = planet._terrainForwardProgram();
        expect(none.name).toBe("segment_screen_wl_forward_f0");
        expect(featureUniformNames(none._uniforms)).toEqual([]);
        expect(planet._terrainForwardProgram()).toBe(none);
        expect(handler.addProgram).toHaveBeenCalledTimes(2);

        renderer.activeShaderFeatures = SHADER_FEATURES_ALL;
        expect(planet._terrainForwardProgram()).toBe(handler.programs.segment_screen_wl_forward);
        expect(handler.addProgram).toHaveBeenCalledTimes(2);

        renderer.activeShaderFeatures = SHADER_FEATURE_PROJECTORS;
        expect(planet._terrainForwardProgram().name).toBe("segment_screen_wl_forward_f1");
    });

    test("variants follow the atmosphere setting", () => {
        const { planet } = createPlanet(0);
        planet._atmosphereEnabled = true;
        planet._addTerrainForwardProgram({ BOTTOM_RADIUS: 6356752.3142451793 });
        const none = planet._terrainForwardProgram();
        expect(none._uniforms).toHaveProperty("atmosLutTexture");
    });

    test("removing drops every variant, the plain one too", () => {
        const { planet, renderer, handler } = createPlanet(0);
        planet._addTerrainForwardProgram();
        planet._terrainForwardProgram();
        renderer.activeShaderFeatures = SHADER_FEATURE_SHADOW_MAPS;
        planet._terrainForwardProgram();

        planet._removeTerrainForwardPrograms();
        expect(Object.keys(handler.programs)).toEqual([]);

        // rebuilt on the next draw
        renderer.activeShaderFeatures = 0;
        expect(planet._terrainForwardProgram().name).toBe("segment_screen_wl_forward_f0");
    });

    test("leaves other programs alone when removing", () => {
        const { planet, handler } = createPlanet(0);
        handler.programs.segment_screen_wl_forward_extra = {};
        handler.programs.segment_screen_deferred = {};
        planet._addTerrainForwardProgram();
        planet._terrainForwardProgram();
        planet._removeTerrainForwardPrograms();
        expect(Object.keys(handler.programs).sort()).toEqual([
            "segment_screen_deferred",
            "segment_screen_wl_forward_extra"
        ]);
    });
});
