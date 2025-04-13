precision lowp float;

#include "../../shaders/atmos/common.glsl"

uniform mat4 viewMatrix;
uniform vec3 sunPos;
uniform vec3 camPos;
uniform vec2 iResolution;
uniform float fov;
uniform float opacity;

uniform sampler2D transmittanceTexture;
uniform sampler2D scatteringTexture;

vec3 transmittanceFromTexture(float height, float angle)
{
    float u = (angle + 1.0) * 0.5;
    float v = height / ATMOS_HEIGHT;
    return texture2D(transmittanceTexture, vec2(u, v)).xyz;
}

vec3 multipleScatteringContributionFromTexture(float height, float angle)
{
    float u = (angle + 1.0) * 0.5;
    float v = height / ATMOS_HEIGHT;
    return texture2D(scatteringTexture, vec2(u, v)).xyz;
}

bool intersectEllipsoidToSphere(in vec3 ro, in vec3 rd, in vec3 ellRadii, in float sphereRadius, out float t1, out float t2)
{
    float offset = 0.0,
    distanceToSpace = 0.0;

    if (intersectEllipsoid(ro, rd, ellRadii, offset, distanceToSpace)) {
        vec3 hitEll = ro + rd * offset;
        vec3 nEll = normalEllipsoid(hitEll, ellRadii);
        float t = 0.0;
        bool intersectsSphere = intersectSphere(hitEll, nEll, sphereRadius, t);
        vec3 hitSphere = hitEll + nEll * t;
        t1 = length(hitSphere - ro);

        hitEll = ro + rd * distanceToSpace;
        nEll = normalEllipsoid(hitEll, ellRadii);
        t = 0.0;
        intersectsSphere = intersectSphere(hitEll, nEll, sphereRadius, t);
        hitSphere = hitEll + nEll * t;
        t2 = length(hitSphere - ro);

        return true;
    }
    return false;
}

mat4 transpose(in mat4 m)
{
    vec4 i0 = m[0];
    vec4 i1 = m[1];
    vec4 i2 = m[2];
    vec4 i3 = m[3];

    mat4 outMatrix = mat4(
    vec4(i0.x, i1.x, i2.x, i3.x),
    vec4(i0.y, i1.y, i2.y, i3.y),
    vec4(i0.z, i1.z, i2.z, i3.z),
    vec4(i0.w, i1.w, i2.w, i3.w)
    );

    return outMatrix;
}

