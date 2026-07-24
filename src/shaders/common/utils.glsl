#ifndef OG_UTILS_GLSL
#define OG_UTILS_GLSL

/**
 * Returns the normalized position of a value between the given bounds.
 * @param {float} min - Lower bound.
 * @param {float} max - Upper bound.
 * @param {float} between - Value to normalize.
 * @returns {float} Value in the [0, 1] range.
 */
float getLerpValue(in float min, in float max, in float between)
{
    return (clamp(between, min, max) - min) / (max - min);
}

/**
 * Applies the ACES filmic tone-mapping approximation.
 * @param {vec3} color - Linear HDR color.
 * @returns {vec3} Tone-mapped color in the [0, 1] range.
 */
vec3 aces(vec3 color)
{
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}

/**
 * Moves a distant ray origin closer to a sphere to preserve floating-point precision.
 * @param {vec3} rayOrigin - Ray origin to modify.
 * @param {vec3} rayDirection - Normalized ray direction.
 * @param {float} radius - Sphere radius.
 * @returns {float} Origin shift along the ray. Add it to local intersection distances
 * to recover distances from the original origin.
 */
float moveRayOriginNearSphere(inout vec3 rayOrigin, vec3 rayDirection, float radius)
{
    float shift = max(-dot(rayOrigin, rayDirection) - radius * 2.0, 0.0);
    rayOrigin += rayDirection * shift;
    return shift;
}

/**
 * Computes a numerically stable ray-sphere intersection near planet-scale tangents.
 * @param {vec3} rayOrigin - Ray origin.
 * @param {vec3} rayDirection - Normalized ray direction. MUST be normalized.
 * @param {float} radius - Sphere radius.
 * @param {float} epsilon - Non-negative tangent tolerance in world units.
 * @param {float} t1 - Receives the near intersection parameter.
 * @param {float} t2 - Receives the far intersection parameter.
 * @returns {boolean} True when at least one intersection is on the forward ray.
 */
bool intersectSphereImpl(
    vec3 rayOrigin,
    vec3 rayDirection,
    float radius,
    float epsilon,
    inout float t1,
    inout float t2
)
{
    epsilon = max(epsilon, 0.0);

    float closestT = -dot(rayDirection, rayOrigin);
    float closestDistance = length(rayOrigin + rayDirection * closestT);
    float radialDelta = radius - closestDistance;

    // Avoid subtracting squared planet-scale values near the horizon.
    if (radialDelta < -epsilon) {
        return false;
    }

    float halfChord = sqrt(max(radialDelta * (radius + closestDistance), 0.0));

    t1 = closestT - halfChord;
    t2 = closestT + halfChord;

    return t2 >= 0.0;
}

/**
 * Intersects a ray with a sphere and returns both intersection parameters.
 * @param {vec3} rayOrigin - Ray origin.
 * @param {vec3} rayDirection - Normalized ray direction.
 * @param {float} radius - Sphere radius.
 * @param {float} t1 - Receives the near intersection parameter.
 * @param {float} t2 - Receives the far intersection parameter.
 * @returns {boolean} True when at least one intersection is on the forward ray.
 */
bool intersectSphere(vec3 rayOrigin, vec3 rayDirection, float radius, inout float t1, inout float t2)
{
    return intersectSphereImpl(rayOrigin, rayDirection, radius, 0.0, t1, t2);
}

/**
 * Intersects a ray with a sphere and returns the nearest forward intersection.
 * @param {vec3} rayOrigin - Ray origin.
 * @param {vec3} rayDirection - Normalized ray direction.
 * @param {float} radius - Sphere radius.
 * @param {float} t - Receives the nearest non-negative intersection parameter.
 * @returns {boolean} True when the sphere intersects the forward ray.
 */
bool intersectSphere(vec3 rayOrigin, vec3 rayDirection, float radius, inout float t)
{
    float t1, t2;
    if (!intersectSphere(rayOrigin, rayDirection, radius, t1, t2)) {
        return false;
    }
    t = t1 >= 0.0 ? t1 : t2;
    return t >= 0.0;
}

