import {Program} from '../../webgl/Program';

import deferred_vert from './deferredShading.vert.glsl';
import deferred_frag from './deferredShading.frag.glsl';

export function deferredShading(): Program {
    return new Program("deferredShading", {
        uniforms: {
            baseTexture: "sampler2d",
            normalTexture: "sampler2d",
            depthTexture: "sampler2d",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec3",
            cameraPosition: "vec3",
            inverseProjectionViewMatrix: "mat4",
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: deferred_vert,
        fragmentShader: deferred_frag
    });
}
