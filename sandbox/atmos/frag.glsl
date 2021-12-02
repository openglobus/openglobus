
      precision highp float;     
      #extension GL_EXT_draw_buffers : enable      

      
    #ifndef ATMOSPHERE_INCLUDED
    #define ATMOSPHERE_INCLUDED

    // -------------------------------------
    // Defines
    #define EPS					1e-6
    #define PI					3.14159265359
    #define INFINITY 			1.0 / 0.0
    #define PLANET_RADIUS		6371000.0
    #define PLANET_CENTER		vec3(0.0, -PLANET_RADIUS, 0.0)
    #define ATMOSPHERE_HEIGHT	1.0*100000.0
    #define RAYLEIGH_HEIGHT		(ATMOSPHERE_HEIGHT * 0.08)
    #define MIE_HEIGHT			(ATMOSPHERE_HEIGHT * 0.012)

    // -------------------------------------
    // Coefficients
    #define C_RAYLEIGH			(vec3(5.802, 13.558, 33.100) * 1e-6)
    #define C_MIE				(vec3(3.996,  3.996,  3.996) * 1e-6)
    #define C_OZONE				(vec3(0.650,  1.881,  0.085) * 1e-6)

    #define ATMOSPHERE_DENSITY	1.0
    #define EXPOSURE			20.0

    float saturate(float v) {
      return clamp(v, 0.0, 1.0);
    }

    // -------------------------------------
    // Math
    vec2 SphereIntersection (vec3 rayStart, vec3 rayDir, vec3 sphereCenter, float sphereRadius)
    {
      rayStart -= sphereCenter;
      float a = dot(rayDir, rayDir);
      float b = 2.0 * dot(rayStart, rayDir);
      float c = dot(rayStart, rayStart) - (sphereRadius * sphereRadius);
      float d = b * b - 4.0 * a * c;
      if (d < 0.0)
      {
        return vec2(-1.0);
      }
      else
      {        
        d = sqrt(d);
        return vec2(-b - d, -b + d) / (2.0 * a);
      }
    }

    vec2 PlanetIntersection (vec3 rayStart, vec3 rayDir)
    {
      return SphereIntersection(rayStart, rayDir, PLANET_CENTER, PLANET_RADIUS);
    }

    vec2 AtmosphereIntersection (vec3 rayStart, vec3 rayDir)
    {
      return SphereIntersection(rayStart, rayDir, PLANET_CENTER, PLANET_RADIUS + ATMOSPHERE_HEIGHT);
    }

    // -------------------------------------
    // Phase functions
    float PhaseRayleigh (float costh)
    {
      return 3.0 * (1.0 + costh*costh) / (16.0 * PI);
    }
    float PhaseMie (float costh, float g)
    {      
      g = min(g, 0.9381);
      float k = 1.55 * g - 0.55*g*g*g;
      float kcosth = k*costh;
      return (1.0 - k*k) / ((4.0 * PI) * (1.0-kcosth) * (1.0-kcosth));
    }
    float PhaseMie (float costh)
    {
      return PhaseMie(costh, 0.85);
    }

    // -------------------------------------
    // Atmosphere
    float AtmosphereHeight (vec3 positionWS)
    {
      return distance(positionWS, PLANET_CENTER) - PLANET_RADIUS;
    }
    float DensityRayleigh (float h)
    {
      return exp(-max(0.0, h / RAYLEIGH_HEIGHT));
    }
    float DensityMie (float h)
    {
      return exp(-max(0.0, h / MIE_HEIGHT));
    }
    float DensityOzone (float h)
    {
      // Ozone is represented as a tent function with a width of 30km, centered around an altitude of 25km.
      return max(0.0, 1.0 - abs(h - 25000.0) / 15000.0);
    }
    vec3 AtmosphereDensity (float h)
    {
      return vec3(DensityRayleigh(h), DensityMie(h), DensityOzone(h));
    }

    // Optical depth is a unitless measurement of the amount of absorption of a participating medium (such as the atmosphere).
    // This function calculates just that for our three atmospheric elements:
    // R: Rayleigh
    // G: Mie
    // B: Ozone
    // If you find the term "optical depth" confusing, you can think of it as "how much density was found along the ray in total".
    vec3 IntegrateOpticalDepth (vec3 rayStart, vec3 rayDir)
    {
      vec2 intersection = AtmosphereIntersection(rayStart, rayDir);
      float  rayLength    = intersection.y;

      int    sampleCount  = 8;
      float  stepSize     = rayLength / float(sampleCount);
      vec3 opticalDepth = vec3(0.0);

      //for (int i = 0; i < sampleCount; i++)
      for (int i = 0; i < 8; i++)
      {
        vec3 localPosition = rayStart + rayDir * (float(i) + 0.5) * stepSize;
        float  localHeight   = AtmosphereHeight(localPosition);
        vec3 localDensity  = AtmosphereDensity(localHeight) * stepSize;

        opticalDepth += localDensity;
      }

      return opticalDepth;
    }

    // Calculate a luminance transmittance value from optical depth.
    vec3 Absorb (vec3 opticalDepth)
    {
      // Note that Mie results in slightly more light absorption than scattering, hence * 1.1
      return exp(-(opticalDepth.x * C_RAYLEIGH + opticalDepth.y * C_MIE * 1.1 + opticalDepth.z * C_OZONE) * ATMOSPHERE_DENSITY);
    }

    // Integrate scattering over a ray for a single directional light source.
    // Also return the transmittance for the same ray as we are already calculating the optical depth anyway.
    vec3 IntegrateScattering (vec3 rayStart, vec3 rayDir, float rayLength, vec3 lightDir, vec3 lightColor, out vec3 transmittance)
    {
      // We can reduce the number of atmospheric samples required to converge by spacing them exponentially closer to the camera.
      // This breaks space view however, so let's compensate for that with an exponent that "fades" to 1 as we leave the atmosphere.
      float  rayHeight = AtmosphereHeight(rayStart);
      float  sampleDistributionExponent = 1.0 + saturate(1.0 - rayHeight / ATMOSPHERE_HEIGHT) * 8.0; // Slightly arbitrary max exponent of 9

      vec2 intersection = AtmosphereIntersection(rayStart, rayDir);
      rayLength = min(rayLength, intersection.y);
      if (intersection.x > 0.0)
      {
        // Advance ray to the atmosphere entry point
        rayStart += rayDir * intersection.x;
        rayLength -= intersection.x;
      }

      float  costh     = dot(rayDir, lightDir);
      float  phaseRayleigh = PhaseRayleigh(costh);
      float  phaseMie = PhaseMie(costh);
      vec3 rayleigh = vec3(0.0);
      vec3 mie      = vec3(0.0);

      int  sampleCount = 64;
      vec3 opticalDepth = vec3(0.0);
      
      float prevRayTime = 0.0;
      // for (int i = 0; i < sampleCount; i++)
      for (int i = 0; i < 64; i++)
      {
        float  rayTime = pow(float(i) / float(sampleCount), sampleDistributionExponent) * rayLength;
        // Because we are distributing the samples exponentially, we have to calculate the step size per sample.
        float  stepSize = (rayTime - prevRayTime);

        vec3 localPosition = rayStart + rayDir * rayTime;
        float  localHeight   = AtmosphereHeight(localPosition);
        vec3 localDensity  = AtmosphereDensity(localHeight) * stepSize;

        opticalDepth += localDensity;

        vec3 opticalDepthlight  = IntegrateOpticalDepth(localPosition, lightDir);
        vec3 lightTransmittance = Absorb(opticalDepth + opticalDepthlight);

        rayleigh += lightTransmittance * phaseRayleigh * localDensity.x;
        mie      += lightTransmittance * phaseMie      * localDensity.y;

        prevRayTime = rayTime;
      }

      transmittance = Absorb(opticalDepth);

      //TEMP
      // return opticalDepth / 100000.0;   

      return (rayleigh * C_RAYLEIGH + mie * C_MIE) * lightColor * EXPOSURE;
    }

    #endif // ATMOSPHERE_INCLUDED
    

      uniform vec3 uLightPos;

      float _DrawPlanet = 1.0;
      vec3 _WorldSpaceLightPos0 = normalize(uLightPos);
      vec3 _LightColor0 = vec3(1.0);

        
      uniform vec4 uBaseColor;
      uniform samplerCube uTexture;
      uniform vec3 uCameraPosition;
      uniform vec2 uViewportSize;
      uniform mat4 uInvViewMatrix;
      uniform float uFov;
      uniform float uFar;

      vec3 getFarViewDir(vec2 tc) {
        float hfar = 2.0 * tan(uFov/2.0) * uFar;
        float wfar = hfar * uViewportSize.x / uViewportSize.y;
        vec3 dir = (vec3(wfar * (tc.x - 0.5), hfar * (tc.y - 0.5), -uFar));
        return dir;
      }

      vec3 getViewRay(vec2 tc) {
        vec3 ray = normalize(getFarViewDir(tc));
        return ray;
      }
        
      void main () {      
        vec2 vUV = vec2(gl_FragCoord.x / uViewportSize.x, gl_FragCoord.y / uViewportSize.y);
        vec3 rayView = getViewRay(vUV);
        
        // float3 rayStart  = _WorldSpaceCameraPos;
        vec3 rayStart = uCameraPosition;

				// float3 rayDir    = normalize(i.worldPos - _WorldSpaceCameraPos);
        vec3 rayDir = normalize(vec3(uInvViewMatrix * vec4(rayView, 0.0)));

				float  rayLength = INFINITY;

				if (_DrawPlanet == 1.0)
				{
					vec2 planetIntersection = PlanetIntersection(rayStart, rayDir);
					if (planetIntersection.x > 0.0)
						rayLength = min(rayLength, planetIntersection.x);
				}

				vec3 lightDir   = _WorldSpaceLightPos0.xyz;
				vec3 lightColor = _LightColor0.xyz;

				vec3 transmittance;
				vec3 color = IntegrateScattering(rayStart, rayDir, rayLength, lightDir, lightColor, transmittance);

				// return float4(color, 1);
        // vec3 IntegrateScattering (vec3 rayStart, vec3 rayDir, float rayLength, vec3 lightDir, vec3 lightColor, out vec3 transmittance)
        
      	// gl_FragData[0] = vec4(baseColor, 1.0);        
        // gl_FragData[0] = textureCube(uTexture, N);

        // gl_FragData[0] = vec4(vUV, 0.0, 1.0);
        gl_FragData[0] = vec4(color, 1.0);
        // gl_FragData[0] = vec4(rayLength/10000.0);
        // gl_FragData[0].xyz = transmittance;
        
      }
      
