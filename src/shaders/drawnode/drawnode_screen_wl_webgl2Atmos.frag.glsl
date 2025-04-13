#version 300 es

precision highp float;

#include "./common.glsl"

#include "../atmos/common.glsl"
//#include "../common/utils.glsl"

uniform vec4 specular;
uniform vec3 diffuse;
uniform vec3 ambient;

uniform vec3 lightPosition;

uniform sampler2D uNormalMap;
uniform sampler2D nightTexture;
uniform sampler2D specularTexture;
uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;
uniform sampler2D defaultTexture;
uniform sampler2D samplerArr[SLICE_SIZE];

uniform vec4 tileOffsetArr[SLICE_SIZE];
uniform float layerOpacityArr[SLICE_SIZE];

uniform int samplerCount;
uniform float nightTextureCoefficient;

uniform vec2 maxMinOpacity;
uniform float camHeight;

uniform float transitionOpacity;

in vec4 vTextureCoord;
in vec3 v_vertex;
in vec3 cameraPosition;
in vec2 vGlobalTextureCoord;
in float v_height;

vec3 sunPos;

layout (location = 0) out vec4 diffuseColor;

vec3 transmittanceFromTexture(float height, float angle)
{
    float u = (angle + 1.0) * 0.5;
    float v = height / ATMOS_HEIGHT;
    return texture(transmittanceTexture, vec2(u, v)).xyz;
}

vec3 multipleScatteringContributionFromTexture(float height, float angle)
{
    float u = (angle + 1.0) * 0.5;
    float v = height / ATMOS_HEIGHT;
    return texture(scatteringTexture, vec2(u, v)).xyz;
}

void getSunIlluminance(in vec3 point, in vec3 lightDir, out vec3 sunIlluminance)
{
    //     float r = length(point);
    //     float mu_s = dot(point, sun_direction) / r;
    //     float height = r - BOTTOM_RADIUS;

    float mu_s = dot(normalize(point), lightDir);
    float height = length(point) - BOTTOM_RADIUS;
    sunIlluminance = SUN_INTENSITY * transmittanceFromTexture(height, mu_s);
}

void atmosGroundColor(out vec4 fragColor, in vec3 normal)
{
    vec3 cameraPosition = cameraPosition;

    if (length(cameraPosition * SPHERE_TO_ELLIPSOID_SCALE) < BOTTOM_RADIUS + 1.0) {
        cameraPosition = normalize(cameraPosition * SPHERE_TO_ELLIPSOID_SCALE) * (BOTTOM_RADIUS + 1.0) / SPHERE_TO_ELLIPSOID_SCALE;
    }

    vec3 rayDirection = normalize(v_vertex - cameraPosition);
    vec3 lightDir = normalize(sunPos);

    rayDirection = normalize(rayDirection * SPHERE_TO_ELLIPSOID_SCALE);
    vec3 camPos = cameraPosition * SPHERE_TO_ELLIPSOID_SCALE;
    lightDir = normalize(lightDir * SPHERE_TO_ELLIPSOID_SCALE);


    vec3 light = vec3(0.0);
    vec3 transmittanceFromCameraToSpace = vec3(1.0);
    float offset = 0.0;
    float distanceToSpace = 0.0;

    intersectSphere(camPos, rayDirection, TOP_RADIUS, offset, distanceToSpace);

    vec3 rayOrigin = camPos;

    // above atmosphere
    if (offset > 0.0)
    {
        // intersection of camera ray with atmosphere
        rayOrigin += rayDirection * offset;
    }

    float height = length(rayOrigin) - BOTTOM_RADIUS;
    float rayAngle = dot(rayOrigin, rayDirection) / length(rayOrigin);
    bool cameraBelow = rayAngle < 0.0;

    transmittanceFromCameraToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);

    float phaseAngle = dot(lightDir, rayDirection);
    float rayleighPhase = rayleighPhase(phaseAngle);
    float miePhase = miePhase(phaseAngle);

    float distanceToGround = 0.0;

    bool hitGround = intersectSphere(camPos, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;
    //intersectSphere(camPos, rayDirection, BOTTOM_RADIUS, distanceToGround);


    if (length(v_vertex * SPHERE_TO_ELLIPSOID_SCALE) > BOTTOM_RADIUS) {
        distanceToGround = distance(camPos, v_vertex * SPHERE_TO_ELLIPSOID_SCALE);
    }

    float segmentLength = (distanceToGround - max(offset, 0.0)) / float(SAMPLE_COUNT);

    float t = segmentLength * 0.5;

    vec3 transmittanceCamera;
    vec3 transmittanceLight;

    for (int i = 0; i < SAMPLE_COUNT; i++)
    {
        vec3 position = rayOrigin + t * rayDirection;
        float height = length(position) - BOTTOM_RADIUS;
        vec3 up = position / length(position);
        float rayAngle = dot(up, rayDirection);
        float lightAngle = dot(up, lightDir);
        vec3 transmittanceToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
        transmittanceCamera = cameraBelow ? (transmittanceToSpace / transmittanceFromCameraToSpace) : (transmittanceFromCameraToSpace / transmittanceToSpace);
        transmittanceLight = transmittanceFromTexture(height, lightAngle);
        vec2 opticalDensity = exp(-height / rayleighMieHeights);
        vec3 scatteredLight = transmittanceLight * (rayleighScatteringCoefficient * opticalDensity.x * rayleighPhase + mieScatteringCoefficient * opticalDensity.y * miePhase);
        scatteredLight += multipleScatteringContributionFromTexture(height, lightAngle) * (rayleighScatteringCoefficient * opticalDensity.x + mieScatteringCoefficient * opticalDensity.y);
        light += transmittanceCamera * scatteredLight * segmentLength;
        t += segmentLength;
    }

    light *= SUN_INTENSITY;

    vec3 hitPoint = camPos + rayDirection * distanceToGround;
    vec3 up = normalize(hitPoint);
    float diffuseAngle = max(dot(up, lightDir), 0.0);

    float lightAngle = dot(normal, lightDir);
    vec3 tA = transmittanceCamera * GROUND_ALBEDO * SUN_INTENSITY;
    vec3 scatteringLight = multipleScatteringContributionFromTexture(height, lightAngle);
    vec3 diffuseTransmittanceLight = transmittanceLight * diffuseAngle;
    light += tA * (scatteringLight + diffuseTransmittanceLight);

    fragColor = vec4(pow(light * 8.0, vec3(1.0 / 2.2)), 1.0);
}

