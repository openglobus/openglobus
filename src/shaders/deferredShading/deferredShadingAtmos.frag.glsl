#version 300 es

precision highp float;

#include "../atmos/common.glsl"
#include "../common/lighting.glsl"

uniform sampler2D baseTexture;
uniform sampler2D materialsTexture;
uniform sampler2D normalTexture;
uniform sampler2D positionTexture;
uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;

uniform vec3 lightPosition;
uniform vec3 lightAmbient;
uniform vec3 lightDiffuse;
uniform vec4 lightSpecular;
uniform vec3 cameraPosition;
uniform vec2 maxMinOpacity;

layout (location = 0) out vec4 fragColor;

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
    float mu_s = dot(normalize(point), lightDir);
    float height = length(point) - BOTTOM_RADIUS;
    sunIlluminance = SUN_INTENSITY * transmittanceFromTexture(height, mu_s);
}

void atmosGroundColor(in vec3 _v_vertex, in vec3 _normal, in vec3 _cameraPosition, in vec3 _sunPos, out vec4 outColor)
{
    if (length(_cameraPosition * SPHERE_TO_ELLIPSOID_SCALE) < BOTTOM_RADIUS + 1.0) {
        _cameraPosition = normalize(_cameraPosition * SPHERE_TO_ELLIPSOID_SCALE) * (BOTTOM_RADIUS + 1.0) / SPHERE_TO_ELLIPSOID_SCALE;
    }

    vec3 rayDirection = normalize(_v_vertex - _cameraPosition);
    vec3 lightDir = normalize(_sunPos);

    rayDirection = normalize(rayDirection * SPHERE_TO_ELLIPSOID_SCALE);
    vec3 camPos = _cameraPosition * SPHERE_TO_ELLIPSOID_SCALE;
    lightDir = normalize(lightDir * SPHERE_TO_ELLIPSOID_SCALE);

    vec3 light = vec3(0.0);
    vec3 transmittanceFromCameraToSpace = vec3(1.0);
    float offset = 0.0;
    float distanceToSpace = 0.0;

    intersectSphere(camPos, rayDirection, TOP_RADIUS, offset, distanceToSpace);

    vec3 rayOrigin = camPos;

    if (offset > 0.0) {
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

    if (length(_v_vertex * SPHERE_TO_ELLIPSOID_SCALE) > BOTTOM_RADIUS) {
        distanceToGround = distance(camPos, _v_vertex * SPHERE_TO_ELLIPSOID_SCALE);
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

    float lightAngle = dot(_normal, lightDir);
    vec3 tA = transmittanceCamera * GROUND_ALBEDO * SUN_INTENSITY;
    vec3 scatteringLight = multipleScatteringContributionFromTexture(height, lightAngle);
    vec3 diffuseTransmittanceLight = transmittanceLight * diffuseAngle;
    light += tA * (scatteringLight + diffuseTransmittanceLight);

    outColor = vec4(pow(light * 8.0, vec3(1.0 / 2.2)), 1.0);
}

void getAtmosFadingOpacity(in vec3 _v_vertex, in vec3 _cameraPosition, out float opacity)
{
    float c = length(_cameraPosition);
    float maxDist = sqrt(c * c - BOTTOM_RADIUS * BOTTOM_RADIUS);
    float minDist = c - BOTTOM_RADIUS;
    float vertDist = distance(_cameraPosition, _v_vertex);
    opacity = clamp(maxMinOpacity.y + (maxMinOpacity.x - maxMinOpacity.y) * getLerpValue(minDist, maxDist, vertDist), 0.0, 1.0);
}

void main(void) {
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 baseColor = texelFetch(baseTexture, fragCoord, 0);

    if (baseColor.a <= 1e-4) discard;

    vec4 materials = texelFetch(materialsTexture, fragCoord, 0);
    vec4 normalColor = texelFetch(normalTexture, fragCoord, 0);
    vec3 vertex = texelFetch(positionTexture, fragCoord, 0).xyz;
    vec3 normal = normalize(normalColor.rgb * 2.0 - 1.0);

    float specularMask = materials.r;

    vec3 sunPos = lightPosition;
    vec3 lightDir = normalize(sunPos);
    vec3 viewDir = normalize(cameraPosition - vertex);

    vec4 lightWeighting;
    vec3 specularWeighting;

    getPhongLighting(
        vertex,
        normal,
        cameraPosition,
        sunPos,
        lightAmbient,
        lightDiffuse,
        lightSpecular,
        specularMask,
        specularWeighting,
        lightWeighting
    );

    vec4 atmosColor;
    atmosGroundColor(vertex, normal, cameraPosition, sunPos, atmosColor);

    vec3 sunIlluminance;
    getSunIlluminance(cameraPosition, viewDir * SPHERE_TO_ELLIPSOID_SCALE, sunIlluminance);
    specularWeighting *= sunIlluminance;

    float fadingOpacity;
    getAtmosFadingOpacity(vertex, cameraPosition, fadingOpacity);

    fragColor = mix(baseColor * lightWeighting, atmosColor * baseColor.a, fadingOpacity) + vec4(specularWeighting, 0.0);
}
