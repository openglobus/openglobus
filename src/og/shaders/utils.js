'use strict';
export const UTILS = `
    vec3 aces(vec3 color) 
    {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((color * (a * color + b)) / (color * (c * color + d ) + e), 0.0, 1.0);
    }
     
    bool intersectSphere(vec3 rayOrigin, vec3 rayDirection, float radius, inout float t1, inout float t2) 
    {
        float b = dot(rayDirection, rayOrigin);
        float c = dot(rayOrigin, rayOrigin) - radius * radius;
        float d = b * b - c;
        if (d < 0.0) {
            return false;
        }
        t1 = -b - sqrt(d);
        t2 = -b + sqrt(d);
        return true;
    }
    
    bool intersectSphere(vec3 rayOrigin, vec3 rayDirection, float radius, inout float t) 
    {
        float b = dot(rayDirection, rayOrigin);
        float c = dot(rayOrigin, rayOrigin) - radius * radius;
        float d = b * b - c;
        if (d < 0.0) {
            return false;
        }
        t = -b - sqrt(d);
        return true;
    }
    
    bool intersectEllipsoid( in vec3 ro, in vec3 rd, in vec3 ra, inout float t )
    {
        vec3 ocn = ro/ra;
        vec3 rdn = rd/ra;
        float a = dot( rdn, rdn );
        float b = dot( ocn, rdn );
        float c = dot( ocn, ocn );
        float h = b*b - a*(c-1.0);
                       
        if (h < 0.0) 
        { 
            return false; 
        }
        
        t = (-b-sqrt(h))/a;
        
        return true;
    }
    
    bool intersectEllipsoid( in vec3 ro, in vec3 rd, in vec3 ra, inout float t1, inout float t2)
    {
        vec3 ocn = ro/ra;
        vec3 rdn = rd/ra;
        float a = dot( rdn, rdn );
        float b = dot( ocn, rdn );
        float c = dot( ocn, ocn );
        float h = b*b - a*(c-1.0);
                
        if (h < 0.0) 
        { 
            return false; 
        }
        
        h = sqrt(h);
        t1 = (-b-h)/a;
        t2 = (-b+h)/a;
        
        return true;
    }
    
    vec3 normalEllipsoid( in vec3 pos, in vec3 ra )
    {
        return normalize( pos/(ra*ra) );
    }
`;