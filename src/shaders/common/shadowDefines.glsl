/*
    Variance shadow map parameters
*/

#ifndef VARIANCE_SHADOW_ENABLED
#define VARIANCE_SHADOW_ENABLED 1
#endif

#ifndef VARIANCE_BLUR_RADIUS
#define VARIANCE_BLUR_RADIUS 3
#endif

// Lower bound for VSM depth variance.
// Smaller values reduce light bleeding, but may
// increase shadow acne/noise due to precision limits.
#ifndef SHADOW_MAP_MIN_VARIANCE
#define SHADOW_MAP_MIN_VARIANCE 0.000000001
#endif

// 0.2 - 0.8 is a good range for this parameter. Higher values
// reduce light bleeding but can cause more shadow acne.
#ifndef SHADOW_MAP_LIGHT_BLEEDING_REDUCTION
#define SHADOW_MAP_LIGHT_BLEEDING_REDUCTION 0.5
#endif

/*
    PCF/Hard shadow map parameters
*/

#ifndef SHADOW_MAP_PCF
#define SHADOW_MAP_PCF 3
#endif

#ifndef SHADOW_MAP_SLOPE_DEPTH_BIAS
#define SHADOW_MAP_SLOPE_DEPTH_BIAS 0.00008
#endif

#ifndef SHADOW_MAP_MAX_SLOPE_DEPTH_BIAS
#define SHADOW_MAP_MAX_SLOPE_DEPTH_BIAS 0.0012
#endif

#ifndef SHADOW_MAP_ORTHO_SLOPE_TEXEL_FACTOR
#define SHADOW_MAP_ORTHO_SLOPE_TEXEL_FACTOR 0.0
#endif

#ifndef SHADOW_MAP_ORTHO_MAX_SLOPE_TEXELS
#define SHADOW_MAP_ORTHO_MAX_SLOPE_TEXELS 8.0
#endif
