#include <conio.h>
#include <iostream>
#include <io.h>
#include <direct.h>
#include "log.h"

int loadDDMField( const char* ddmFileName, int demSize, float* res ) {
	int size = demSize * demSize;
	FILE *fp;
	errno_t err;
	if( err = fopen_s( &fp, ddmFileName, "rb+") != 0 ) {
		return err;
	}
	fread( res, sizeof(float), size, fp);
	fclose(fp);
	return 0;
}

std::string getDDMFileName( const std::string path, int zoomIndex, int y, int x){
	char chy[10], chx[10], chz[10];
	std::string ddmFileName(path);
	ddmFileName.append(_itoa(zoomIndex, chz, 10)).append("\\").append(_itoa(y, chy, 10)).append("\\").append(_itoa(x, chx, 10)).append(".ddm");
	return ddmFileName;
}

void SaveData(const char* path, int zoom, int x, int y, int size, const float* data ) {
	FILE *fp;
	errno_t err;
	char ccn1[10];
	char ccn2[10];
	char ccn3[10];

	std::string fileName(path);
	fileName.append(_itoa(zoom, ccn1, 10)).append("\\").append(_itoa(y, ccn2, 10));
	_mkdir(fileName.c_str()); 
	fileName.append("\\").append(_itoa(x, ccn3, 10)).append(".ddm");

	if( err = fopen_s( &fp, fileName.c_str(), "wb") != 0 ) {
		LogAll( std::string("Error: ").append(fileName).append("\n").c_str() );
		return;
	}

	fwrite( data, sizeof(float), size, fp);
	fclose(fp);
}

void BufFixer899999(const char* path, int lonIndex) {
	const int ddmGridSize = 33;
	int ddmGridSize2 = ddmGridSize * ddmGridSize;

	float *zeroField = new float[ddmGridSize2];
	memset( zeroField, NULL, sizeof(float) * ddmGridSize2);


	for(int i = 0; i < 16384; i++ ) {
		std::cout << i << " ";
		std::string f1 = getDDMFileName( path, 14, i, lonIndex );
		std::string f2 = getDDMFileName( path, 14, i, lonIndex + 1 );
		int start = 2;

		float *field1 = new float[ ddmGridSize2 ];
		if( loadDDMField(f1.c_str(), ddmGridSize, field1) != 0 ) {
			delete[] field1;
			field1 = zeroField;
			start--;
		}

		float *field2 = new float[ ddmGridSize2 ];
		if( loadDDMField(f2.c_str(), ddmGridSize, field2) != 0 ) {
			delete[] field2;
			field2 = zeroField;
			start--;
		}

		if(start){
			for( int i = 0; i < ddmGridSize; i++ ) {
				float middle = (field1[ i * ddmGridSize + ddmGridSize - 2 ] + field2[ i * ddmGridSize + 1 ]) * 0.5;
				field1[ i * ddmGridSize + ddmGridSize - 1 ] = field2[ i * ddmGridSize ] = middle;
			}		

			SaveData(path, 14, lonIndex, i, ddmGridSize2, field1 );
			SaveData(path, 14, lonIndex + 1, i, ddmGridSize2, field2 );
		}

		if(field1 != zeroField)
			delete[] field1;

		if(field2 != zeroField)
			delete[] field2;
	}
}

void main( int argc, char* argv[] )
{
	std::string path(argv[1]);
	Log("Buf for 6143 now is fixing...");
	BufFixer899999(path.c_str(), 6143);
	Log("Buf for 12287 now is fixing...");
	BufFixer899999(path.c_str(), 12287);
	Log("Buf for 14335 now is fixing...");
	BufFixer899999(path.c_str(), 14335);

	Log("Done.");
}