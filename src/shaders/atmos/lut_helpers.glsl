// Requires atmos/common.glsl (ATMOS_HEIGHT, BOTTOM_RADIUS, SUN_INTENSITY) and:
//   uniform sampler2D transmittanceTexture;
//   uniform sampler2D scatteringTexture;
// GLSL ES 3.00 / WebGL2: use texture()

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
