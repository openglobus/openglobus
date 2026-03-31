#ifndef OG_NIGHT_EMISSION_GLSL
#define OG_NIGHT_EMISSION_GLSL

vec3 getNightEmission(
    in vec3 normal,
    in vec3 sunPos,
    in vec4 emissionImageColor,
    in float emissionTextureCoefficient,
    in float cameraHeight,
    in float vertexHeight
)
{
    float minH = 1200000.0;
    float maxH = minH * 3.0;
    float emissionCoef = getLerpValue(minH, maxH, cameraHeight) * emissionTextureCoefficient;

    vec3 lightDir = normalize(sunPos);
    float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);

    vec3 emission = nightStep * (.18 - diffuseLightWeighting * 3.0) * emissionImageColor.rgb * emissionCoef;

    float overGround = 1.0 - step(0.1, vertexHeight);
    emission *= overGround * step(0.0, emission);

    return emission;
}

#endif
