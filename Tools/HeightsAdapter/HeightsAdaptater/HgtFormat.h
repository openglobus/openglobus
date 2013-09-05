#ifndef _DEMFORMAT_H_
#define _DEMFORMAT_H_

#include "vec3.h"
#include <stdlib.h>
#include <string.h>

struct HgtFormat {
	int ncols;
	int nrows;
	vec_t cellsize;
	HgtFormat() {
		this->ncols = this->nrows = 0;
		this->cellsize = 0.0;
	};
	HgtFormat( const HgtFormat& format ) {
		this->ncols = format.ncols;
		this->nrows = format.nrows;
		this->cellsize = format.cellsize;
	}
	HgtFormat( int nrows, int ncols, vec_t cellsize = 0.0 ) : nrows(nrows), ncols(ncols), cellsize(cellsize) { } ; 
	int Size() {
		return this->ncols * this->nrows;
	}

	static char* crdtodem(double lat, double lon, char* res)
	{
		int lt, ll;
		char slt[3], sll[4];
		memset( res, 0, 11);

		if( lat >= 0 ) {
			res[0] = 'N';
			lt = (int)floor(abs(lat));
		}
		else {
			res[0] = 'S';
			lt = (int)ceil(abs(lat));
		}
		_itoa_s(lt, slt, 10);

		if( strlen(slt) != 2 ){
			slt[1] = slt[0];
			slt[0] = '0';
			slt[2] = 0;
		}

		strcat(res, slt);

		if( lon >= 0 ) {
			res[3] = 'E';
			ll = (int)floor(abs(lon));
		}
		else {
			res[3] = 'W';
			ll = (int)ceil(abs(lon));
		}
		_itoa_s(ll, sll, 10);

		int len = strlen(sll);
		if(  len != 3){
			if(len == 1) {
				sll[2] = sll[0];
				sll[0]='0';
				sll[1] = '0';
				sll[3] = 0;
			}else if( len == 2 ){
				sll[2] = sll[1];
				sll[1] = sll[0];
				sll[0] = '0';
				sll[3] = 0;
			}
		}

		strcat(res, sll);

		res[7] = '.';
		res[8] = 'h';
		res[9] = 'g';
		res[10] = 't';
		res[11] = 0;
		
		return res;
	}
};

#endif