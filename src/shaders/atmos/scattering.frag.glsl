precision highp float;

#include "./common.glsl"

uniform sampler2D transmittanceTexture;
uniform vec2 iResolution;

vec3 transmittanceFromTexture(float height, float angle)
{
    float u = (angle + 1.0) * 0.5;
    float v = height / ATMOS_HEIGHT;
    return texture2D(transmittanceTexture, vec2(u, v)).xyz;
}

void main(void)
{
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    float height = uv.y * ATMOS_HEIGHT;
    float angle = uv.x * 2.0 - 1.0;

    vec3 rayOrigin = vec3(0.0, BOTTOM_RADIUS + height, 0.0);
    vec3 up = rayOrigin / length(rayOrigin);
    vec3 lightDirection = vec3(sqrt(1.0 - angle * angle), angle, 0.0);

    const float isotropicPhase = 1.0 / (4.0 * PI);

    vec3 light = vec3(0.0);
    vec3 lightTransferFactor = vec3(0.0);

    for (int i = 0; i < SQRT_SAMPLE_COUNT; i++)
    {
        for (int j = 0; j < SQRT_SAMPLE_COUNT; j++)
        {
            float u = ((0.5 + float(i)) / float(SQRT_SAMPLE_COUNT)) * 2.0 - 1.0;
            float v = (0.5 + float(j)) / float(SQRT_SAMPLE_COUNT);
            float r = sqrt(1.0 - u * u);
            float theta = 2.0 * PI * v;
            vec3 rayDirection = vec3(cos(theta) * r, sin(theta) * r, u);

            float rayAngle = dot(up, rayDirection);
            bool cameraBelow = rayAngle < 0.0;

            vec3 transmittanceFromCameraToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);

            float offset = 0.0;
            float distanceToSpace = 0.0;

            intersectSphere(rayOrigin, rayDirection, TOP_RADIUS, offset, distanceToSpace);

            float distanceToGround = 0.0;
            bool hitGround = intersectSphere(rayOrigin, rayDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround > 0.0;
            float segmentLength = (hitGround ? distanceToGround : distanceToSpace) / float(SAMPLE_COUNT);
            float t = segmentLength * 0.5;

            vec3 transmittanceCamera;
            vec3 transmittanceLight;

            for (int k = 0; k < SAMPLE_COUNT; k++)
            {
                vec3 position = rayOrigin + t * rayDirection;
                float height = length(position) - BOTTOM_RADIUS;
                vec3 up = position / length(position);
                float rayAngle = dot(up, rayDirection);
                float lightAngle = dot(up, lightDirection);

                float distanceToGround;
                float shadow = intersectSphere(position, lightDirection, BOTTOM_RADIUS, distanceToGround) && distanceToGround >= 0.0 ? 0.0 : 1.0;
                vec3 transmittanceToSpace = transmittanceFromTexture(height, cameraBelow ? -rayAngle : rayAngle);

                transmittanceCamera = cameraBelow ? (transmittanceToSpace / transmittanceFromCameraToSpace) : (transmittanceFromCameraToSpace / transmittanceToSpace);
                transmittanceLight = transmittanceFromTexture(height, lightAngle);

                vec2 opticalDensity = exp(-height / rayleighMieHeights);
                vec3 scatteredLight = transmittanceLight * (rayleighScatteringCoefficient * opticalDensity.x + mieScatteringCoefficient * opticalDensity.y) * isotropicPhase;

                light += shadow * transmittanceCamera * scatteredLight * segmentLength;
                lightTransferFactor += transmittanceCamera * (rayleighScatteringCoefficient * opticalDensity.x + mieScatteringCoefficient * opticalDensity.y) * segmentLength;

                t += segmentLength;
            }

            if (hitGround)
            {
                vec3 hitPoint = rayOrigin + rayDirection * distanceToGround;
                vec3 normal = normalize(hitPoint);
                float diffuseAngle = max(dot(normal, lightDirection), 0.0);
                light += transmittanceCamera * transmittanceLight * GROUND_ALBEDO * diffuseAngle;
            }
        }
    }

    light /= float(SAMPLE_COUNT);
    lightTransferFactor /= float(SAMPLE_COUNT);
    vec3 color = light / (1.0 - lightTransferFactor);
    gl_FragColor = vec4(color, 1.0);
}