/**
 * Intersects a ray with a sphere encoded as center.xyz and radius.w.
 * @param {vec3} ro - Ray origin.
 * @param {vec3} rd - Normalized ray direction.
 * @param {vec4} sph - Sphere center and radius.
 * @returns {float} Nearest non-negative intersection parameter, or -1.0 when missed.
 */
float intersectSphere(vec3 ro, vec3 rd, vec4 sph)
{
    float t;
    return intersectSphere(ro - sph.xyz, rd, sph.w, t) ? t : -1.0;
}

/**
 * Intersects a ray with a sphere using a tangent tolerance.
 * @param {vec3} rayOrigin - Ray origin.
 * @param {vec3} rayDirection - Normalized ray direction.
 * @param {float} radius - Sphere radius.
 * @param {float} epsilon - Tangent tolerance in world units.
 * @param {float} t1 - Receives the near intersection parameter.
 * @param {float} t2 - Receives the far intersection parameter.
 * @returns {boolean} True when at least one relaxed intersection is on the forward ray.
 */
bool intersectSphereRelaxed(
    vec3 rayOrigin,
    vec3 rayDirection,
    float radius,
    float epsilon,
    inout float t1,
    inout float t2
)
{
    return intersectSphereImpl(rayOrigin, rayDirection, radius, epsilon, t1, t2);
}

/**
 * Intersects a ray with a sphere using a tangent tolerance.
 * @param {vec3} rayOrigin - Ray origin.
 * @param {vec3} rayDirection - Normalized ray direction.
 * @param {float} radius - Sphere radius.
 * @param {float} epsilon - Tangent tolerance in world units.
 * @param {float} t - Receives the nearest non-negative relaxed intersection parameter.
 * @returns {boolean} True when the sphere intersects the forward ray.
 */
bool intersectSphereRelaxed(
    vec3 rayOrigin,
    vec3 rayDirection,
    float radius,
    float epsilon,
    inout float t
)
{
    float t1, t2;
    if (!intersectSphereRelaxed(rayOrigin, rayDirection, radius, epsilon, t1, t2)) {
        return false;
    }
    t = t1 >= 0.0 ? t1 : t2;
    return t >= 0.0;
}

/**
 * Intersects a ray with an axis-aligned ellipsoid and returns both intersection parameters.
 * @param {vec3} ro - Ray origin.
 * @param {vec3} rd - Ray direction.
 * @param {vec3} ra - Ellipsoid radii.
 * @param {float} t1 - Receives the near intersection parameter.
 * @param {float} t2 - Receives the far intersection parameter.
 * @returns {boolean} True when at least one intersection is on the forward ray.
 */
bool intersectEllipsoid(in vec3 ro, in vec3 rd, in vec3 ra, inout float t1, inout float t2)
{
    vec3 ocn = ro / ra;
    vec3 rdn = rd / ra;
    float a = dot(rdn, rdn);
    float b = dot(ocn, rdn);
    float c = dot(ocn, ocn);
    float h = b * b - a * (c - 1.0);

    if (h < 0.0)
    {
        return false;
    }

    h = sqrt(h);
    t1 = (-b - h) / a;
    t2 = (-b + h) / a;

    return t2 >= 0.0;
}

/**
 * Intersects a ray with an axis-aligned ellipsoid.
 * @param {vec3} ro - Ray origin.
 * @param {vec3} rd - Ray direction.
 * @param {vec3} ra - Ellipsoid radii.
 * @param {float} t - Receives the nearest non-negative intersection parameter.
 * @returns {boolean} True when the ellipsoid intersects the forward ray.
 */
bool intersectEllipsoid(in vec3 ro, in vec3 rd, in vec3 ra, inout float t)
{
    float t1, t2;
    if (!intersectEllipsoid(ro, rd, ra, t1, t2)) {
        return false;
    }
    t = t1 >= 0.0 ? t1 : t2;
    return t >= 0.0;
}

/**
 * Computes the outward normal of an axis-aligned ellipsoid.
 * @param {vec3} pos - Point on the ellipsoid surface.
 * @param {vec3} ra - Ellipsoid radii.
 * @returns {vec3} Normalized outward surface normal.
 */
vec3 normalEllipsoid(in vec3 pos, in vec3 ra)
{
    return normalize(pos / (ra * ra));
}

#endif
