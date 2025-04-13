#define EMPTY - 1.0
#define RTL 1.0

vec2 project(vec4 p, vec2 viewport) {
    return (0.5 * p.xyz / p.w + 0.5).xy * viewport;
}

mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle),
    sin(angle), cos(angle));
}