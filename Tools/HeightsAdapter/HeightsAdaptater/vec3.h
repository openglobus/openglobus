#ifndef _VEC3_H__
#define _VEC3_H__

#include <math.h>

#define X 0
#define Y 1
#define Z 2

typedef double vec_t;
typedef vec_t vec3_t[3];

void vecSet( vec3_t v, vec_t vx, vec_t vy, vec_t vz );
void vecClear( vec3_t v );
void vecInverse( vec3_t v );
void vecCopy( vec3_t vout, const vec3_t vin );

vec_t vecLength( const vec3_t );
vec_t vecLengthSqr( const vec3_t );
vec_t Distance( const vec3_t p1, const vec3_t p2 );

void vecScale( vec3_t v, const vec_t dx, const vec_t dy, const vec_t dz );
void vecScale( const vec3_t vin, const vec_t dx, const vec_t dy, const vec_t dz, vec3_t vout );
void vecScale( const vec3_t vin, const vec3_t vscale, vec3_t vout );

void vecCross( const vec3_t va, const vec3_t vb, vec3_t vcross );
void vecDot( const vec3_t va, const vec3_t vb, vec_t dotproduct );
vec_t vecDot( const vec3_t va, const vec3_t vb );

void vecNormalize( vec3_t v );
void vecNormalize( const vec3_t vin, vec3_t vout );


void vecAdd( const vec3_t va, const vec3_t vb, vec3_t vadd );
void vecAdd( vec3_t va, const vec3_t vb );
void vecSub( const vec3_t va, const vec3_t vb, vec3_t vs );
void vecSub( vec3_t va, const vec3_t vb );
void vecMull( const vec3_t va, const vec3_t vb, vec3_t vm );

void getNormal( const vec3_t v1, const vec3_t v2, const vec3_t v3, vec3_t m );
vec_t LineIntersectPlane(const vec3_t t[], const vec3_t l[]);


#endif