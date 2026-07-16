import { ShaderProgram } from "../../webgl/ShaderProgram";
import { stringTemplate2 } from "../../utils/shared";

import tone_mapping_vert from "./tone_mapping.vert.glsl";
import tone_mapping_frag from "./tone_mapping.frag.glsl";

export function toneMappingProgram(operator: string = "TONE_MAPPING_REINHARD_WHITE"): ShaderProgram {
    const uniforms: Record<string, string> = {
        hdrBuffer: "sampler2d",
        exposure: "float",
        gamma: "float"
    };

    if (operator === "TONE_MAPPING_REINHARD_WHITE" || operator === "TONE_MAPPING_UNCHARTED2") {
        uniforms.whitepoint = "float";
    }

    return new ShaderProgram("toneMapping", {
        uniforms,
        attributes: {
            corners: "vec3"
        },
        vertexShader: tone_mapping_vert,
        fragmentShader: stringTemplate2(tone_mapping_frag, { operator })
    });
}
