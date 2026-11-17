#version 300 es

precision highp float;

#include "./common.glsl"

#define AP_WIDTH float(${ AP_WIDTH })
#define AP_HEIGHT float(${ AP_HEIGHT })
#define AP_DEPTH float(${ AP_DEPTH })
#define AP_SAMPLE_COUNT 16

uniform sampler2D atmosLutTexture;

#include "./lut_helpers.glsl"

uniform vec2 cameraParams; // x - camera distance from the planet center, y - sun zenith cosine at the camera
uniform vec2 depthParams;  // x - near distance, y - distance range
uniform vec2 densityScale; // x - Rayleigh, y - Mie (aerosols), ozone is not scaled
uniform float slice;

layout (location = 0) out vec4 fragColor;

// Sun disk visibility above the planet horizon at the point, the planet shadow.
float getSunVisibility(float radius, float sunCosZenith)
{
    float sinHorizon = BOTTOM_RADIUS / radius;
    float cosHorizon = -sqrt(max(1.0 - sinHorizon * sinHorizon, 0.0));
    float sunRadius = sinHorizon * SUN_ANGULAR_RADIUS;
    return smoothstep(-sunRadius, sunRadius, sunCosZenith - cosHorizon);
}

void main(void)
{
    bool isTransmittance = gl_FragCoord.x >= AP_WIDTH;
vec2 uv = vec2(gl_FragCoord.x - (isTransmittance ? AP_WIDTH : 0.0), gl_FragCoord.y) / vec2(AP_WIDTH, AP_HEIGHT);

float r = cameraParams.x;
float sunCosZenith = cameraParams.y;

float zenithHorizonAngle;
float beta;
getAerialPerspectiveHorizon(r, zenithHorizonAngle, beta);

float viewZenithAngle = aerialPerspectiveVToZenith(uv.y, zenithHorizonAngle, beta);
float azimuth = uv.x * PI;
float sinZenith = sin(viewZenithAngle);

vec3 rayDirection = vec3(sinZenith * cos(azimuth), cos(viewZenithAngle), sinZenith * sin(azimuth));
vec3 rayOrigin = vec3(0.0, r, 0.0);
vec3 lightDir = vec3(sqrt(max(1.0 - sunCosZenith * sunCosZenith, 0.0)), sunCosZenith, 0.0);

float w = (slice + 0.5) / AP_DEPTH;
float rayLength;

if (uv.y > 0.5) {
    // Below the horizon the altitude decreases along the ray down to the ground
    float t = 0.0;
    intersectAtmosphereSphere(rayOrigin, rayDirection, BOTTOM_RADIUS + aerialPerspectiveWToAltitude(w, r), t);
    rayLength = max(t, 1.0);
} else {
    rayLength = depthParams.x + depthParams.y * w * w;
}

vec3 light = vec3(0.0);
vec3 transmittance = vec3(1.0);
vec3 opticalDepth = vec3(0.0);

float tStart = 0.0, tEnd = 0.0;

// Behind the ground the mean extinction is taken up to the ground point
float averagingLength = rayLength;

if (intersectAtmosphereSphere(rayOrigin, rayDirection, TOP_RADIUS, tStart, tEnd)) {
    tStart = max(tStart, 0.0);
    tEnd = min(tEnd, rayLength);

    // Slices behind the ground keep the value at the ground point
    float distanceToGround = 0.0;
    if (intersectAtmosphereSphere(rayOrigin, rayDirection, BOTTOM_RADIUS, distanceToGround)) {
        tEnd = min(tEnd, distanceToGround);
        averagingLength = min(rayLength, max(distanceToGround, 1.0));
    }

    if (tEnd > tStart) {
        float phaseAngle = dot(lightDir, rayDirection);
        float phaseR = rayleighPhase(phaseAngle);
        float phaseM = miePhase(phaseAngle);

        float segmentLength = (tEnd - tStart) / float(AP_SAMPLE_COUNT);
        float t = tStart + segmentLength * 0.5;

        for (int i = 0; i < AP_SAMPLE_COUNT; i++) {
            vec3 position = rayOrigin + t * rayDirection;
            float radius = length(position);
            float height = max(radius - BOTTOM_RADIUS, 0.0);
            float lightAngle = dot(position / radius, lightDir);

            vec2 density = exp(-height / rayleighMieHeights) * densityScale;
            float ozoneDensity = 1.0 - min(abs(height - ozoneDensityHeight) / ozoneDensityWide, 1.0);

            vec3 rayleighScattering = rayleighScatteringCoefficient * density.x;
            float mieScattering = mieScatteringCoefficient * density.y;
            vec3 extinction = rayleighScattering + mieExtinctionCoefficient * density.y + ozoneAbsorptionCoefficient * ozoneDensity;

            vec3 sunLight = transmittanceFromTexture(height, lightAngle) * getSunVisibility(radius, lightAngle);
            vec3 scattering = sunLight * (rayleighScattering * phaseR + mieScattering * phaseM);
            scattering += multipleScatteringContributionFromTexture(height, lightAngle) * (rayleighScattering + mieScattering);

            vec3 segmentTransmittance = exp(-extinction * segmentLength);
            light += transmittance * (scattering - scattering * segmentTransmittance) / extinction;
            transmittance *= segmentTransmittance;
            opticalDepth += extinction * segmentLength;

            t += segmentLength;
        }
    }
}

if (isTransmittance) {
    fragColor = vec4(opticalDepth / averagingLength * 1000.0, 1.0);
} else {
    // 1 - exp(-x) loses precision for small x, use the series there
    vec3 opacity = mix(opticalDepth * (1.0 - 0.5 * opticalDepth), 1.0 - transmittance, step(1e-3, opticalDepth));
    fragColor = vec4(light * SUN_INTENSITY * SCATTERING_COLOR * 8.0 / max(opacity, 1e-7), 1.0);
}
}