void mainImage(out vec4 fragColor)
{
    vec3 cameraPosition = camPos;

    vec3 lightDirection = normalize(sunPos);

    vec2 uv = (2.0 * gl_FragCoord.xy - iResolution.xy) / iResolution.y;
    float fieldOfView = fov;
    float z = 1.0 / tan(fieldOfView * 0.5 * PI / 180.0);
    vec3 rayDirection = normalize(vec3(uv, -z));
    vec4 rd = transpose(viewMatrix) * vec4(rayDirection, 1.0);
    rayDirection = rd.xyz;

    vec3 light = vec3(0.0);
    vec3 transmittanceFromCameraToSpace = vec3(1.0);
    float offset = 0.0;
    float distanceToSpace = 0.0;

    rayDirection = normalize(rayDirection * SPHERE_TO_ELLIPSOID_SCALE);
    cameraPosition *= SPHERE_TO_ELLIPSOID_SCALE;
    lightDirection = normalize(lightDirection * SPHERE_TO_ELLIPSOID_SCALE);

    if (length(cameraPosition) < BOTTOM_RADIUS + 100.0) {
        cameraPosition = normalize(cameraPosition) * (BOTTOM_RADIUS + 100.0);
    }

    if (intersectSphere(cameraPosition, rayDirection, TOP_RADIUS, offset, distanceToSpace))
    {
        vec3 rayOrigin = cameraPosition;

        // above atmosphere
        if (offset > 0.0) {
            // intersection of camera ray with atmosphere
            rayOrigin = cameraPosition + rayDirection * offset;
        }

        float height = length(rayOrigin) - BOTTOM_RADIUS;
        float rayAngle = dot(rayOrigin, rayDirection) / length(rayOrigin);
        bool cameraBelow = rayAngle < 0.0;

        transmittanceFromCameraToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);

        float phaseAngle = dot(lightDirection, rayDirection);
        float rayleighPhase = rayleighPhase(phaseAngle);
        float miePhase = miePhase(phaseAngle);

        float distanceToGround = 0.0;

        bool hitGround = intersectSphere(cameraPosition, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;

        if (intersectSphere(cameraPosition, rayDirection, BOTTOM_RADIUS - 100000.0, distanceToGround) && hitGround)
        {
            discard;
        }

        float segmentLength = ((hitGround ? distanceToGround : distanceToSpace) - max(offset, 0.0)) / float(SAMPLE_COUNT);

        float t = segmentLength * 0.5;

        vec3 transmittanceCamera;
        vec3 transmittanceLight;

        for (int i = 0; i < SAMPLE_COUNT; i++)
        {
            vec3 position = rayOrigin + t * rayDirection;
            float height = length(position) - BOTTOM_RADIUS;
            vec3 up = position / length(position);
            float rayAngle = dot(up, rayDirection);
            float lightAngle = dot(up, lightDirection);
            vec3 transmittanceToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);
            transmittanceCamera = cameraBelow ? (transmittanceToSpace / transmittanceFromCameraToSpace) : (transmittanceFromCameraToSpace / transmittanceToSpace);
            transmittanceLight = transmittanceFromTexture(height, lightAngle);
            vec2 opticalDensity = exp(-height / rayleighMieHeights);
            vec3 scatteredLight = transmittanceLight * (rayleighScatteringCoefficient * opticalDensity.x * rayleighPhase + mieScatteringCoefficient * opticalDensity.y * miePhase);
            scatteredLight += multipleScatteringContributionFromTexture(height, lightAngle) * (rayleighScatteringCoefficient * opticalDensity.x + mieScatteringCoefficient * opticalDensity.y);
            light += transmittanceCamera * scatteredLight * segmentLength;
            t += segmentLength;
        }

        light *= SUN_INTENSITY;

        if (hitGround)
        {
            vec3 hitPoint = cameraPosition + rayDirection * distanceToGround;
            vec3 up = hitPoint / length(hitPoint);
            float diffuseAngle = max(dot(up, lightDirection), 0.0);
            float lightAngle = dot(up, lightDirection);
            light += transmittanceCamera * GROUND_ALBEDO * multipleScatteringContributionFromTexture(height, lightAngle) * SUN_INTENSITY;
            light += transmittanceCamera * transmittanceLight * GROUND_ALBEDO * diffuseAngle * SUN_INTENSITY;
        }
    }

    // sun disk
    // float distanceToGround;
    // bool hitGround = intersectSphere(cameraPosition, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;
    // if (!hitGround) {
    //    float angle = dot(rayDirection, lightDirection);
    //    if (angle > cos(SUN_ANGULAR_RADIUS)) {
    //       light = SUN_INTENSITY * transmittanceFromCameraToSpace;
    //    }
    // }

    float distanceToGround = 0.0;
    bool hitGround = intersectSphere(cameraPosition, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;
    if (!hitGround)
    {
        vec3 sunLum = sunWithBloom(rayDirection, lightDirection) * vec3(1.0, 1.0, 0.8);
        // limit the bloom effect
        sunLum = smoothstep(0.002, 1.0, sunLum);
        light += sunLum * SUN_INTENSITY * transmittanceFromCameraToSpace;
    }

    fragColor = vec4(pow(light * 8.0, vec3(1.0 / 2.2)), clamp(opacity, 0.0, 1.0));
}

void main(void)
{
    mainImage(gl_FragColor);
}