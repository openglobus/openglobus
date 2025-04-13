import {Program} from '../../webgl/Program';

import transmittance_vert from './transmittance.vert.glsl';
import transmittance_frag from './transmittance.frag.glsl';

import scattering_vert from './scattering.vert.glsl';
import scattering_frag from './scattering.frag.glsl';

import {stringTemplate2} from "../../utils/shared";

export interface AtmosphereParameters {
    ATMOS_HEIGHT: number,
    RAYLEIGH_SCALE: number,
    MIE_SCALE: number,
    GROUND_ALBEDO: number,
    BOTTOM_RADIUS: number
    rayleighScatteringCoefficient_0: number,
    rayleighScatteringCoefficient_1: number,
    rayleighScatteringCoefficient_2: number,
    mieScatteringCoefficient: number,
    mieExtinctionCoefficient: number,
    ozoneAbsorptionCoefficient_0: number,
    ozoneAbsorptionCoefficient_1: number,
    ozoneAbsorptionCoefficient_2: number,
    SUN_ANGULAR_RADIUS: number,
    SUN_INTENSITY: number,
    ozoneDensityHeight: number,
    ozoneDensityWide: number,
}

const DEFAULT_PARAMS: AtmosphereParameters = {
    ATMOS_HEIGHT: 100000.0,
    RAYLEIGH_SCALE: 0.08,
    MIE_SCALE: 0.012,
    GROUND_ALBEDO: 0.05,
    BOTTOM_RADIUS: 6356752.3142451793,
    rayleighScatteringCoefficient_0: 5.802,
    rayleighScatteringCoefficient_1: 13.558,
    rayleighScatteringCoefficient_2: 33.100,
    mieScatteringCoefficient: 3.996,
    mieExtinctionCoefficient: 4.440,
    ozoneAbsorptionCoefficient_0: 0.650,
    ozoneAbsorptionCoefficient_1: 1.881,
    ozoneAbsorptionCoefficient_2: 0.085,
    SUN_ANGULAR_RADIUS: 0.004685,
    SUN_INTENSITY: 1.0,
    ozoneDensityHeight: 25e3,
    ozoneDensityWide: 15e3,
}

export function transmittance(atmosParams?: AtmosphereParameters): Program {
    return new Program("transmittance", {
        uniforms: {
            iResolution: "vec2"
        },
        attributes: {
            a_position: "vec2"
        },
        vertexShader: transmittance_vert,
        fragmentShader: stringTemplate2(transmittance_frag, atmosParams)
    });
}

export function scattering(atmosParams?: AtmosphereParameters): Program {
    return new Program("scattering", {
        uniforms: {
            iResolution: "vec2",
            transmittanceTexture: "sampler2d"
        },
        attributes: {
            a_position: "vec2"
        },
        vertexShader: scattering_vert,
        fragmentShader: stringTemplate2(scattering_frag, atmosParams)
    });
}

// const vec3 solar_irradiance = vec3(1.474000,1.850400,1.911980);
// float GetTextureCoordFromUnitRange(float x, int texture_size) {
//     return 0.5 / float(texture_size) + x * (1.0 - 1.0 / float(texture_size));
// }
//
// float ClampDistance(float d) {
//     return max(d, 0.0 * m);
// }
//
// float SafeSqrt(float a) {
//     return sqrt(max(a, 0.0 * m2));
// }

// float DistanceToTopAtmosphereBoundary(float r, float mu) {
//
//     //assert(r <= atmosphere.top_radius);
//     //assert(mu >= -1.0 && mu <= 1.0);
//
//     float discriminant = r * r * (mu * mu - 1.0) + TOP_RADIUS * TOP_RADIUS;
//     return ClampDistance(-r * mu + SafeSqrt(discriminant));
// }

// vec2 GetTransmittanceTextureUvFromRMu(
//     float r,
//     float mu)
// {
//     //assert(r >= atmosphere.BOTTOM_RADIUS && r <= TOP_RADIUS);
//     //assert(mu >= -1.0 && mu <= 1.0);
//
//     float H = sqrt(TOP_RADIUS * TOP_RADIUS - BOTTOM_RADIUS * BOTTOM_RADIUS);
//     float rho = SafeSqrt(r * r - BOTTOM_RADIUS * BOTTOM_RADIUS);
//     float d = DistanceToTopAtmosphereBoundary(r, mu);
//     float d_min = TOP_RADIUS - r;
//     float d_max = rho + H;
//     float x_mu = (d - d_min) / (d_max - d_min);
//     float x_r = rho / H;
//
//     return vec2(
//         GetTextureCoordFromUnitRange(x_mu, TRANSMITTANCE_TEXTURE_WIDTH),
//         GetTextureCoordFromUnitRange(x_r, TRANSMITTANCE_TEXTURE_HEIGHT)
//     );
// }

// vec3 GetTransmittanceToTopAtmosphereBoundary(in sampler2D transmittance_texture, float r, float mu)
// {
//     //assert(r >= BOTTOM_RADIUS && r <= TOP_RADIUS);
//
//     vec2 uv = GetTransmittanceTextureUvFromRMu(r, mu);
//     return texture(transmittance_texture, uv).xyz;
// }

// vec3 GetTransmittanceToSun(
//     in sampler2D transmittance_texture,
//     float r,
//     float mu_s)
// {
//     float sin_theta_h = BOTTOM_RADIUS / r;
//     float cos_theta_h = -sqrt(max(1.0 - sin_theta_h * sin_theta_h, 0.0));
//
//     return GetTransmittanceToTopAtmosphereBoundary(transmittance_texture, r, mu_s) * smoothstep(
//         -sin_theta_h * SUN_ANGULAR_RADIUS / rad, sin_theta_h * SUN_ANGULAR_RADIUS / rad,
//         mu_s - cos_theta_h
//     );
// }

// vec3 GetSunAndSkyIrradiance(
//     in sampler2D transmittance_texture,
//     in vec3 point,
//     in vec3 normal,
//     in vec3 sun_direction,
//     out vec3 sky_irradiance)
// {
//     float r = length(point);
//     float mu_s = dot(point, sun_direction) / r;
//
//     sky_irradiance = vec3(0.0);  // GetIrradiance(atmosphere, irradiance_texture, r, mu_s) * (1.0 + dot(normal, point) / r) * 0.5;
//
//     return solar_irradiance * GetTransmittanceToSun(transmittance_texture, r, mu_s) * max(dot(normal, sun_direction), 0.0);
// }