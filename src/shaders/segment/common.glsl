#ifndef OG_SEGMENT_COMMON_GLSL
#define OG_SEGMENT_COMMON_GLSL

#ifdef WEBGL2
    #define TEXTURE_FUNC texture
#else
    #define TEXTURE_FUNC texture2D
#endif

#define SLICE_SIZE 5

// GeoImage textures: keep this enabled to clip samples outside [0..1]
// and avoid clamp-to-edge smear with mipmaps. Set to 0 only to restore legacy behavior.
#ifndef FIX_GEOIMAGE_CLIP
    #define FIX_GEOIMAGE_CLIP 1
#endif

// Backward-compatible alias for typo variant.
#ifndef FIX_GEOIMGAE_CLIP
    #define FIX_GEOIMGAE_CLIP FIX_GEOIMAGE_CLIP
#endif

const float OG_TEXTURE_CLIP_EPS = 1e-5;

#if FIX_GEOIMGAE_CLIP
#define blend(DEST, SAMPLER, OFFSET, OPACITY) { \
vec2 og_tc = OFFSET.xy + vTextureCoord.xy * OFFSET.zw; \
float og_inside = \
    step(-OG_TEXTURE_CLIP_EPS, og_tc.x) * step(og_tc.x, 1.0 + OG_TEXTURE_CLIP_EPS) * \
    step(-OG_TEXTURE_CLIP_EPS, og_tc.y) * step(og_tc.y, 1.0 + OG_TEXTURE_CLIP_EPS); \
src = TEXTURE_FUNC(SAMPLER, clamp(og_tc, vec2(0.0), vec2(1.0))) * og_inside; \
DEST = DEST * (1.0 - src.a * OPACITY) + src * OPACITY; \
}

#define blendPicking(DEST, OFFSET, SAMPLER, MASK, COLOR, OPACITY) { \
tc = OFFSET.xy + vTextureCoord.xy * OFFSET.zw; \
float og_inside = \
    step(-OG_TEXTURE_CLIP_EPS, tc.x) * step(tc.x, 1.0 + OG_TEXTURE_CLIP_EPS) * \
    step(-OG_TEXTURE_CLIP_EPS, tc.y) * step(tc.y, 1.0 + OG_TEXTURE_CLIP_EPS); \
t = TEXTURE_FUNC(SAMPLER, clamp(tc, vec2(0.0), vec2(1.0))) * og_inside; \
p = TEXTURE_FUNC(MASK, clamp(tc, vec2(0.0), vec2(1.0))) * og_inside; \
DEST = mix(DEST, vec4(max(COLOR.rgb, p.rgb), OPACITY), (t.a == 0.0 ? 0.0: 1.0) * COLOR.a); \
}
#else
#define blend(DEST, SAMPLER, OFFSET, OPACITY) \
src = TEXTURE_FUNC(SAMPLER, OFFSET.xy + vTextureCoord.xy * OFFSET.zw); \
DEST = DEST * (1.0 - src.a * OPACITY) + src * OPACITY;

#define blendPicking(DEST, OFFSET, SAMPLER, MASK, COLOR, OPACITY) \
tc = OFFSET.xy + vTextureCoord.xy * OFFSET.zw; \
t = TEXTURE_FUNC(SAMPLER, tc); \
p = TEXTURE_FUNC(MASK, tc); \
DEST = mix(DEST, vec4(max(COLOR.rgb, p.rgb), OPACITY), (t.a == 0.0 ? 0.0: 1.0) * COLOR.a);
#endif

const vec3 nightStep = 10.0 * vec3(0.58, 0.48, 0.25);

#endif
