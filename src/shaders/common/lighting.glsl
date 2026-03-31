#ifndef OG_LIGHTING_GLSL
#define OG_LIGHTING_GLSL

void getPhongLighting(
in vec3 vertex,
in vec3 normal,
in vec3 cameraPos,
in vec3 lightPos,
in vec3 ambient,
in vec3 diffuse,
in vec4 specular,
in float specularMask,
out vec3 outSpecularWeighting,
out vec4 outLightWeighting
){

    vec3 lightDir = normalize(lightPos);
    vec3 viewDir = normalize(cameraPos - vertex);

    vec3 reflectionDir = reflect(-lightDir, normal);
    float reflection = max(dot(reflectionDir, viewDir), 0.0);
    float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);

    outSpecularWeighting = specular.rgb * pow(reflection, specular.w) * specularMask;
    outLightWeighting = vec4(ambient + diffuse * diffuseLightWeighting, 1.0);
}

void getPhongLighting(
in vec3 vertex,
in vec3 normal,
in vec3 cameraPos,
in vec3 lightPos,
in vec3 ambient,
in vec3 diffuse,
in vec4 specular,
in float specularMask,
in vec3 sunIlluminance,
out vec3 outSpecularWeighting,
out vec4 outLightWeighting
){

    vec3 lightDir = normalize(lightPos);
    vec3 viewDir = normalize(cameraPos - vertex);

    vec3 reflectionDir = reflect(-lightDir, normal);
    float reflection = max(dot(reflectionDir, viewDir), 0.0);
    float diffuseLightWeighting = max(dot(normal, lightDir), 0.0);

    outSpecularWeighting = sunIlluminance * specular.rgb * pow(reflection, specular.w) * specularMask;
    outLightWeighting = vec4(ambient + sunIlluminance * diffuse * diffuseLightWeighting, 1.0);
}

const float EMISSION_PACK_RANGE = 8.0;

float packEmissionColor(in vec3 emissionColor)
{
    vec3 packed = floor(clamp(emissionColor / EMISSION_PACK_RANGE, 0.0, 1.0) * 255.0 + 0.5);
    return packed.r + packed.g * 256.0 + packed.b * 65536.0;
}

vec3 unpackEmissionColor(in float packedEmission)
{
    float r = mod(packedEmission, 256.0);
    float g = mod(floor(packedEmission / 256.0), 256.0);
    float b = mod(floor(packedEmission / 65536.0), 256.0);
    return (vec3(r, g, b) / 255.0) * EMISSION_PACK_RANGE;
}

#endif