void getAtmosFadingOpacity(out float opacity)
{
    float c = length(cameraPosition);
    float maxDist = sqrt(c * c - BOTTOM_RADIUS * BOTTOM_RADIUS);
    float minDist = c - BOTTOM_RADIUS;
    float vertDist = distance(cameraPosition, v_vertex);
    opacity = clamp(maxMinOpacity.y + (maxMinOpacity.x - maxMinOpacity.y) * getLerpValue(minDist, maxDist, vertDist), 0.0, 1.0);
}

void main(void) {

    sunPos = lightPosition;

    vec3 texNormal = texture(uNormalMap, vTextureCoord.zw).rgb;
    vec3 normal = normalize((texNormal - 0.5) * 2.0);

    float minH = 1200000.0;
    float maxH = minH * 3.0;
    float nightCoef = getLerpValue(minH, maxH, camHeight) * nightTextureCoefficient;

    // if(camHeight > 6000000.0)
    // {
    //    normal = normalize(v_vertex);
    // }

    vec3 lightDir = normalize(sunPos);
    vec3 viewDir = normalize(cameraPosition - v_vertex);

    vec4 atmosColor;
    atmosGroundColor(atmosColor, normal);

    vec3 sunIlluminance;
    getSunIlluminance(v_vertex * SPHERE_TO_ELLIPSOID_SCALE, lightDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);

    float overGround = 1.0 - step(0.1, v_height);

    float shininess = texture(specularTexture, vGlobalTextureCoord.st).r * 255.0 * overGround;
    vec3 reflectionDirection = reflect(-lightDir, normal);
    float reflection = max(dot(reflectionDirection, viewDir), 0.0);
    vec3 spec = sunIlluminance * specular.rgb * pow(reflection, specular.w) * shininess;
    float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);

    vec4 nightImageColor = texture(nightTexture, vGlobalTextureCoord.st);
    vec3 night = nightStep * (.18 - diffuseLightWeighting * 3.0) * nightImageColor.rgb * nightCoef;
    night *= overGround * step(0.0, night);
    vec4 lightWeighting = vec4(ambient + sunIlluminance * diffuse * diffuseLightWeighting + night, 1.0);

    float fadingOpacity;
    getAtmosFadingOpacity(fadingOpacity);

    getSunIlluminance(cameraPosition, viewDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);

    spec *= sunIlluminance;

    diffuseColor = texture(defaultTexture, vTextureCoord.xy);
    if (samplerCount == 0) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor, fadingOpacity) + vec4(spec, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    vec4 src;

    blend(diffuseColor, samplerArr[0], tileOffsetArr[0], layerOpacityArr[0]);
    if (samplerCount == 1) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[1], tileOffsetArr[1], layerOpacityArr[1]);
    if (samplerCount == 2) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[2], tileOffsetArr[2], layerOpacityArr[2]);
    if (samplerCount == 3) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[3], tileOffsetArr[3], layerOpacityArr[3]);
    if (samplerCount == 4) {
        diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
        diffuseColor *= transitionOpacity;
        return;
    }

    blend(diffuseColor, samplerArr[4], tileOffsetArr[4], layerOpacityArr[4]);
    diffuseColor = mix(diffuseColor * lightWeighting, atmosColor * diffuseColor.a, fadingOpacity) + vec4(spec, 0.0);
    diffuseColor *= transitionOpacity;
}