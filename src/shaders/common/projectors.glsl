const int MAX_PROJECTORS = 16;

uniform int u_projectorCount;
uniform int u_projectorLayer[MAX_PROJECTORS];
uniform mat4 u_projectorViewProjRTE[MAX_PROJECTORS];
uniform vec3 u_projectorEyeRel[MAX_PROJECTORS];
uniform vec4 u_projectorColorIntensity[MAX_PROJECTORS];
uniform vec4 u_projectorParams[MAX_PROJECTORS];

uniform highp sampler2DArray u_projectorDepthArray;

float sampleProjectorDepth(int index, vec2 uv) {
    return texture(u_projectorDepthArray, vec3(uv, float(u_projectorLayer[index]))).r;
}

vec2 getProjectorTexelSize() {
    return 1.0 / vec2(textureSize(u_projectorDepthArray, 0).xy);
}

float getProjectorVisibility(int projectorIndex, vec3 rtcPos, vec3 normal) {
    vec3 biasedRtcPos = rtcPos + normal * u_projectorParams[projectorIndex].y;
    vec3 projectorRelPos = biasedRtcPos - u_projectorEyeRel[projectorIndex];
    vec4 clip = u_projectorViewProjRTE[projectorIndex] * vec4(projectorRelPos, 1.0);

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

    float bias = u_projectorParams[projectorIndex].x;
    float depthEpsilon = u_projectorParams[projectorIndex].w;
    float depthThreshold = bias + depthEpsilon;

    vec2 texelSize = getProjectorTexelSize();
    float visibility = 0.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 uvOffset = uv + vec2(float(x), float(y)) * texelSize;
            if (uvOffset.x < 0.0 || uvOffset.x > 1.0 || uvOffset.y < 0.0 || uvOffset.y > 1.0) {
                continue;
            }
            float mapDepth = sampleProjectorDepth(projectorIndex, uvOffset);
            visibility = max(visibility, step(receiverDepth, mapDepth + depthThreshold));
        }
    }

    return visibility;
}

vec3 applyProjector(int projectorIndex, vec3 rtcPos, vec3 normal) {
    float visibility = getProjectorVisibility(projectorIndex, rtcPos, normal);
    vec4 colorIntensity = u_projectorColorIntensity[projectorIndex];
    float opacity = u_projectorParams[projectorIndex].z;

    return colorIntensity.rgb * colorIntensity.a * opacity * visibility;
}

vec3 applyProjectors(vec3 rtcPos, vec3 normal) {
    vec3 contribution = vec3(0.0);

    for (int i = 0; i < MAX_PROJECTORS; i++) {
        if (i >= u_projectorCount) {
            break;
        }
        contribution += applyProjector(i, rtcPos, normal);
    }

    return contribution;
}
