@echo off
setlocal

echo -----------------------------------------
echo Building VSIX package using standalone VSCE...
echo -----------------------------------------

set "BASEDIR=%~dp0"
set "VSCE=%BASEDIR%vsce\vsce.exe"
set "DIST=%BASEDIR%dist"

if not exist "%VSCE%" (
    echo vsce.exe not found in .vscode\vsce\
    echo Download it from:
    echo https://github.com/microsoft/vsce/releases/latest/download/vsce-win32-x64.exe
    pause
    exit /b 1
)

if not exist "%DIST%" mkdir "%DIST%"

"%VSCE%" package --out "%DIST%\micropython-panel.vsix"

if %errorlevel% neq 0 (
    echo VSIX build failed.
    pause
    exit /b 1
)

echo -----------------------------------------
echo VSIX created in: %DIST%
echo -----------------------------------------
pause
