
@echo off
setlocal

echo -----------------------------------------
echo Checking Node.js installation...
echo -----------------------------------------

set "BASEDIR=%~dp0"
set "NODEDIR=%BASEDIR%nodejs"
set "NODEFOLDER=%NODEDIR%\node-v18.19.0-win-x64"
set "NODEEXE=%NODEFOLDER%\node.exe"

if exist "%NODEEXE%" (
    echo Node.js already installed locally.
    "%NODEEXE%" --version
    goto :end
)

echo Node.js not found.
echo Downloading portable Node.js...

set "ZIPFILE=%TEMP%\node-portable.zip"

powershell -Command "Invoke-WebRequest -Uri \"https://nodejs.org/dist/v18.19.0/node-v18.19.0-win-x64.zip\" -OutFile \"%ZIPFILE%\""

if not exist "%ZIPFILE%" (
    echo Failed to download Node.js ZIP.
    pause
    exit /b 1
)

echo Extracting Node.js...
powershell -Command "Expand-Archive -Path '%ZIPFILE%' -DestinationPath '%NODEDIR%' -Force"

if not exist "%NODEEXE%" (
    echo Extraction failed or wrong path.
    pause
    exit /b 1
)

echo Creating npm wrapper...
echo @echo off > "%NODEDIR%\npm.cmd"
echo "%NODEEXE%" "%NODEFOLDER%\node_modules\npm\bin\npm-cli.js" %%* >> "%NODEDIR%\npm.cmd"

echo Node.js installed locally.
"%NODEEXE%" --version

:end
echo -----------------------------------------
echo Node.js portable setup complete.
echo -----------------------------------------
pause
