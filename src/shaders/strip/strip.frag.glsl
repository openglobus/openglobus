precision highp float;

uniform vec4 uColor;
uniform float uOpacity;

void main(void) {
    gl_FragColor = vec4(uColor.rgb, uColor.a * uOpacity);
}
