import { Renderer } from "../../src/renderer/Renderer";
import { variantBit } from "../../src/webgl/ShaderProgram";
import {
    LIGHTING_FEATURE_CASCADE_SHADOWS,
    LIGHTING_FEATURE_PROJECTORS,
    LIGHTING_FEATURE_SHADOW_MAPS,
    lightingFeatureUniforms,
    shadowFeatureUniforms
} from "../../src/shaders/common/uniforms";
import * as geoShaders from "../../src/shaders/geo_object/geo_object";
import * as segmentShaders from "../../src/shaders/segment/segment";
import { deferredShading } from "../../src/shaders/deferredShading/deferredShading";
import { deferredShadingAtmos } from "../../src/shaders/deferredShading/deferredShadingAtmos";

const ALL = LIGHTING_FEATURE_PROJECTORS | LIGHTING_FEATURE_SHADOW_MAPS | LIGHTING_FEATURE_CASCADE_SHADOWS;
const SHADOWS = LIGHTING_FEATURE_SHADOW_MAPS | LIGHTING_FEATURE_CASCADE_SHADOWS;

describe("lighting feature switches", () => {
    test("the feature bits are the bits of the lightingFeatures.glsl defines", () => {
        expect(LIGHTING_FEATURE_PROJECTORS).toBe(variantBit("USE_PROJECTORS"));
        expect(LIGHTING_FEATURE_SHADOW_MAPS).toBe(variantBit("USE_SHADOW_MAPS"));
        expect(LIGHTING_FEATURE_CASCADE_SHADOWS).toBe(variantBit("USE_CASCADE_SHADOWS"));
    });

    const withProjectors = {
        segment_screen_wl_forward_noatmos: segmentShaders.segment_screen_wl_forward_noatmos,
        segment_screen_wl_forward_atmos: segmentShaders.segment_screen_wl_forward_atmos,
        geo_object_woit: geoShaders.geo_object_woit,
        geo_object_woit_atmos: geoShaders.geo_object_woit_atmos
    };

    const shadowsOnly = {
        geo_object_forward: geoShaders.geo_object_forward,
        deferredShading,
        deferredShadingAtmos
    };

    test.each(Object.entries(withProjectors))("%s switches projectors and shadows, all off", (_, create) => {
        const program = create();
        expect(program._switchMask).toBe(ALL);
        expect(program._variantMask).toBe(0);
        expect(program._uniforms).toMatchObject(
            Object.fromEntries(Object.entries(lightingFeatureUniforms).map(([n, type]) => [n, { type }]))
        );
    });

    test.each(Object.entries(shadowsOnly))("%s switches shadows only, all off", (_, create) => {
        const program = create();
        expect(program._switchMask).toBe(SHADOWS);
        expect(program._variantMask).toBe(0);
        expect(Object.keys(program._uniforms)).toEqual(expect.arrayContaining(Object.keys(shadowFeatureUniforms)));
        expect(program._uniforms).not.toHaveProperty("u_projectorCount");
    });

    test("a shadows-only program ignores the projector bit", () => {
        const program = deferredShading();
        expect(program.variant(LIGHTING_FEATURE_PROJECTORS)).toBe(program);
        expect(program.variant(ALL)).toBe(program.variant(SHADOWS));
    });
});

describe("Renderer.activeLightingFeatures", () => {
    const activeLightingFeatures = Object.getOwnPropertyDescriptor(Renderer.prototype, "activeLightingFeatures").get;
    const counts = (projectors, shadows, cascades) => ({
        projectors: { activeCount: projectors },
        shadows: { activeCount: shadows },
        cascadeShadowManager: { activeCount: cascades }
    });

    test("has the bit of each manager with something active", () => {
        expect(activeLightingFeatures.call(counts(0, 0, 0))).toBe(0);
        expect(activeLightingFeatures.call(counts(2, 0, 1))).toBe(
            LIGHTING_FEATURE_PROJECTORS | LIGHTING_FEATURE_CASCADE_SHADOWS
        );
        expect(activeLightingFeatures.call(counts(1, 4, 1))).toBe(ALL);
    });
});

describe("Renderer.bindLightingFeatures", () => {
    const bind = Renderer.prototype.bindLightingFeatures;
    const createRenderer = () => ({
        projectors: { bindForward: vi.fn() },
        shadows: { bindForward: vi.fn() },
        cascadeShadowManager: { bindForward: vi.fn() }
    });

    test("binds only the features the program has", () => {
        const r = createRenderer();
        bind.call(r, { uniforms: {} });
        expect(r.projectors.bindForward).not.toHaveBeenCalled();
        expect(r.shadows.bindForward).not.toHaveBeenCalled();
        expect(r.cascadeShadowManager.bindForward).not.toHaveBeenCalled();

        const program = { uniforms: { u_shadowMapCount: {}, u_cascadeShadowCount: {} } };
        bind.call(r, program, 10, 11, 12);
        expect(r.projectors.bindForward).not.toHaveBeenCalled();
        expect(r.shadows.bindForward).toHaveBeenCalledWith(program, 11);
        expect(r.cascadeShadowManager.bindForward).toHaveBeenCalledWith(program, 12);
    });

    test("leaves texture units to the managers' defaults when not given", () => {
        const r = createRenderer();
        const program = { uniforms: { u_projectorCount: {} } };
        bind.call(r, program);
        expect(r.projectors.bindForward).toHaveBeenCalledWith(program, undefined);
    });
});
