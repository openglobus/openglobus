#include "../common/utils.glsl"

#define PI 3.1415926538

#define ATMOS_HEIGHT float(${ATMOS_HEIGHT})
#define RAYLEIGH_SCALE float(${RAYLEIGH_SCALE})
#define MIE_SCALE float(${MIE_SCALE})

#define SAMPLE_COUNT 16
#define SQRT_SAMPLE_COUNT 4

const float GROUND_ALBEDO = float(${GROUND_ALBEDO}) / PI;

// Sphere
const float BOTTOM_RADIUS = float(${BOTTOM_RADIUS});
const float TOP_RADIUS = BOTTOM_RADIUS + ATMOS_HEIGHT;
const float EQUATORIAL_RADIUS = 6378137.0;

// Ellipsoid
const vec3 bottomRadii = vec3(EQUATORIAL_RADIUS, EQUATORIAL_RADIUS, BOTTOM_RADIUS);
const vec3 topRadii = bottomRadii + ATMOS_HEIGHT;

const vec3 SPHERE_TO_ELLIPSOID_SCALE = vec3(BOTTOM_RADIUS) / bottomRadii;

const vec2 rayleighMieHeights = vec2(RAYLEIGH_SCALE, MIE_SCALE) * ATMOS_HEIGHT;

const vec3 rayleighScatteringCoefficient = vec3(float(${rayleighScatteringCoefficient_0}), float(${rayleighScatteringCoefficient_1}), float(${rayleighScatteringCoefficient_2})) * 1e-6;

const float mieScatteringCoefficient = float(${mieScatteringCoefficient}) * 1e-6;
const float mieExtinctionCoefficient = float(${mieExtinctionCoefficient}) * 1e-6;
const vec3 ozoneAbsorptionCoefficient = vec3(float(${ozoneAbsorptionCoefficient_0}), float(${ozoneAbsorptionCoefficient_1}), float(${ozoneAbsorptionCoefficient_2})) * 1e-6;

const float SUN_ANGULAR_RADIUS = float(${SUN_ANGULAR_RADIUS});
const float SUN_INTENSITY = float(${SUN_INTENSITY});

const float ozoneDensityHeight = float(${ozoneDensityHeight}); //25e3;
const float ozoneDensityWide = float(${ozoneDensityWide}); //15e3;

vec3 sunWithBloom(vec3 rayDir, vec3 sunDir)
{
    float minSunCosTheta = cos(SUN_ANGULAR_RADIUS);
    float cosTheta = dot(rayDir, sunDir);

    if (cosTheta >= minSunCosTheta)
        return vec3(1.0);

    float offset = minSunCosTheta - cosTheta;
    float gaussianBloom = exp(- offset * 15000.0) * 0.7;
    float invBloom = 1.0 / (0.09 + offset * 200.0) * 0.01;

    return vec3(gaussianBloom + invBloom);
}

float rayleighPhase(float angle)
{
    return 3.0 / (16.0 * PI) * (1.0 + (angle * angle));
}

float miePhase(float angle)
{
    float g = 0.8;
    return 3.0 / (8.0 * PI) * ((1.0 - g * g) * (1.0 + angle * angle)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * angle, 1.5));
}

vec3 opticalDepth(float height, float angle)
{
    vec3 rayOrigin = vec3(0.0, BOTTOM_RADIUS + height, 0.0);
    vec3 rayDirection = vec3(sqrt(1.0 - angle * angle), angle, 0.0);

    float t1, t2;
    intersectSphere(rayOrigin, rayDirection, TOP_RADIUS, t1, t2);
    float segmentLength = t2 / float(SAMPLE_COUNT);

    float t = segmentLength * 0.5;
    vec3 opticalDepth = vec3(0.0);

    for (int i = 0; i < SAMPLE_COUNT; i++)
    {
        vec3 position = rayOrigin + t * rayDirection;
        float height = length(position) - BOTTOM_RADIUS;
        opticalDepth.xy += exp(-height / rayleighMieHeights) * segmentLength;
        opticalDepth.z += (1.0 - min(abs(height - ozoneDensityHeight) / ozoneDensityWide, 1.0)) * segmentLength;
        t += segmentLength;
    }

    return opticalDepth;
}

vec3 transmittance(float height, float angle)
{
    vec3 opticalDepth = opticalDepth(height, angle);
    return exp(-(rayleighScatteringCoefficient * opticalDepth.x + mieExtinctionCoefficient * opticalDepth.y + ozoneAbsorptionCoefficient * opticalDepth.z));
}