#version 300 es

precision highp float;

#include "./common.glsl"

#include "../common/shadeMode.glsl"
#include "../atmos/common.glsl"
#include "./nightEmission.glsl"
#include "../common/lighting.glsl"
#include "../common/lightingFeatures.glsl"

uniform vec4 specular;
uniform vec3 diffuse;
uniform vec3 ambient;

uniform vec3 lightPosition;

uniform sampler2D uNormalMap;
uniform sampler2D nightTexture;
uniform sampler2D specularTexture;
uniform sampler2D atmosLutTexture;

uniform sampler2D defaultTexture;
uniform sampler2D samplerArr[SLICE_SIZE];

uniform vec4 tileOffsetArr[SLICE_SIZE];
uniform float layerOpacityArr[SLICE_SIZE];

uniform int samplerCount;

uniform vec2 atmosFadeDist;
uniform vec3 atmosMaxMinOpacity;
uniform float nightFactor;
uniform float specularFactor;

uniform float transitionOpacity;
uniform float shadeMode;
uniform float frameOpacity;
uniform vec3 cameraPosition;
uniform vec3 cameraForward;
uniform float isOrthographic;

#include "../atmos/lut_helpers.glsl"
#include "../atmos/atmosGroundColor.glsl"
#include "../atmos/aerialPerspective.glsl"

in vec4 vTextureCoord;
in vec3 v_worldVertex;
in vec3 v_rtcPos;
in vec2 vGlobalTextureCoord;
in float v_height;

layout (location = 0) out vec4 diffuseColor;

void main(void) {

    diffuseColor = texture(defaultTexture, vTextureCoord.xy);
    vec4 src;

    if (samplerCount > 0) blend(diffuseColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
    if (samplerCount > 1) blend(diffuseColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
    if (samplerCount > 2) blend(diffuseColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
    if (samplerCount > 3) blend(diffuseColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);

    vec3 texNormal = texture(uNormalMap, vTextureCoord.zw).rgb;
    vec3 normal = normalize((texNormal - 0.5) * 2.0);
    vec4 projectorDecal;
    vec3 projectorLight;
    applyLightingFeatureProjectors(v_rtcPos, normal, projectorDecal, projectorLight);
    float shadowVisibility = getLightingFeatureShadowVisibility(v_rtcPos, normal);

    if (shadeMode == SHADE_UNLIT) {
        diffuseColor.rgb = applyProjectorDecal(diffuseColor.rgb, projectorDecal);
        applyPremultipliedSurfaceOpacity(diffuseColor, transitionOpacity, frameOpacity);
        return;
    }

    float overGround = 1.0 - step(0.1, v_height);

    float specularMask = 0.0;
    if (specularFactor > 0.0) {
        specularMask = specularFactor * texture(specularTexture, vGlobalTextureCoord.st).r * overGround;
    }

    vec3 emission = vec3(0.0);
    if (nightFactor > 0.0) {
        vec4 emissionImageColor = texture(nightTexture, vGlobalTextureCoord.st);
        emission = overGround * getNightEmission(normal, lightPosition, emissionImageColor, nightFactor);
    }

    vec4 lightWeighting;
    vec3 specularWeighting;

    vec3 rayOrigin;
    vec3 rayDirection;
    getAtmosViewRay(v_worldVertex, cameraPosition, cameraForward, isOrthographic, rayOrigin, rayDirection);

    vec3 sunIlluminance;
    getSunIlluminance(v_worldVertex, normalize(lightPosition), sunIlluminance);

    if (shadeMode < SHADE_PBR) {
        // PHONG mode in atmosphere forward pass: keep atmosphere contribution.
        getPhongLighting(
        v_worldVertex,
        normal,
        cameraPosition,
        lightPosition,
        ambient,
        diffuse,
        specular,
        specularMask,
        sunIlluminance,
        1.0,
        specularWeighting,
        lightWeighting
        );
    } else {
        // TODO: Real terrain PBR is not implemented yet. Keep Phong + atmosphere for PBR mode.
        getPhongLighting(
        v_worldVertex,
        normal,
        cameraPosition,
        lightPosition,
        ambient,
        diffuse,
        specular,
        specularMask,
        sunIlluminance,
        1.0,
        specularWeighting,
        lightWeighting
        );
    }
    lightWeighting.rgb = applyDirectLightVisibility(lightWeighting.rgb, ambient, 1.0, shadowVisibility);
    specularWeighting *= shadowVisibility;

    diffuseColor = vec4(
    applyProjectorDecal(
        applyAtmosphereToSurface(
            v_worldVertex,
            v_rtcPos,
            normal,
            cameraPosition,
            rayOrigin,
            rayDirection,
            lightPosition,
            diffuseColor.rgb * lightWeighting.rgb + emission,
            specularWeighting
        ) +
        diffuseColor.rgb * projectorLight,
        projectorDecal
    ),
    diffuseColor.a
    );

    applyPremultipliedSurfaceOpacity(diffuseColor, transitionOpacity, frameOpacity);
}
