const int MAX_PROJECTORS = 4;

uniform int u_projectorCount;
uniform mat4 u_projectorViewProj[MAX_PROJECTORS];
uniform vec4 u_projectorColorIntensity[MAX_PROJECTORS];
uniform vec4 u_projectorParams[MAX_PROJECTORS];

uniform sampler2D u_projectorDepth0;
uniform sampler2D u_projectorDepth1;
uniform sampler2D u_projectorDepth2;
uniform sampler2D u_projectorDepth3;

float sampleProjectorDepth(int index, vec2 uv) {
    if (index == 0) return texture(u_projectorDepth0, uv).r;
    if (index == 1) return texture(u_projectorDepth1, uv).r;
    if (index == 2) return texture(u_projectorDepth2, uv).r;
    return texture(u_projectorDepth3, uv).r;
}

float getProjectorVisibility(int projectorIndex, vec3 worldPos, vec3 normal) {
    vec3 biasedWorldPos = worldPos + normal * u_projectorParams[projectorIndex].y;
    vec4 clip = u_projectorViewProj[projectorIndex] * vec4(biasedWorldPos, 1.0);

    if (abs(clip.w) <= 1e-6) {
        return 0.0;
    }

    vec3 ndc = clip.xyz / clip.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    float receiverDepth = ndc.z * 0.5 + 0.5;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return 0.0;
    }

    if (receiverDepth < 0.0 || receiverDepth > 1.0) {
        return 0.0;
    }

    float mapDepth = sampleProjectorDepth(projectorIndex, uv);
    float bias = u_projectorParams[projectorIndex].x;

    return step(receiverDepth, mapDepth + bias);
}

vec3 applyProjector(int projectorIndex, vec3 worldPos, vec3 normal) {
    float visibility = getProjectorVisibility(projectorIndex, worldPos, normal);
    vec4 colorIntensity = u_projectorColorIntensity[projectorIndex];
    float opacity = u_projectorParams[projectorIndex].z;

    return colorIntensity.rgb * colorIntensity.a * opacity * visibility;
}

vec3 applyProjectors(vec3 worldPos, vec3 normal) {
    vec3 contribution = vec3(0.0);

    for (int i = 0; i < MAX_PROJECTORS; i++) {
        if (i >= u_projectorCount) {
            break;
        }
        contribution += applyProjector(i, worldPos, normal);
    }

    return contribution;
}
