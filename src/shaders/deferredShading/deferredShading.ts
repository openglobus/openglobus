import {Program} from '../../webgl/Program';

import deferred_vert from './deferredShading.vert.glsl';
import deferred_frag from './deferredShading.frag.glsl';

export function deferredShading(): Program {
    return new Program("deferredShading", {
        uniforms: {
            viewMatrix: "mat4",
            baseTexture: "sampler2d",
            materialsTexture: "sampler2d",
            normalTexture: "sampler2d",
            viewPositionTexture: "sampler2d",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: deferred_vert,
        fragmentShader: deferred_frag
    });
}
