#include "vec3.h"

void vecSet( vec3_t v, vec_t vx, vec_t vy, vec_t vz ){
	v[X] = vx;
	v[Y] = vy;
	v[Z] = vz;
}

void vecClear( vec3_t v ){
	v[X] = v[Y] = v[Z] = 0.0;
}

void vecInverse( vec3_t v ){
	v[X] = -v[X];
	v[Y] = -v[Y];
	v[Z] = -v[Z];
}

void vecCopy( vec3_t vout, const vec3_t vin ){
	vout[X] = vin[X];
	vout[Y] = vin[Y];
	vout[Z] = vin[Z];
}


vec_t vecLength( const vec3_t v ){
	return sqrt( v[X]*v[X] + v[Y]*v[Y] + v[Z]*v[Z] );
}

vec_t vecLengthSqr( const vec3_t v ){
	return( v[X]*v[X] + v[Y]*v[Y] + v[Z]*v[Z] );
}

vec_t Distance( const vec3_t p1, const vec3_t p2 ){
	vec3_t	v;
	vecSub (p2, p1, v);
	return vecLength( v );
}

void vecScale( vec3_t v, const vec_t dx, const vec_t dy, const vec_t dz ){
	v[X] *= dx;
	v[Y] *= dy;
	v[Z] *= dz;
}

void vecScale( const vec3_t vin, const vec_t dx, const vec_t dy, const vec_t dz, vec3_t vout ){
	vout[X] = vin[X]*dx;
	vout[Y] = vin[Y]*dy;
	vout[Z] = vin[Z]*dz;
}

void vecScale( const vec3_t vin, const vec3_t vscale, vec3_t vout ){
	vout[X] = vin[X]*vscale[X];
	vout[Y] = vin[Y]*vscale[Y];
	vout[Z] = vin[Z]*vscale[Z];
}

void vecCross( const vec3_t va, const vec3_t vb, vec3_t vcross ){
	vcross[X] = va[Y]*vb[Z] - va[Z]*vb[Y];
	vcross[Y] = va[Z]*vb[X] - va[X]*vb[Z];
	vcross[Z] = va[X]*vb[Y] - va[Y]*vb[X];
}

void  vecDot( const vec3_t va, const vec3_t vb, vec_t& dotproduct ){
	dotproduct = va[X]*vb[X] + va[Y]*vb[Y] + va[Z]*vb[Z];
}

vec_t vecDot( const vec3_t va, const vec3_t vb ){
	return( va[X]*vb[X] + va[Y]*vb[Y] + va[Z]*vb[Z] );
}


void vecNormalize( vec3_t v ){
	vec_t length;

	length = vecLength( v );

	if( length )
	{
		length = 1/length;

		v[X]*=length;
		v[Y]*=length;
		v[Z]*=length;
	} else 
		vecClear( v );
}

void vecNormalize( const vec3_t vin, vec3_t vout ){
	vec_t length;

	length = vecLength( vin );

	if( length )
	{
		length = 1/length;

		vout[X]=vin[X]*length;
		vout[Y]=vin[Y]*length;
		vout[Z]=vin[Z]*length;
	} else 
		vecClear( vout );
}

void vecAdd( const vec3_t va, const vec3_t vb, vec3_t vadd ){
	vadd[X] = va[X] + vb[X];
	vadd[Y] = va[Y] + vb[Y];
	vadd[Z] = va[Z] + vb[Z];
}

void vecAdd( vec3_t va, const vec3_t vb ){
	va[X] += vb[X];
	va[Y] += vb[Y];
	va[Z] += vb[Z];
}

void vecSub( const vec3_t va, const vec3_t vb, vec3_t vs ){
	vs[X] = va[X] - vb[X];
	vs[Y] = va[Y] - vb[Y];
	vs[Z] = va[Z] - vb[Z];
}

void vecSub( vec3_t va, const vec3_t vb ){
	va[X] -= vb[X];
	va[Y] -= vb[Y];
	va[Z] -= vb[Z];
}


void vecMull( const vec3_t va, const vec3_t vb, vec3_t vm ){
	vm[X] = va[X]*vb[X];
	vm[Y] = va[Y]*vb[Y];
	vm[Z] = va[Z]*vb[Z];
}

void getNormal( const vec3_t v1, const vec3_t v2, const vec3_t v3, vec3_t m )
{
	m[X] = ( v1[Y] - v2[Y] ) * ( v1[Z] + v2[Z] ) +
		   ( v2[Y] - v3[Y] ) * ( v2[Z] + v3[Z] ) +
		   ( v3[Y] - v1[Y] ) * ( v3[Z] + v1[Z] );

	m[Y] = ( v1[Z] - v2[Z] ) * ( v1[X] + v2[X] ) +
		   ( v2[Z] - v3[Z] ) * ( v2[X] + v3[X] ) +
		   ( v3[Z] - v1[Z] ) * ( v3[X] + v1[X] );

	m[Z] = ( v1[X] - v2[X] ) * ( v1[Y] + v2[Y] ) +
		   ( v2[X] - v3[X] ) * ( v2[Y] + v3[Y] ) +
		   ( v3[X] - v1[X] ) * ( v3[Y] + v1[Y] );

	vecNormalize( m );
}

vec_t LineIntersectPlane(const vec3_t t[], const vec3_t l[])
{
	vec3_t tt20, tt10, n, w, tl00, x;
	vec_t de;

	vecSub( t[2], t[0], tt20);
	vecSub( t[1], t[0], tt10);
	vecCross(tt20, tt10, n);
	vecSub(t[0], l[0], tl00);
	vecSub(l[1], l[0], w);
	de = vecDot( n, tl00) / vecDot(n, w);

	w[X] *= de;
	w[Y] *= de;
	w[Z] *= de;

	vecAdd(l[0], w, x);
	
	return x[Y];
}