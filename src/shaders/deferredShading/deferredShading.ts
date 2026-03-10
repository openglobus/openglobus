import {Program} from '../../webgl/Program';

import deferred_vert from './deferredShading.vert.glsl';
import deferred_frag from './deferredShading.frag.glsl';

export function deferredShading(): Program {
    return new Program("deferredShading", {
        uniforms: {
            diffuseTexture: "sampler2d",
            normalTexture: "sampler2d",
            depthTexture: "sampler2d",
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: deferred_vert,
        fragmentShader: deferred_frag
    });
}