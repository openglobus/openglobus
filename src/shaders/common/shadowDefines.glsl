/*
    Variance shadow map parameters
*/

#ifndef VARIANCE_SHADOW_ENABLED
#define VARIANCE_SHADOW_ENABLED 0
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

#ifndef SHADOW_MAP_INTENSITY_DEFINED
#define SHADOW_MAP_INTENSITY_DEFINED
const float SHADOW_MAP_INTENSITY = 0.9;
#endif

#ifndef SHADOW_MAP_PCF
#define SHADOW_MAP_PCF 5
#endif

// Adds depth bias as the surface turns away from the light, counted in shadow map
// texels: one texel covers more range with distance, and so does the error it hides.
#ifndef SHADOW_MAP_SLOPE_DEPTH_BIAS
#define SHADOW_MAP_SLOPE_DEPTH_BIAS 1.0
#endif

// Limits the slope-dependent depth bias, in shadow map texels.
#ifndef SHADOW_MAP_MAX_SLOPE_DEPTH_BIAS
#define SHADOW_MAP_MAX_SLOPE_DEPTH_BIAS 4.0
#endif

// Offsets the sampled point along the receiver normal by this many shadow map texels,
// on top of DepthCamera.normalBias.
#ifndef SHADOW_MAP_NORMAL_TEXEL_BIAS
#define SHADOW_MAP_NORMAL_TEXEL_BIAS 1.0
#endif

// Floor of the PCF comparison band, in meters, for surfaces facing the light head on,
// where the depth derivative is near zero.
#ifndef SHADOW_MAP_MIN_TRANSITION
#define SHADOW_MAP_MIN_TRANSITION 0.05
#endif

// The same floor for cascades, counted in cascade texels: a far cascade covers kilometers
// per texel and needs a band to match, a near one does not.
#ifndef SHADOW_MAP_MIN_TRANSITION_TEXELS
#define SHADOW_MAP_MIN_TRANSITION_TEXELS 0.5
#endif
