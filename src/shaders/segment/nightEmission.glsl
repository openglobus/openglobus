#ifndef OG_NIGHT_EMISSION_GLSL
#define OG_NIGHT_EMISSION_GLSL

const float NIGHT_SPECULAR_MIN_CAM_HEIGHT = 3000000.0;

vec3 getNightEmission(
in vec3 normal,
in vec3 sunPos,
in vec4 emissionImageColor,
in float emissionTextureCoefficient,
in float cameraHeight)
{
    float maxH = NIGHT_SPECULAR_MIN_CAM_HEIGHT * 3.0;
    float emissionCoef = getLerpValue(NIGHT_SPECULAR_MIN_CAM_HEIGHT, maxH, cameraHeight) * emissionTextureCoefficient;

    vec3 lightDir = normalize(sunPos);
    float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);

    vec3 emission = nightStep * (.18 - diffuseLightWeighting * 3.0) * emissionImageColor.rgb * emissionCoef;

    return emission * step(0.0, emission);
}

#endif
