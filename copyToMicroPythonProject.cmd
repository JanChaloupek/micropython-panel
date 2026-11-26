@echo off
setlocal enabledelayedexpansion

echo -----------------------------------------
echo Copy MicroPython ^& CircuitPython Panel VSIX to the starter project
echo -----------------------------------------

REM Pracujeme ve slozce tohoto skriptu (koren rozsireni), at je odkud spusten
pushd "%~dp0"

REM Najdi nejnovejsi VSIX v koreni rozsireni
set "latestVsix="
for /f "delims=" %%F in ('dir /b /a:-d /o:-d "*.vsix"') do (
    set "latestVsix=%%F"
    goto found
)

echo ERROR: No VSIX file found in %~dp0
popd
exit /b 1

:found
echo Found latest VSIX: %latestVsix%

REM Cil: startovaci projekt kurzu - odtud ho instaluje setup.bat / setup.sh
set "target=..\_vsc_init_circuitPythonProject\.vscode\dist\micropython-panel.vsix"

echo Copying to project as %target% ...
copy /y "%latestVsix%" "%target%" >nul

if errorlevel 1 (
    echo ERROR: Copy failed.
    popd
    exit /b 1
)

popd
echo Done.
echo -----------------------------------------
echo VSIX copied successfully.
