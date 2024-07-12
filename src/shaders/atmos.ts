import {Program} from '../webgl/Program';
import {UTILS} from './utils';
import {NumberArray3} from "../math/Vec3";

export interface AtmosphereParameters {
    ATMOS_HEIGHT: number,
    RAYLEIGH_SCALE: number,
    MIE_SCALE: number,
    GROUND_ALBEDO: number,
    BOTTOM_RADIUS: number
    rayleighScatteringCoefficient: NumberArray3,
    mieScatteringCoefficient: number,
    mieExtinctionCoefficient: number,
    ozoneAbsorptionCoefficient: NumberArray3,
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
    rayleighScatteringCoefficient: [5.802, 13.558, 33.100],
    mieScatteringCoefficient: 3.996,
    mieExtinctionCoefficient: 4.440,
    ozoneAbsorptionCoefficient: [0.650, 1.881, 0.085],
    SUN_ANGULAR_RADIUS: 0.004685,
    SUN_INTENSITY: 1.0,
    ozoneDensityHeight: 25e3,
    ozoneDensityWide: 15e3,
}

export const COMMON = (atmosParams: AtmosphereParameters = DEFAULT_PARAMS): string =>
    `    
    ${UTILS}
    
    #define PI 3.1415926538
    #define ATMOS_HEIGHT ${atmosParams.ATMOS_HEIGHT.toFixed(2)}
    #define RAYLEIGH_SCALE ${atmosParams.RAYLEIGH_SCALE.toFixed(5)}
    #define MIE_SCALE ${atmosParams.MIE_SCALE.toFixed(5)}
    
    #define SAMPLE_COUNT 16
    #define SQRT_SAMPLE_COUNT 4
            
    const float GROUND_ALBEDO = ${atmosParams.GROUND_ALBEDO.toFixed(2)} / PI;

    // Sphere
    const float BOTTOM_RADIUS = ${atmosParams.BOTTOM_RADIUS.toFixed(10)};
    const float TOP_RADIUS = BOTTOM_RADIUS + ATMOS_HEIGHT;   
    const float EQUATORIAL_RADIUS = 6378137.0;
    
    // Ellipsoid
    const vec3 bottomRadii = vec3(EQUATORIAL_RADIUS, EQUATORIAL_RADIUS, BOTTOM_RADIUS);           
    const vec3 topRadii = bottomRadii + ATMOS_HEIGHT;
    
    const vec3 SPHERE_TO_ELLIPSOID_SCALE = vec3(BOTTOM_RADIUS) / bottomRadii;           
    
    const vec2 rayleighMieHeights = vec2(RAYLEIGH_SCALE, MIE_SCALE) * ATMOS_HEIGHT;
     
    const vec3 rayleighScatteringCoefficient = vec3(${atmosParams.rayleighScatteringCoefficient[0].toFixed(5)}, ${atmosParams.rayleighScatteringCoefficient[1].toFixed(5)}, ${atmosParams.rayleighScatteringCoefficient[2].toFixed(5)}) * 1e-6;
    
    const float mieScatteringCoefficient = ${atmosParams.mieScatteringCoefficient.toFixed(3)} * 1e-6;
    const float mieExtinctionCoefficient = ${atmosParams.mieExtinctionCoefficient.toFixed(3)} * 1e-6;
    const vec3 ozoneAbsorptionCoefficient = vec3(${atmosParams.ozoneAbsorptionCoefficient[0].toFixed(5)}, ${atmosParams.ozoneAbsorptionCoefficient[1].toFixed(5)}, ${atmosParams.ozoneAbsorptionCoefficient[2].toFixed(5)}) * 1e-6;
    
    const float SUN_ANGULAR_RADIUS = ${atmosParams.SUN_ANGULAR_RADIUS.toFixed(10)};
    const float SUN_INTENSITY = ${atmosParams.SUN_INTENSITY.toFixed(2)};        
    
    const float ozoneDensityHeight = ${atmosParams.ozoneDensityHeight.toFixed(1)};//25e3;
    const float ozoneDensityWide = ${atmosParams.ozoneDensityWide.toFixed(1)};//15e3;
    
    vec3 sunWithBloom(vec3 rayDir, vec3 sunDir) 
    {
        float minSunCosTheta = cos(SUN_ANGULAR_RADIUS);            
        float cosTheta = dot(rayDir, sunDir);
        if (cosTheta >= minSunCosTheta) return vec3(1.0);                
        float offset = minSunCosTheta - cosTheta;
        float gaussianBloom = exp(-offset*15000.0)*0.7;
        float invBloom = 1.0/(0.09 + offset*200.0)*0.01;
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
    }`;

export function transmittance(atmosParams?: AtmosphereParameters): Program {
    return new Program("transmittance", {
        uniforms: {
            iResolution: "vec2"
        },
        attributes: {
            a_position: "vec2"
        },

        vertexShader:
            `
            attribute vec2 a_position;
            
            void main(void) 
            {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }`,

        fragmentShader:
            `
            precision highp float;
            
            ${COMMON(atmosParams)}
                       
            uniform vec2 iResolution;
                        
            void main(void) 
            {
                vec2 uv = gl_FragCoord.xy / iResolution.xy;
                float height = uv.y * ATMOS_HEIGHT;
                float angle = uv.x * 2.0 - 1.0;
                gl_FragColor = vec4(transmittance(height, angle), 1.0);
            }`
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

        vertexShader:
            `            
            attribute vec2 a_position;  
                      
            void main(void) 
            {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }`,

        fragmentShader:
            `            
            precision highp float;
            
            uniform sampler2D transmittanceTexture;
            uniform vec2 iResolution;
            
            ${COMMON(atmosParams)}
            
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
            }`
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