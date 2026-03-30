#version 300 es

precision highp float;

#include "./common.glsl"

#include "../atmos/common.glsl"
#include "../common/lighting.glsl"

uniform vec4 specular;
uniform vec3 diffuse;
uniform vec3 ambient;

uniform vec3 lightPosition;

uniform sampler2D uNormalMap;
uniform sampler2D nightTexture;
uniform sampler2D specularTexture;
uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;

#include "../atmos/lut_helpers.glsl"
#include "../atmos/atmosGroundColor.glsl"

uniform sampler2D defaultTexture;
uniform sampler2D samplerArr[SLICE_SIZE];

uniform vec4 tileOffsetArr[SLICE_SIZE];
uniform float layerOpacityArr[SLICE_SIZE];

uniform int samplerCount;
uniform float nightTextureCoefficient;

uniform vec2 maxMinOpacity;
uniform float camHeight;

uniform float transitionOpacity;
uniform float shadeMode;

in vec4 vTextureCoord;
in vec3 v_vertex;
in vec3 cameraPosition;
in vec2 vGlobalTextureCoord;
in float v_height;

vec3 sunPos;

layout (location = 0) out vec4 diffuseColor;

void main(void) {

    sunPos = lightPosition;

    vec3 texNormal = texture(uNormalMap, vTextureCoord.zw).rgb;
    vec3 normal = shadeMode < 0.5
        ? normalize(v_vertex)
        : normalize((texNormal - 0.5) * 2.0);

    float overGround = 1.0 - step(0.1, v_height);
    float specularMask = texture(specularTexture, vGlobalTextureCoord.st).r * overGround;

    vec4 lightWeighting;
    vec3 specularWeighting;
    float fadingOpacity;
    vec4 atmosColor;

    float minH = 1200000.0;
    float maxH = minH * 3.0;
    float nightCoef = getLerpValue(minH, maxH, camHeight) * nightTextureCoefficient;

    vec3 lightDir = normalize(sunPos);
    float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);
    vec4 nightImageColor = texture(nightTexture, vGlobalTextureCoord.st);
    vec3 night = nightStep * (.18 - diffuseLightWeighting * 3.0) * nightImageColor.rgb * nightCoef;
    night *= overGround * step(0.0, night);

    vec3 viewDir = normalize(cameraPosition - v_vertex);

    atmosGroundColor(v_vertex, normal, cameraPosition, sunPos, atmosColor);

    vec3 sunIlluminance;
    getSunIlluminance(v_vertex * SPHERE_TO_ELLIPSOID_SCALE, lightDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);

    getPhongLighting(
    v_vertex,
    normal,
    cameraPosition,
    sunPos,
    ambient,
    diffuse,
    specular,
    specularMask,
    sunIlluminance,
    specularWeighting,
    lightWeighting
    );

    getAtmosFadingOpacity(v_vertex, cameraPosition, maxMinOpacity, fadingOpacity);

    getSunIlluminance(cameraPosition, viewDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);

    specularWeighting *= sunIlluminance;

    lightWeighting += vec4(night, 0.0);

    diffuseColor = texture(defaultTexture, vTextureCoord.xy);

    if (samplerCount == 0) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor, fadingOpacity) + vec4(specularWeighting, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    vec4 src;

    blend(diffuseColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
    if (samplerCount == 1) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(specularWeighting, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
    if (samplerCount == 2) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(specularWeighting, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
    if (samplerCount == 3) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(specularWeighting, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
    if (samplerCount == 4) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(specularWeighting, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
    diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(specularWeighting, 0.0);
    diffuseColor *= transitionOpacity;
}
