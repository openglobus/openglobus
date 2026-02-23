#version 300 es

precision highp float;

uniform sampler2D diffuseTexture;
uniform sampler2D normalTexture;
uniform sampler2D depthTexture;

layout (location = 0) out vec4 fragColor;

void main(void) {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 diffuseColor = texelFetch(diffuseTexture, fragCoord, 0);

    if (diffuseColor.a <= 1e-4) discard;

    vec4 normalColor = texelFetch(normalTexture, fragCoord, 0);
    vec4 depthColor = texelFetch(depthTexture, fragCoord, 0);

    // Keep these textures referenced to avoid uniform elimination in some drivers.
    float keepAlive = (normalColor.r + depthColor.r) * 1e-7;
    fragColor = vec4(diffuseColor.rgb + vec3(keepAlive), diffuseColor.a);
}
