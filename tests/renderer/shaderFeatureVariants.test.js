import { getShaderFeatureVariant, removeShaderFeatureVariants } from "../../src/renderer/shaderFeatureVariants";
import { Renderer } from "../../src/renderer/Renderer";
import {
    SHADER_FEATURE_CASCADE_SHADOWS,
    SHADER_FEATURE_PROJECTORS,
    SHADER_FEATURE_SHADOW_MAPS,
    SHADER_FEATURES_ALL,
    SHADER_FEATURES_SHADOWS,
    shaderFeatureProgramName
} from "../../src/shaders/common/uniforms";
import * as geoShaders from "../../src/shaders/geo_object/geo_object";
import { deferredShading } from "../../src/shaders/deferredShading/deferredShading";
import { deferredShadingAtmos } from "../../src/shaders/deferredShading/deferredShadingAtmos";

const featureUniformNames = (uniforms) =>
    Object.keys(uniforms).filter((name) => /^u_(projector|shadowMap|cascadeShadow)/.test(name));

function createHandler() {
    const programs = {};
    return {
        programs,
        addProgram: vi.fn((program) => {
            programs[program.name] = program;
            return program;
        }),
        removeProgram: vi.fn((name) => {
            delete programs[name];
        })
    };
}

describe("shader feature variants", () => {
    test("a variant is built once and then shared through the handler", () => {
        const handler = createHandler();
        const create = vi.fn((features) => ({ name: shaderFeatureProgramName("prog", features), features }));

        const a = getShaderFeatureVariant(handler, "prog", 0, create);
        const b = getShaderFeatureVariant(handler, "prog", 0, create);
        expect(a).toBe(b);
        expect(a.name).toBe("prog_f0");
        expect(create).toHaveBeenCalledTimes(1);

        expect(getShaderFeatureVariant(handler, "prog", SHADER_FEATURES_ALL, create).name).toBe("prog");
    });

    test("a program without projectors ignores the projector bit", () => {
        const handler = createHandler();
        const create = vi.fn((features) => ({
            name: shaderFeatureProgramName("shadowsOnly", features, SHADER_FEATURES_SHADOWS),
            features
        }));
        const program = getShaderFeatureVariant(
            handler,
            "shadowsOnly",
            SHADER_FEATURE_PROJECTORS | SHADER_FEATURE_SHADOW_MAPS,
            create,
            SHADER_FEATURES_SHADOWS
        );
        expect(program.features).toBe(SHADER_FEATURE_SHADOW_MAPS);
        expect(program.name).toBe("shadowsOnly_f2");
        // projectors on, both shadows on: the plain, full program
        expect(
            getShaderFeatureVariant(handler, "shadowsOnly", SHADER_FEATURES_ALL, create, SHADER_FEATURES_SHADOWS).name
        ).toBe("shadowsOnly");
    });

    test("removing takes the plain program and its variants, nothing with a longer name", () => {
        const handler = createHandler();
        for (const name of [
            "deferredShading",
            "deferredShading_f0",
            "deferredShading_f2",
            "deferredShadingAtmos",
            "deferredShadingAtmos_f0"
        ]) {
            handler.programs[name] = {};
        }
        removeShaderFeatureVariants(handler, "deferredShading");
        expect(Object.keys(handler.programs).sort()).toEqual(["deferredShadingAtmos", "deferredShadingAtmos_f0"]);
    });
});

describe("feature-aware factories", () => {
    test("shadow-only programs keep their plain name with both shadow kinds", () => {
        expect(geoShaders.geo_object_forward().name).toBe("geo_object_forward");
        expect(geoShaders.geo_object_forward(SHADER_FEATURES_SHADOWS).name).toBe("geo_object_forward");
        expect(deferredShading(SHADER_FEATURE_CASCADE_SHADOWS).name).toBe("deferredShading_f4");
        expect(deferredShadingAtmos(undefined, 0).name).toBe("deferredShadingAtmos_f0");
    });

    test("variants declare only their features' uniforms", () => {
        expect(featureUniformNames(geoShaders.geo_object_forward(0)._uniforms)).toEqual([]);
        expect(featureUniformNames(geoShaders.geo_object_woit(0)._uniforms)).toEqual([]);
        expect(featureUniformNames(geoShaders.geo_object_woit_atmos(undefined, 0)._uniforms)).toEqual([]);
        expect(featureUniformNames(deferredShading(0)._uniforms)).toEqual([]);
        // a shadow-only program has no projector uniforms even in its full variant
        expect(featureUniformNames(deferredShading()._uniforms).some((n) => n.startsWith("u_projector"))).toBe(false);
        expect(geoShaders.geo_object_woit()._uniforms).toHaveProperty("u_projectorCount");
    });
});

describe("Renderer.bindShaderFeatures", () => {
    const bind = Renderer.prototype.bindShaderFeatures;
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
