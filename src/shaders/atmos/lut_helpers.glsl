// Requires atmos/common.glsl and:
//   uniform sampler2D atmosLutTexture;
// The left half of atmosLutTexture is transmittance, the right half is multiple scattering.
// GLSL ES 3.00 / WebGL2: use texture()

#ifndef ATMOS_LUT_HELPERS_GLSL
#define ATMOS_LUT_HELPERS_GLSL

// Must match ATMOS_LUT_SIZE in Atmosphere.ts
#define ATMOS_LUT_SIZE 1024.0
#define ATMOS_LUT_HALF_TEXEL_U (0.5 / (2.0 * ATMOS_LUT_SIZE))

vec2 atmosLutUv(float height, float angle)
{
    float u = clamp((angle + 1.0) * 0.25, ATMOS_LUT_HALF_TEXEL_U, 0.5 - ATMOS_LUT_HALF_TEXEL_U);
    return vec2(u, height / ATMOS_HEIGHT);
}

vec3 transmittanceFromTexture(float height, float angle)
{
    return texture(atmosLutTexture, atmosLutUv(height, angle)).xyz;
}

vec3 multipleScatteringContributionFromTexture(float height, float angle)
{
    vec2 uv = atmosLutUv(height, angle);
    uv.x += 0.5;
    return texture(atmosLutTexture, uv).xyz;
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
