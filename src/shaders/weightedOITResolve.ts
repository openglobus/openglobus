import {Program} from "../webgl/Program";

export function weightedOITResolve() {
    return new Program("weightedOITResolve", {
        uniforms: {
            uAccumulate: "sampler2D",
            uAccumulateAlpha: "sampler2D"
        },
        attributes: {
            corners: "vec2"
        },
        vertexShader: `#version 300 es
            in vec2 corners;

            void main() {
                gl_Position = vec4(corners, 0.0, 1.0);

            }`,
        fragmentShader: `#version 300 es
            precision highp float;

            uniform sampler2D uAccumulate;
            uniform sampler2D uAccumulateAlpha;

            out vec4 fragColor;

            // Keep this very small: accumAlpha is stored in R16F and may get tiny at huge distances.
            const float EPS = 1e-8;

            bool isApproximatelyEqual(float a, float b)
            {
                return abs(a - b) <= (abs(a) < abs(b) ? abs(b) : abs(a)) * EPS;
            }

            float max3(vec3 v)
            {
                return max(max(v.x, v.y), v.z);
            }

            void main() {
                ivec2 fragCoord = ivec2(gl_FragCoord.xy);
                vec4 accum = texelFetch(uAccumulate, fragCoord, 0);

                float revealage = accum.a;

                if (isApproximatelyEqual(revealage, 1.0)) {
                    discard;
                }

                float accumAlpha = texelFetch(uAccumulateAlpha, fragCoord, 0).r;

                if (isinf(max3(abs(accum.rgb)))) {
                    accum.rgb = vec3(accumAlpha);
                }

                // prevent floating point precision bug (avoid biasing color at distance)
                vec3 averageColor = accum.rgb / max(accumAlpha, EPS);

                float a = 1.0 - revealage;
                fragColor = vec4(averageColor * a, a);
            }`
    });
}
