#version 300 es

precision highp float;

#include "./common.glsl"

#include "../atmos/common.glsl"
#include "./nightEmission.glsl"
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

uniform vec2 atmosFadeDist;
uniform float camHeight;

uniform float transitionOpacity;
uniform float shadeMode;

in vec4 vTextureCoord;
in vec3 v_worldVertex;
in vec3 cameraPosition;
in vec2 vGlobalTextureCoord;
in float v_height;

vec3 sunPos;

layout (location = 0) out vec4 diffuseColor;

void main(void) {

    sunPos = lightPosition;

    vec3 texNormal = texture(uNormalMap, vTextureCoord.zw).rgb;
    vec3 normal = shadeMode < 0.5
        ? normalize(v_worldVertex)
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
    float fadingOpacity;
    vec4 atmosColor;

    vec3 viewDir = normalize(cameraPosition - v_worldVertex);

    atmosGroundColor(v_worldVertex, normal, cameraPosition, sunPos, atmosColor);

    vec3 sunIlluminance;
    getSunIlluminance(v_worldVertex * SPHERE_TO_ELLIPSOID_SCALE, normalize(sunPos) * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);

    getPhongLighting(
    v_worldVertex,
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

    getAtmosFadingOpacity(v_worldVertex, cameraPosition, atmosFadeDist, fadingOpacity);

    getSunIlluminance(cameraPosition, viewDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);

    specularWeighting *= sunIlluminance;

    diffuseColor = texture(defaultTexture, vTextureCoord.xy);

    if (samplerCount == 0) {
        diffuseColor = vec4(
            mix(diffuseColor.rgb * lightWeighting.rgb + emission, atmosColor.rgb, fadingOpacity) + specularWeighting,
            diffuseColor.a
        );
        diffuseColor *= transitionOpacity;
        return;
    }

    vec4 src;

    blend(diffuseColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
    if (samplerCount == 1) {
        diffuseColor = vec4(
            mix(diffuseColor.rgb * lightWeighting.rgb + emission, atmosColor.rgb, fadingOpacity) + specularWeighting,
            diffuseColor.a
        );
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
    if (samplerCount == 2) {
        diffuseColor = vec4(
            mix(diffuseColor.rgb * lightWeighting.rgb + emission, atmosColor.rgb, fadingOpacity) + specularWeighting,
            diffuseColor.a
        );
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
    if (samplerCount == 3) {
        diffuseColor = vec4(
            mix(diffuseColor.rgb * lightWeighting.rgb + emission, atmosColor.rgb, fadingOpacity) + specularWeighting,
            diffuseColor.a
        );
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
    if (samplerCount == 4) {
        diffuseColor = vec4(
            mix(diffuseColor.rgb * lightWeighting.rgb + emission, atmosColor.rgb, fadingOpacity) + specularWeighting,
            diffuseColor.a
        );
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
    diffuseColor = vec4(
        mix(diffuseColor.rgb * lightWeighting.rgb + emission, atmosColor.rgb, fadingOpacity) + specularWeighting,
        diffuseColor.a
    );
    diffuseColor *= transitionOpacity;
}
