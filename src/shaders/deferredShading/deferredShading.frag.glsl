#version 300 es

precision highp float;

uniform sampler2D diffuseTexture;
uniform sampler2D normalTexture;
uniform sampler2D depthTexture;

in vec2 tc;

layout (location = 0) out vec4 fragColor;

void main(void) {
    vec4 diffuseColor = texture(diffuseTexture, tc);

    if (diffuseColor.a <= 1e-4) discard;

    vec4 normalColor = texture(normalTexture, tc);
    vec4 depthColor = texture(depthTexture, tc);

    fragColor = vec4(mix(diffuseColor.rgb, normalColor.rgb, 0.5), 1.0);

    fragColor = vec4(depthColor.r, depthColor.r, depthColor.r, 1.0);

    fragColor = vec4(diffuseColor.rgb, 1.0);

}