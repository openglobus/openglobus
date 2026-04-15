// Include after atmos/common.glsl and atmos/lut_helpers.glsl (with transmittance/scattering uniforms declared).

#ifndef ATMOS_GROUND_COLOR_GLSL
#define ATMOS_GROUND_COLOR_GLSL

void atmosGroundColor(in vec3 _v_vertex, in vec3 _normal, in vec3 _cameraPosition, in vec3 _sunPos, out vec4 outColor)
{
    if (length(_cameraPosition * SPHERE_TO_ELLIPSOID_SCALE) < BOTTOM_RADIUS + 1.0) {
        _cameraPosition = normalize(_cameraPosition * SPHERE_TO_ELLIPSOID_SCALE) * (BOTTOM_RADIUS + 1.0) / SPHERE_TO_ELLIPSOID_SCALE;
    }

    vec3 rayDirection = normalize(_v_vertex - _cameraPosition);
    vec3 lightDir = normalize(_sunPos);

    rayDirection = normalize(rayDirection * SPHERE_TO_ELLIPSOID_SCALE);
    vec3 camPos = _cameraPosition * SPHERE_TO_ELLIPSOID_SCALE;
    lightDir = normalize(lightDir * SPHERE_TO_ELLIPSOID_SCALE);


    vec3 light = vec3(0.0);
    vec3 transmittanceFromCameraToSpace = vec3(1.0);
    float offset = 0.0;
    float distanceToSpace = 0.0;

    intersectSphere(camPos, rayDirection, TOP_RADIUS, offset, distanceToSpace);

    vec3 rayOrigin = camPos;

    // above atmosphere
    if (offset > 0.0)
    {
        // intersection of camera ray with atmosphere
        rayOrigin += rayDirection * offset;
    }

    float height = length(rayOrigin) - BOTTOM_RADIUS;
    float rayAngle = dot(rayOrigin, rayDirection) / length(rayOrigin);
    bool cameraBelow = rayAngle < 0.0;

    transmittanceFromCameraToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);

    float phaseAngle = dot(lightDir, rayDirection);
    float rayleighPhase = rayleighPhase(phaseAngle);
    float miePhase = miePhase(phaseAngle);

    float distanceToGround = 0.0;

    bool hitGround = intersectSphere(camPos, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;
    //intersectSphere(camPos, rayDirection, BOTTOM_RADIUS, distanceToGround);

    if (length(_v_vertex * SPHERE_TO_ELLIPSOID_SCALE) > BOTTOM_RADIUS) {
        distanceToGround = distance(camPos, _v_vertex * SPHERE_TO_ELLIPSOID_SCALE);
    }

    float segmentLength = (distanceToGround - max(offset, 0.0)) / float(SAMPLE_COUNT);

    float t = segmentLength * 0.5;

    vec3 transmittanceCamera;
    vec3 transmittanceLight;

    for (int i = 0; i < SAMPLE_COUNT; i++)
    {
        vec3 position = rayOrigin + t * rayDirection;
        float height = length(position) - BOTTOM_RADIUS;
        vec3 up = position / length(position);
        float rayAngle = dot(up, rayDirection);
        float lightAngle = dot(up, lightDir);
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

    vec3 hitPoint = camPos + rayDirection * distanceToGround;
    vec3 up = normalize(hitPoint);
    float diffuseAngle = max(dot(up, lightDir), 0.0);

    float lightAngle = dot(_normal, lightDir);
    vec3 tA = transmittanceCamera * GROUND_ALBEDO * SUN_INTENSITY;
    vec3 scatteringLight = multipleScatteringContributionFromTexture(height, lightAngle);
    vec3 diffuseTransmittanceLight = transmittanceLight * diffuseAngle;
    light += tA * (scatteringLight + diffuseTransmittanceLight);

    outColor = vec4(pow(light * 8.0, vec3(1.0 / 2.2)), 1.0);
}

#endif
