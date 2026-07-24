float getDepthOffsetScale(float depthOffset, vec3 viewPos, float depthOffsetNear) {
    float invLen = inversesqrt(max(dot(viewPos, viewPos), 1e-12));
    float zForward = max(-viewPos.z, depthOffsetNear);
    return max(depthOffset * invLen, depthOffsetNear / zForward - 1.0);
}
