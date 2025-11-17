@echo off
REM MyCustomBrowser Launcher - Windows
REM Launches bundled Chromium with extension pre-loaded

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

REM Path to bundled Chromium
set "CHROMIUM=%SCRIPT_DIR%chromium\chrome.exe"

REM Path to extension
set "EXT=%SCRIPT_DIR%extension\dist"

REM User data directory (for settings, bookmarks, etc.)
set "PROFILE=%LOCALAPPDATA%\MyCustomBrowser\Profile"

REM Check if Chromium exists
if not exist "%CHROMIUM%" (
    echo ERROR: Chromium not found!
    echo Expected location: %CHROMIUM%
    echo.
    echo Please reinstall MyCustomBrowser.
    pause
    exit /b 1
)

REM Create profile directory if it doesn't exist
if not exist "%PROFILE%" mkdir "%PROFILE%"

REM Launch Chromium with extension
start "" "%CHROMIUM%" --load-extension="%EXT%" --user-data-dir="%PROFILE%" --no-first-run --no-default-browser-check

