#include <conio.h>
#include <iostream>
#include <time.h>

char logAllFileName[] = "d:\\all.log";
char logErrFileName[] = "d:\\err.log";

enum LOGTYPE {
	ALL,
	ERROR
};

void getDateTime( char* dateTime) {
	time_t rawtime;
	struct tm * timeinfo;
	time ( &rawtime );
	timeinfo = localtime ( &rawtime );

	strcpy_s( dateTime, 32, asctime(timeinfo) );
	int len = strlen(dateTime);
	dateTime[len-1] = ':';
	dateTime[len] = ' ';
	dateTime[len+1] = '\0';
}

inline void writeLog(const char* logFileName, const char* dateTime, const char* msg) {
	FILE* fp;
	errno_t err;
	if( err = fopen_s( &fp, logAllFileName, "a+t") != 0 ) {
		std::cout << dateTime << " log file error\n";
		return;
	}
	fwrite( dateTime, sizeof(char), strlen(dateTime), fp);
	fwrite( msg, sizeof(char), strlen(msg), fp);
	fclose(fp);
}

void Log( const char* msg, LOGTYPE type = LOGTYPE::ALL ) {
	std::cout << msg;
	char currTime[32] = "";
	getDateTime(currTime);
	writeLog( logAllFileName, currTime, msg );
	if( type == LOGTYPE::ERROR ) {
		writeLog( logErrFileName, currTime, msg );
	}
}

inline void LogAll(const char* msg) {
	Log(msg);
}

inline void LogErr(const char* msg) {
	Log(msg, LOGTYPE::ERROR);
}