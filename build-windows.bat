@echo off
echo ============================================================
echo MyCustomBrowser - Windows Build Script
echo ============================================================
echo.

REM Step 1: Build the extension
echo Step 1: Building extension...
cd extension
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [31mError: Extension build failed![0m
    cd ..
    pause
    exit /b 1
)
cd ..
echo [32m√ Extension built[0m
echo.

REM Step 2: Download Chromium if not present
echo Step 2: Checking for Chromium...
if not exist "chromium\chrome.exe" (
    echo Chromium not found. Downloading...
    echo This may take a few minutes (~150-200 MB)
    echo.
    node download-chromium.js
    if %ERRORLEVEL% NEQ 0 (
        echo [31mError: Chromium download failed![0m
        pause
        exit /b 1
    )
) else (
    echo [32m√ Chromium already downloaded[0m
)
echo.

REM Step 3: Check if Inno Setup is installed
echo Step 3: Checking for Inno Setup...
set INNO_SETUP="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

if not exist %INNO_SETUP% (
    echo [31mError: Inno Setup not found![0m
    echo Please install Inno Setup from: https://jrsoftware.org/isdl.php
    echo.
    pause
    exit /b 1
)
echo [32m√ Inno Setup found[0m
echo.

REM Step 4: Create the installer
echo Step 4: Creating installer with Inno Setup...
echo This may take a few minutes (packaging ~200MB of files)
echo.
%INNO_SETUP% setup.iss

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [32mBuild complete! Your installer is ready.[0m
    echo ============================================================
    echo.
    echo Location: dist\MyCustomBrowserInstaller.exe
    echo Size: ~150-200 MB
    echo.
    echo To install:
    echo 1. Run MyCustomBrowserInstaller.exe
    echo 2. Follow the installation wizard
    echo 3. Launch from the Start menu or desktop shortcut
    echo.
    echo No Chrome installation required - Chromium is bundled!
) else (
    echo.
    echo [31mError: Build failed![0m
    pause
    exit /b 1
)

pause

