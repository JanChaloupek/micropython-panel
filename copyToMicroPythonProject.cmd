@echo off
setlocal enabledelayedexpansion

echo -----------------------------------------
echo Copy MicroPython Panel VSIX to project
echo -----------------------------------------

REM Najdi nejnovější VSIX v root projektu
set "latestVsix="

for /f "delims=" %%F in ('dir /b /a:-d /o:-d "*.vsix"') do (
    set "latestVsix=%%F"
    goto found
)

echo ERROR: No VSIX file found in dist\
exit /b 1

:found
echo Found latest VSIX: %latestVsix%

REM Cílový soubor v MicroPython projektu
set "target=..\3-MicroPython\.vscode\dist\MicroPython-panel.vsix"

echo Copying to project as %target% ...
copy /y "%latestVsix%" "%target%" >nul

if errorlevel 1 (
    echo ERROR: Copy failed.
    exit /b 1
)

echo Done.
echo -----------------------------------------
echo VSIX copied successfully.
