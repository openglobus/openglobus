float msdfMedian(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float msdfGetDistance(highp sampler2DArray fontTextureArr, vec2 uv, int fontIndex) {
    vec3 msdf = texture(fontTextureArr, vec3(uv, float(fontIndex))).rgb;
    return msdfMedian(msdf.r, msdf.g, msdf.b);
}

float msdfGetScreenPxRange(vec2 uv, vec2 atlasSize, float pxRange) {
    vec2 unitRange = vec2(pxRange) / atlasSize;
    vec2 screenTexSize = vec2(1.0) / max(fwidth(uv), vec2(1e-6));
    return max(0.5 * dot(unitRange, screenTexSize), 1.0);
}
