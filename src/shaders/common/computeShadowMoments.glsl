vec2 computeShadowMoments(float depth) {
    float dx = dFdx(depth);
    float dy = dFdy(depth);
    return vec2(depth, depth * depth + 0.25 * (dx * dx + dy * dy));
}
