#include "HgtFilesGrid.h"
#include <iostream>

HgtFilesGrid::HgtFilesGrid()
{
}


HgtFilesGrid::~HgtFilesGrid()
{
	for( int i = 0; i <= 180; i++ ){
		for( int j = 0; j < 360; j++ ){
			if( this->hgtFilesGrid[i][j].fileName )
				delete[] this->hgtFilesGrid[i][j].fileName;
		}
	}

	delete[] this->dataStack;
}

void HgtFilesGrid::Init( int maxLoadedFiles, const char* filesPath )
{
	this->loadedFiles = 0;
	this->MAX_LOADED_FILES = maxLoadedFiles;
	this->dataStack = new Heights[maxLoadedFiles];
	for( int i = 0; i < maxLoadedFiles; i++ )
		this->dataStack[i].pFileFlag = NULL;

	for( int i = 0; i <= 180; i++ ){
		for( int j = 0; j <= 360; j++ ){
			FILE *fp;
			errno_t err;
			std::string fileName(filesPath);
			char demFileName[12];
			fileName.append(HgtFormat::crdtodem(90 - i, -180 + j, demFileName));
			if( (err = fopen_s( &fp, fileName.c_str(), "rb")) != 0 ) {
				this->hgtFilesGrid[i][j].fileName = NULL;
			} else {
				int length = fileName.length();
				this->hgtFilesGrid[i][j].fileName = new char[length + 1];
				strcpy_s( hgtFilesGrid[i][j].fileName, length + 1, fileName.c_str() );
				fclose(fp);
			}
			this->hgtFilesGrid[i][j].pHeightData = NULL;
			this->hgtFilesGrid[i][j].isLoaded = false;
		}
	}

	for( int i = 0; i <= 180; i++ ){
		this->hgtFilesGrid[i][360] = this->hgtFilesGrid[i][0];
	}
}

bool HgtFilesGrid::IsExists(int i, int j){
	return this->hgtFilesGrid[i][j].fileName ? true : false;
}

const char* HgtFilesGrid::GetFileName( int i, int j) {
	return this->hgtFilesGrid[i][j].fileName;
}

signed short HgtFilesGrid::GetHeight( int iSquare, int jSquare, int i, int j ) 
{
	if( this->hgtFilesGrid[iSquare][jSquare].isLoaded ) 
	{
		return this->hgtFilesGrid[iSquare][jSquare].pHeightData->height[i][j];
	}
	else 
	{
		if( this->hgtFilesGrid[iSquare][jSquare].fileName ) {
			FILE *fp;
			errno_t err;
			if( err = fopen_s( &fp, this->hgtFilesGrid[iSquare][jSquare].fileName, "rb+") != 0 ) {
				return 0;
			}

			if( this->loadedFiles >= this->MAX_LOADED_FILES ) {
				this->loadedFiles = 0;
			}

			if( this->dataStack[this->loadedFiles].pFileFlag )
				this->dataStack[this->loadedFiles].pFileFlag->isLoaded = false;

			int size = this->NCols * this->NRows;
			short int *buf = new short int[size];
			fread( buf, sizeof(short int), size, fp);
			fclose(fp);
			for( int i=0; i < size; i++ ) {
				signed short height = (signed short)((buf[i] & 255) << 8 | (buf[i] >> 8) & 255);
				this->dataStack[this->loadedFiles].height[i / this->NRows][i % this->NCols] = height;
			}
			delete[] buf;
			this->hgtFilesGrid[iSquare][jSquare].pHeightData = &this->dataStack[this->loadedFiles];
			this->dataStack[this->loadedFiles].pFileFlag = &this->hgtFilesGrid[iSquare][jSquare];
			this->loadedFiles++;
			this->hgtFilesGrid[iSquare][jSquare].isLoaded = true;

			return this->hgtFilesGrid[iSquare][jSquare].pHeightData->height[i][j];
		} 
		else
		{
			return 0;
		}
	}
}