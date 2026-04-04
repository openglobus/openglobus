#version 300 es

precision highp float;

#include "../common/utils.glsl"
#include "./common.glsl"
#include "./nightEmission.glsl"
#include "../common/lighting.glsl"

uniform vec4 specular;
uniform vec3 diffuse;
uniform vec3 ambient;

uniform sampler2D uNormalMap;
uniform sampler2D nightTexture;
uniform sampler2D specularTexture;
uniform sampler2D defaultTexture;
uniform sampler2D samplerArr[SLICE_SIZE];

uniform vec4 tileOffsetArr[SLICE_SIZE];
uniform vec3 lightPosition;
uniform float layerOpacityArr[SLICE_SIZE];

uniform int samplerCount;
uniform float nightTextureCoefficient;

uniform float transitionOpacity;

uniform float camHeight;
uniform float shadeMode;

in vec4 vTextureCoord;
in vec3 v_vertex;
in vec3 cameraPosition;
in vec2 vGlobalTextureCoord;
in float v_height;

vec3 sunPos;

layout (location = 0) out vec4 fragColor;

void main(void) {

    sunPos = lightPosition;

    vec3 texNormal = texture(uNormalMap, vTextureCoord.zw).rgb;
    vec3 normal = shadeMode < 0.5
        ? normalize(v_vertex)
        : normalize((texNormal - 0.5) * 2.0);

    float specularMask = 0.0;
    vec3 emission = vec3(0.0);
    if (camHeight >= NIGHT_SPECULAR_MIN_CAM_HEIGHT) {
        float overGround = 1.0 - step(0.1, v_height);
        specularMask = texture(specularTexture, vGlobalTextureCoord.st).r * overGround;

        vec4 emissionImageColor = texture(nightTexture, vGlobalTextureCoord.st);
        emission = overGround * getNightEmission(normal, sunPos, emissionImageColor, nightTextureCoefficient, camHeight);
    }

    vec4 lightWeighting;
    vec3 specularWeighting;

    getPhongLighting(
    v_vertex,
    normal,
    cameraPosition,
    sunPos,
    ambient,
    diffuse,
    specular,
    specularMask,
    specularWeighting,
    lightWeighting
    );

    fragColor = texture(defaultTexture, vTextureCoord.xy);

    if (samplerCount == 0) {
        fragColor = vec4(fragColor.rgb * lightWeighting.rgb + specularWeighting + emission, fragColor.a);
        fragColor *= transitionOpacity;
        return;
    }

    vec4 src;

    blend(fragColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
    if (samplerCount == 1) {
        fragColor = vec4(fragColor.rgb * lightWeighting.rgb + specularWeighting + emission, fragColor.a);
        fragColor *= transitionOpacity;
        return;
    }

    blend(fragColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
    if (samplerCount == 2) {
        fragColor = vec4(fragColor.rgb * lightWeighting.rgb + specularWeighting + emission, fragColor.a);
        fragColor *= transitionOpacity;
        return;
    }

    blend(fragColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
    if (samplerCount == 3) {
        fragColor = vec4(fragColor.rgb * lightWeighting.rgb + specularWeighting + emission, fragColor.a);
        fragColor *= transitionOpacity;
        return;
    }

    blend(fragColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
    if (samplerCount == 4) {
        fragColor = vec4(fragColor.rgb * lightWeighting.rgb + specularWeighting + emission, fragColor.a);
        fragColor *= transitionOpacity;
        return;
    }

    blend(fragColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
    fragColor = vec4(fragColor.rgb * lightWeighting.rgb + specularWeighting + emission, fragColor.a);
    fragColor *= transitionOpacity;
}
