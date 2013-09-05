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

	int quadsCount = atoi(argv[2]);//16384;
	int zoomIndex = atoi(argv[3]);//14;
	std::string path(argv[1]);

	//BufFixer899999(path.c_str(), 6143);
	//BufFixer899999(path.c_str(), 12287);
	//BufFixer899999(path.c_str(), 14335);

	//return;

	std::cout << path.c_str() << " " << quadsCount << " " << zoomIndex ;
	//_getch();
	const int ddmGridSize = 33;
	int ddmGridSize2 = ddmGridSize * ddmGridSize;
	const int sz = ddmGridSize * 2 - 1;
	float resultSrcField[ sz ][ sz ];

	float *zeroField = new float[ddmGridSize2];
	memset( zeroField, NULL, sizeof(float) * ddmGridSize2);

	char ccn[10];
	std::string zPath(path);
	zPath.append( _itoa( zoomIndex - 1, ccn, 10) );
	_mkdir(std::string(zPath).c_str()); 

	Log("Please wait...");

	for(int y = 0; y < quadsCount; y+=2) {
		std::cout << (int)(y/2) << " ";
		//if(y/2>2500)
			for(int x = 0; x < quadsCount; x+=2) 
			{
				bool isZeroHeight = true;

				for(int i = 0; i < 2; i++) {
					for(int j = 0; j < 2;j++) {
						float *srcField = new float[ ddmGridSize2 ];
						float* source;
						if( loadDDMField(getDDMFileName( path, zoomIndex, y + i, x + j ).c_str(), ddmGridSize, srcField) != 0 ){
							source = zeroField;
						}else{
							source = srcField;
						}

						int deci = 0, decj = 0;
						if( i > 0 ) deci = 1;
						if( j > 0 ) decj = 1;

						for( int k = 0; k < ddmGridSize2; k++ ) {
							resultSrcField[ k / ddmGridSize + ddmGridSize * i - deci ][ k % ddmGridSize + ddmGridSize * j - decj ] = source[k];
							if(source[k] > 0)
								isZeroHeight = false;
						}

						delete[] srcField;
					}
				}


				if( !isZeroHeight ) {

					char ccn[10];
					FILE *fp;
					errno_t err;

					std::string path2(zPath);
					_itoa((int)(y/2), ccn, 10);
					std::string yPath(std::string(path2).append("\\").append(ccn));
					_mkdir(yPath.c_str()); 

					std::string fileName(yPath);
					fileName.append("\\").append(_itoa((int)(x/2), ccn, 10)).append(".ddm");

					if( err = fopen_s( &fp, fileName.c_str(), "wb") != 0 ) {
						LogAll( std::string("Error: ").append(fileName).append("\n").c_str() );
						return;
					}


					float *result = new float[ddmGridSize2];
					int k = 0;
					for( int i = 0; i < sz; i += 2 ) {
						for( int j = 0; j < sz; j += 2 ) {
							result[k++] = resultSrcField[i][j];
						}
					}

					fwrite( result, sizeof(float), ddmGridSize2, fp);
					delete[] result;
					fclose(fp);
				}
			}
	}

	delete[] zeroField;
	Log("Done.");
	//_getch();
}