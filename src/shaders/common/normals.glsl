#ifndef OG_NORMALS_GLSL
#define OG_NORMALS_GLSL

vec3 decodeNormalTexture(in vec3 normalColor) {
    return normalColor * 2.0 - 1.0;
}

mat3 getCotangentFrame(in vec3 n, in vec3 p, in vec2 uv) {
    vec3 dp1 = dFdx(p);
    vec3 dp2 = dFdy(p);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);

    vec3 t = dp1 * duv2.y - dp2 * duv1.y;
    vec3 b = dp2 * duv1.x - dp1 * duv2.x;

    float tLen2 = dot(t, t);
    float bLen2 = dot(b, b);
    float invMax = inversesqrt(max(max(tLen2, bLen2), 1e-16));
    return mat3(t * invMax, b * invMax, n);
}

vec3 applyNormalTextureInViewSpace(
in sampler2D normalTexture,
in vec2 texCoords,
in vec3 viewNormal,
in vec3 viewPosition
) {
    vec3 normalTS = decodeNormalTexture(texture(normalTexture, texCoords).rgb);
    mat3 tbn = getCotangentFrame(normalize(viewNormal), viewPosition, texCoords);
    return normalize(tbn * normalTS);
}

vec3 getNormalWorldFromTexture(
in sampler2D normalTexture,
in vec2 texCoords,
in vec3 worldNormal,
in vec3 viewPosition,
in mat3 normalMatrix
) {
    vec3 viewNormal = normalize(vec3(
        dot(normalMatrix[0], worldNormal),
        dot(normalMatrix[1], worldNormal),
        dot(normalMatrix[2], worldNormal)
    ));
    vec3 mappedViewNormal = applyNormalTextureInViewSpace(normalTexture, texCoords, viewNormal, viewPosition);
    return normalize(normalMatrix * mappedViewNormal);
}

#endif
