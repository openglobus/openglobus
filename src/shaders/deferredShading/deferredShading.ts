import {Program} from '../../webgl/Program';

import deferred_vert from './deferredShading.vert.glsl';
import deferred_frag from './deferredShading.frag.glsl';

export function deferredShading(): Program {
    return new Program("deferredShading", {
        uniforms: {
            baseTexture: "sampler2d",
            materialsTexture: "sampler2d",
            normalTexture: "sampler2d",
            positionTexture: "sampler2d",
            lightPosition: "vec3",
            lightAmbient: "vec3",
            lightDiffuse: "vec3",
            lightSpecular: "vec4",
            cameraPosition: "vec3",
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: deferred_vert,
        fragmentShader: deferred_frag
    });
}
