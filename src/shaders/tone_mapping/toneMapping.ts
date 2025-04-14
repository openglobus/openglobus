import {Program} from '../../webgl/Program';

import tone_mapping_vert from './tone_mapping.vert.glsl';
import tone_mapping_frag from './tone_mapping.frag.glsl';

export function toneMapping(): Program {
    return new Program("toneMapping", {
        uniforms: {
            hdrBuffer: "sampler2d",
            exposure: "float",
            gamma: "float",
            whitepoint: "float"
        },
        attributes: {
            corners: "vec3"
        },
        vertexShader: tone_mapping_vert,
        fragmentShader: tone_mapping_frag
    });
}