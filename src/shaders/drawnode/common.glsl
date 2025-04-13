#ifdef WEBGL2
    #define TEXTURE_FUNC texture
#else
    #define TEXTURE_FUNC texture2D
#endif

#define SLICE_SIZE 5

#define blend(DEST, SAMPLER, OFFSET, OPACITY) \
src = TEXTURE_FUNC(SAMPLER, OFFSET.xy + vTextureCoord.xy * OFFSET.zw); \
DEST = DEST * (1.0 - src.a * OPACITY) + src * OPACITY;

#define blendPicking(DEST, OFFSET, SAMPLER, MASK, COLOR, OPACITY) \
tc = OFFSET.xy + vTextureCoord.xy * OFFSET.zw; \
t = TEXTURE_FUNC(SAMPLER, tc); \
p = TEXTURE_FUNC(MASK, tc); \
DEST = mix(DEST, vec4(max(COLOR.rgb, p.rgb), OPACITY), (t.a == 0.0 ? 0.0: 1.0) * COLOR.a);

const vec3 nightStep = 10.0 * vec3(0.58, 0.48, 0.25);