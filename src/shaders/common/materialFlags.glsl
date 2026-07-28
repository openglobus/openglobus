#ifndef OG_MATERIAL_FLAGS_GLSL
#define OG_MATERIAL_FLAGS_GLSL

precision highp int;

const uint MATERIAL_RECEIVE_PROJECTORS_BIT = 1u << 0u;
const uint MATERIAL_RECEIVE_FRAME_TRANSPARENCY_BIT = 1u << 1u;
const uint MATERIAL_RECEIVE_SHADOWS_BIT = 1u << 2u;

uint packMaterialFlags(
    uint receiveProjectors,
    uint receiveFrameTransparency,
    uint receiveShadows
) {
    return receiveProjectors | (receiveFrameTransparency << 1u) | (receiveShadows << 2u);
}

bool materialReceivesProjectors(uint flags) {
    return (flags & MATERIAL_RECEIVE_PROJECTORS_BIT) != 0u;
}

float materialReceivesProjectorsMask(uint flags) {
    return float((flags & MATERIAL_RECEIVE_PROJECTORS_BIT) != 0u);
}

bool materialReceivesFrameTransparency(uint flags) {
    return (flags & MATERIAL_RECEIVE_FRAME_TRANSPARENCY_BIT) != 0u;
}

float materialReceivesFrameTransparencyMask(uint flags) {
    return float((flags & MATERIAL_RECEIVE_FRAME_TRANSPARENCY_BIT) != 0u);
}

bool materialReceivesShadows(uint flags) {
    return (flags & MATERIAL_RECEIVE_SHADOWS_BIT) != 0u;
}

float materialReceivesShadowsMask(uint flags) {
    return float((flags & MATERIAL_RECEIVE_SHADOWS_BIT) != 0u);
}

#endif
