import {Program} from '../../webgl/Program';
import {stringTemplate2} from "../../utils/shared";
import type {AtmosphereParameters} from "../atmos/atmos";
import {DEFAULT_PARAMS} from "../atmos/atmos";

import deferred_vert from './deferredShading.vert.glsl';
import deferred_atmos_frag from './deferredShadingAtmos.frag.glsl';

export function deferredShadingAtmos(atmosParams: AtmosphereParameters = DEFAULT_PARAMS): Program {
    return new Program("deferredShadingAtmos", {
        uniforms: {
            baseTexture: "sampler2d",
            materialsTexture: "sampler2d",
            normalTexture: "sampler2d",
            positionTexture: "sampler2d",
            transmittanceTexture: "sampler2D",
            scatteringTexture: "sampler2D",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
            cameraPosition: "vec3",
            maxMinOpacity: "vec2",
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: deferred_vert,
        fragmentShader: stringTemplate2(deferred_atmos_frag, {
            ...atmosParams
        })
    });
}
