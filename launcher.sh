#!/bin/bash

# MyCustomBrowser Launcher - macOS
# Launches bundled Chromium with extension pre-loaded

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Path to bundled Chromium
CHROMIUM_PATH="$DIR/chromium/Chromium.app/Contents/MacOS/Chromium"

# Check if Chromium exists
if [ ! -f "$CHROMIUM_PATH" ]; then
    osascript -e 'display dialog "Chromium not found!\n\nExpected location:\n'"$CHROMIUM_PATH"'\n\nPlease reinstall MyCustomBrowser." buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

# Extension path
EXT_PATH="$DIR/extension/dist"

# User data directory (for settings, bookmarks, etc.)
PROFILE_PATH="$HOME/Library/Application Support/MyCustomBrowser"

# Create profile directory if it doesn't exist
mkdir -p "$PROFILE_PATH"

# Launch Chromium with the extension
"$CHROMIUM_PATH" --load-extension="$EXT_PATH" --user-data-dir="$PROFILE_PATH" --no-first-run --no-default-browser-check > /dev/null 2>&1 &

