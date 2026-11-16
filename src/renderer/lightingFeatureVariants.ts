import type { Handler } from "../webgl/Handler";
import type { ShaderProgram } from "../webgl/ShaderProgram";
import { LIGHTING_FEATURES_ALL, lightingFeatureProgramName } from "../shaders/common/uniforms";

/**
 * The program `name` built with the lighting features of `activeMask` it supports
 * (lightingFeatures.glsl). A variant is created and added to the handler the first time it is
 * drawn with, and then shared through the handler's programs like any other program.
 * @param {Handler} handler - WebGL handler.
 * @param {string} name - Plain program name, the variant with every supported feature.
 * @param {number} activeMask - Features with something active, Renderer.activeLightingFeatures.
 * @param {Function} create - Builds the program for a feature mask.
 * @param {number} [supported] - Features the program has at all.
 * @returns {ShaderProgram}
 */
export function getLightingFeatureVariant(
    handler: Handler,
    name: string,
    activeMask: number,
    create: (features: number) => ShaderProgram,
    supported: number = LIGHTING_FEATURES_ALL
): ShaderProgram {
    const features = activeMask & supported;
    const variantName = lightingFeatureProgramName(name, features, supported);
    let program = handler.programs[variantName];
    if (!program) {
        program = create(features);
        handler.addProgram(program);
    }
    return program;
}

/**
 * Removes the program `name` and all its feature variants from the handler.
 * @param {Handler} handler - WebGL handler.
 * @param {string} name - Plain program name.
 */
export function removeLightingFeatureVariants(handler: Handler, name: string) {
    const prefix = `${name}_f`;
    for (const key of Object.keys(handler.programs)) {
        if (key === name || (key.startsWith(prefix) && /^\d+$/.test(key.slice(prefix.length)))) {
            handler.removeProgram(key);
        }
    }
}
