#version 300 es

precision highp float;

uniform sampler2D diffuseTexture;
uniform sampler2D normalTexture;

in vec2 tc;

layout (location = 0) out vec4 fragColor;

void main(void) {
    vec4 diffuseColor = texture(diffuseTexture, tc);
    vec4 normalColor = texture(normalTexture, tc);

    fragColor = vec4(diffuseColor.rgb, 1.0);
}