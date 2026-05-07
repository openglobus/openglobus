#version 300 es
precision highp float;

uniform vec4 uColor;
uniform float uOpacity;

layout(location=0) out vec4 outColor;

void main(void) {
    outColor = vec4(uColor.rgb, uColor.a * uOpacity);
}
