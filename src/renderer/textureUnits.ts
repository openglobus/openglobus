// Projectors take start (depth array) .. start + MAX_FORWARD_PROJECTOR_SOURCES (image/video sources),
// so the projector block must end below the shadow start.
export const DEFAULT_PROJECTOR_TEXTURE_UNIT_START = 6;
export const DEFAULT_SHADOW_TEXTURE_UNIT_START = 10;
export const DEFAULT_CASCADE_SHADOW_TEXTURE_UNIT_START = 14;

// Terrain forward shaders use all 16 fragment texture units (the WebGL2 minimum): SLICE_SIZE layers
// and 6 others, projector depth array and MAX_FORWARD_PROJECTOR_SOURCES sources, shadow, cascade shadow.
// MAX_FORWARD_PROJECTOR_SOURCES can't grow without freeing a unit here.
export const TERRAIN_PROJECTOR_TEXTURE_UNIT_OFFSET = 6;
export const TERRAIN_SHADOW_TEXTURE_UNIT_OFFSET = 10;
export const TERRAIN_CASCADE_SHADOW_TEXTURE_UNIT_OFFSET = 11;
