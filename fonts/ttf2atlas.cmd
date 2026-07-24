@echo off
setlocal

if "%~1"=="" (
  echo Usage: %~nx0 ^<font.ttf^> [output_dir]
  exit /b 1
)

set "FONT_PATH=%~1"
set "OUT_DIR=%~2"
if "%OUT_DIR%"=="" set "OUT_DIR=."
set "FONT_NAME=%~n1"
set "SCRIPT_DIR=%~dp0"
set "ATLAS_EXE=%SCRIPT_DIR%msdf-atlas-gen.exe"

if not exist "%ATLAS_EXE%" (
  echo File not found: %ATLAS_EXE%
  exit /b 1
)

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

"%ATLAS_EXE%" -font "%FONT_PATH%" -charset "%SCRIPT_DIR%charset.txt" -type mtsdf -dimensions 1024 1024 -size 28 -pxrange 12 -pxpadding 1 -format png -imageout "%OUT_DIR%\%FONT_NAME%.png" -json "%OUT_DIR%\%FONT_NAME%.json"
