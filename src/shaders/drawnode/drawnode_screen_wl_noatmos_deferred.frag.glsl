#version 300 es

precision highp float;

#include "../common/utils.glsl"
#include "./common.glsl"
#include "../common/lighting.glsl"

uniform sampler2D uNormalMap;
//uniform sampler2D nightTexture;
uniform sampler2D specularTexture;
uniform sampler2D defaultTexture;
uniform sampler2D samplerArr[SLICE_SIZE];

uniform vec4 tileOffsetArr[SLICE_SIZE];
uniform vec3 lightPosition;
uniform float layerOpacityArr[SLICE_SIZE];

uniform int samplerCount;
//uniform float nightTextureCoefficient;
//uniform float camHeight;

in vec4 vTextureCoord;
in vec3 v_vertex;
in vec3 cameraPosition;
in vec2 vGlobalTextureCoord;
in float v_height;

vec3 sunPos;

layout (location = 0) out vec4 diffuseColor;
layout (location = 1) out vec4 materials;
layout (location = 2) out vec4 normalColor;
layout (location = 3) out vec4 positionColor;

void main(void) {

    sunPos = lightPosition;

    vec3 texNormal = texture(uNormalMap, vTextureCoord.zw).rgb;
    vec3 normal = normalize((texNormal - 0.5) * 2.0);

    //float minH = 1200000.0;
    //float maxH = minH * 3.0;
    //float nightCoef = getLerpValue(minH, maxH, camHeight) * nightTextureCoefficient;

    // if(camHeight > 6000000.0)
    // {
    //     normal = normalize(v_vertex);
    // }

    //    vec3 lightDir = normalize(sunPos);
    //    vec3 viewDir = normalize(cameraPosition - v_vertex);

    float overGround = 1.0 - step(0.1, v_height);
    float specularMask = texture(specularTexture, vGlobalTextureCoord.st).r * overGround;

    materials = vec4(specularMask, 0.0, 0.0, 1.0);
    positionColor = vec4(v_vertex, 1.0);

    /*
    vec4 nightImageColor = texture(nightTexture, vGlobalTextureCoord.st);
    vec3 night = nightStep * (.18 - diffuseLightWeighting * 3.0) * nightImageColor.rgb * nightCoef;
    night *= overGround * step(0.0, night);
    */

    diffuseColor = texture(defaultTexture, vTextureCoord.xy);
    normalColor = vec4(normal * 0.5 + 0.5, 1.0);

    if (samplerCount == 0)return;

    vec4 src;//used in blend function

    blend(diffuseColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
    if (samplerCount == 1) return;

    blend(diffuseColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
    if (samplerCount == 2)return;

    blend(diffuseColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
    if (samplerCount == 3)return;

    blend(diffuseColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
    if (samplerCount == 4)return;

    blend(diffuseColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
}
