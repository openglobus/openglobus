#ifndef ATMOS_AERIAL_PERSPECTIVE_GLSL
#define ATMOS_AERIAL_PERSPECTIVE_GLSL

uniform highp sampler3D aerialPerspectiveTexture;
uniform mat3 aerialPerspectiveFrame;  // camera local frame in the scaled space, columns: towards the sun, up, side
uniform vec4 aerialPerspectiveParams; // x - near distance, y - 1 / distance range, z - weight, w - camera distance from the center
uniform float aerialPerspectiveStartDistance; // haze grows smoothly from the camera and reaches full rate past this distance
uniform float aerialPerspectiveIntensity; // 0 when the camera looks straight down

void getAerialPerspective(in vec3 worldVertex, in vec3 rtcPos, out vec3 inscatter, out vec3 transmittance)
{
    vec3 size = vec3(textureSize(aerialPerspectiveTexture, 0));
    size.x *= 0.5;

    vec3 ray = rtcPos * SPHERE_TO_ELLIPSOID_SCALE;
    float dist = length(ray);
    vec3 q = (ray / max(dist, 1e-6)) * aerialPerspectiveFrame;

    float zenithHorizonAngle;
    float beta;
    getAerialPerspectiveHorizon(aerialPerspectiveParams.w, zenithHorizonAngle, beta);

    float zenith = acos(clamp(q.y, -1.0, 1.0));
    vec2 halfTexel = 0.5 / size.xy;
    vec2 uv = vec2(atan(abs(q.z), q.x + 1e-7) / PI, aerialPerspectiveZenithToV(zenith, zenithHorizonAngle, beta));
    uv.x = clamp(uv.x, halfTexel.x, 1.0 - halfTexel.x);

    // Rays below and above the horizon have different slices, they must not be filtered together.
    float w;
    if (zenith > zenithHorizonAngle) {
        uv.y = clamp(uv.y, 0.5 + halfTexel.y, 1.0 - halfTexel.y);
        float height = length(worldVertex * SPHERE_TO_ELLIPSOID_SCALE) - BOTTOM_RADIUS;
        w = aerialPerspectiveAltitudeToW(height, aerialPerspectiveParams.w);
    } else {
        uv.y = clamp(uv.y, halfTexel.y, 0.5 - halfTexel.y);
        w = sqrt(max(dist - aerialPerspectiveParams.x, 0.0) * aerialPerspectiveParams.y);
    }

    vec3 coord = vec3(uv.x * 0.5, uv.y, w);
    vec3 hazeColor = texture(aerialPerspectiveTexture, coord).rgb;
    coord.x += 0.5;
    vec3 extinction = texture(aerialPerspectiveTexture, coord).rgb * 1e-3;

    // Smooth start: ~dist^2 / start close to the camera, ~(dist - start) far away, no visible edge
    float hazeDistance = dist * dist / (dist + aerialPerspectiveStartDistance + 1e-3);
    transmittance = exp(-extinction * hazeDistance);
    inscatter = hazeColor * (1.0 - transmittance);
}

vec3 applyAtmosphereToSurface(
    in vec3 worldVertex,
    in vec3 rtcPos,
    in vec3 normal,
    in vec3 cameraPos,
    in vec3 rayOrigin,
    in vec3 rayDirection,
    in vec3 sunPos,
    in vec3 litColor,
    in vec3 specular
) {
    float apWeight = aerialPerspectiveParams.z;
    vec3 color = vec3(0.0);

    if (apWeight < 1.0) {
        vec4 atmosColor;
        atmosGroundColor(worldVertex, normal, rayOrigin, rayDirection, sunPos, atmosColor);

        vec3 sunIlluminance;
        getSunIlluminance(cameraPos, normalize(-rayDirection), sunIlluminance);

        float fadingOpacity;
        getAtmosFadingOpacity(worldVertex, cameraPos, atmosFadeDist, atmosMaxMinOpacity, fadingOpacity);
        fadingOpacity *= atmosColor.a;

        color = mix(litColor, atmosColor.rgb, fadingOpacity) + specular * mix(vec3(1.0), sunIlluminance, atmosColor.a);
    }

    if (apWeight > 0.0) {
        vec3 surfaceColor = litColor + specular;
        vec3 hazeColor = surfaceColor;
        if (aerialPerspectiveIntensity > 0.0) {
            vec3 inscatter, transmittance;
            getAerialPerspective(worldVertex, rtcPos, inscatter, transmittance);
            hazeColor = mix(surfaceColor, surfaceColor * transmittance + inscatter, aerialPerspectiveIntensity);
        }
        color = mix(color, hazeColor, apWeight);
    }

    return color;
}

#endif
