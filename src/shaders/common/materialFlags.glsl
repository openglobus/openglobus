#ifndef OG_MATERIAL_FLAGS_GLSL
#define OG_MATERIAL_FLAGS_GLSL

precision highp int;

const uint MATERIAL_RECEIVE_PROJECTORS_BIT = 1u << 0u;
const uint MATERIAL_RECEIVE_FRAME_TRANSPARENCY_BIT = 1u << 1u;

uint packMaterialFlags(
    uint receiveProjectors,
    uint receiveFrameTransparency
) {
    return receiveProjectors | (receiveFrameTransparency << 1u);
}

bool materialReceivesProjectors(uint flags) {
    return (flags & MATERIAL_RECEIVE_PROJECTORS_BIT) != 0u;
}

bool materialReceivesFrameTransparency(uint flags) {
    return (flags & MATERIAL_RECEIVE_FRAME_TRANSPARENCY_BIT) != 0u;
}

float materialReceivesFrameTransparencyMask(uint flags) {
    return float((flags & MATERIAL_RECEIVE_FRAME_TRANSPARENCY_BIT) != 0u);
}

#endif
