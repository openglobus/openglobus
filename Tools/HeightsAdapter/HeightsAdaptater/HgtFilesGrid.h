#ifndef _DEMFILESGRID_H_
#define _DEMFILESGRID_H_

#include "HgtFormat.h"

class HgtFilesGrid
{
public:
	HgtFilesGrid();
	~HgtFilesGrid();

	void Init( int maxLoadedFiles, const char* filesPath );
	signed short GetHeight( int iSquare, int jSquare, int i, int j );
	bool IsExists(int i, int j);
	const char* GetFileName( int i, int j );


private:
	int MAX_LOADED_FILES;
	int loadedFiles;

	static const int NCols = 1201;
	static const int NRows = 1201;

	struct FileFlag;

	struct Heights {
		signed short height[NRows][NCols];
		FileFlag *pFileFlag;
	} *dataStack;

	struct FileFlag {
		char *fileName;
		bool isLoaded;
		Heights *pHeightData;
	} hgtFilesGrid[181][361];
};

#endif
