#version 300 es

precision highp float;

#include "../common/utils.glsl"
#include "./common.glsl"
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
    vec3 normal = normalize((texNormal - 0.5) * 2.0);

    float overGround = 1.0 - step(0.1, v_height);
    float specularMask = texture(specularTexture, vGlobalTextureCoord.st).r * overGround;

    vec4 lightWeighting;
    vec3 specularWeighting;

    if (shadeMode < 0.5) {
        lightWeighting = vec4(1.0);
        specularWeighting = vec3(0.0);
    } else {
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

        float minH = 1200000.0;
        float maxH = minH * 3.0;
        float nightCoef = getLerpValue(minH, maxH, camHeight) * nightTextureCoefficient;

        vec3 lightDir = normalize(sunPos - v_vertex);
        float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);
        vec4 nightImageColor = texture(nightTexture, vGlobalTextureCoord.st);
        vec3 night = nightStep * (.18 - diffuseLightWeighting * 3.0) * nightImageColor.rgb * nightCoef;
        night *= overGround * step(0.0, night);

        lightWeighting += vec4(night, 0.0);
    }

    fragColor = texture(defaultTexture, vTextureCoord.xy);

    if (samplerCount == 0) {
        fragColor = fragColor * lightWeighting + vec4(specularWeighting, 0.0);
        fragColor *= transitionOpacity;
        return;
    }

    vec4 src;

    blend(fragColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
    if (samplerCount == 1) {
        fragColor = fragColor * lightWeighting + vec4(specularWeighting, 0.0);
        fragColor *= transitionOpacity;
        return;
    }

    blend(fragColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
    if (samplerCount == 2) {
        fragColor = fragColor * lightWeighting + vec4(specularWeighting, 0.0);
        fragColor *= transitionOpacity;
        return;
    }

    blend(fragColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
    if (samplerCount == 3) {
        fragColor = fragColor * lightWeighting + vec4(specularWeighting, 0.0);
        fragColor *= transitionOpacity;
        return;
    }

    blend(fragColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
    if (samplerCount == 4) {
        fragColor = fragColor * lightWeighting + vec4(specularWeighting, 0.0);
        fragColor *= transitionOpacity;
        return;
    }

    blend(fragColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
    fragColor = fragColor * lightWeighting + vec4(specularWeighting, 0.0);
    fragColor *= transitionOpacity;
}
