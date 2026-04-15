// Packs shade mode into normal G-buffer .a (RGBA8): 0 unlit, 1 Phong, 2 PBR.
#ifndef SHADE_MODE_GLSL
#define SHADE_MODE_GLSL

const uint SHADE_MODE_UNLIT = 0u;
const uint SHADE_MODE_PHONG = 1u;
const uint SHADE_MODE_PBR = 2u;

float encodeShadeModeUint(uint mode) {
    return float(mode) / 255.0;
}

uint decodeShadeMode(float a) {
    return uint(a * 255.0 + 0.5);
}

uint shadeModeToUint(float m) {
    return uint(clamp(floor(m + 0.5), 0.0, 2.0));
}

#endif
