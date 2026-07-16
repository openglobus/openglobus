// Requires atmos/common.glsl and:
//   uniform sampler2D transmittanceTexture;
//   uniform sampler2D scatteringTexture;
// GLSL ES 3.00 / WebGL2: use texture()

#ifndef ATMOS_LUT_HELPERS_GLSL
#define ATMOS_LUT_HELPERS_GLSL

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
    if (!isPointInsideAtmosphere(point)) {
        sunIlluminance = vec3(1.0);
        return;
    }

    vec3 spherePoint = point * SPHERE_TO_ELLIPSOID_SCALE;
    vec3 sphereLightDir = normalize(lightDir * SPHERE_TO_ELLIPSOID_SCALE);
    float mu_s = dot(normalize(spherePoint), sphereLightDir);
    float height = length(spherePoint) - BOTTOM_RADIUS;

    sunIlluminance = SUN_INTENSITY * transmittanceFromTexture(height, mu_s);
}

#endif
