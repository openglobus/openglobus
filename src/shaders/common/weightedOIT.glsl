float weightedOITWeight(float z, float a) {
    return clamp(pow(min(1.0, a * 10.0) + 0.01, 3.0) * 1e8 * pow(1.0 - z * 0.9, 3.0), 1e-2, 3e3);
}

void weightedOITAccumulate(in vec4 color, out vec4 outAccumColor, out float outAccumAlpha) {
    vec4 c = color;
    c.rgb *= c.a;
    float w = weightedOITWeight(gl_FragCoord.z, c.a);
    outAccumColor = vec4(c.rgb * w, c.a);
    outAccumAlpha = c.a * w;
}
