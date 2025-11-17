#!/bin/bash

echo "============================================================"
echo "MyCustomBrowser - macOS Build Script"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Exit on error
set -e

# Step 1: Build the extension
echo -e "${YELLOW}Step 1: Building extension...${NC}"
cd extension
npm run build
cd ..
echo -e "${GREEN}✓ Extension built${NC}"
echo ""

# Step 2: Download Chromium if not present
echo -e "${YELLOW}Step 2: Checking for Chromium...${NC}"
if [ ! -f "chromium/Chromium.app/Contents/MacOS/Chromium" ]; then
    echo "Chromium not found. Downloading..."
    echo "This may take a few minutes (~150-200 MB)"
    echo ""
    node download-chromium.js
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Chromium download failed!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Chromium already downloaded${NC}"
fi
echo ""

# Step 3: Prepare the app bundle
echo -e "${YELLOW}Step 3: Preparing app bundle...${NC}"
APP_NAME="MyCustomBrowser"
APP_BUNDLE="mac-app/${APP_NAME}.app"

# Create necessary directories
mkdir -p "${APP_BUNDLE}/Contents/MacOS"
mkdir -p "${APP_BUNDLE}/Contents/Resources"

# Ensure launcher script is executable
chmod +x mac-app/${APP_NAME}.app/Contents/MacOS/launcher

# Copy extension to Resources
echo "Copying extension..."
rm -rf "${APP_BUNDLE}/Contents/Resources/extension"
cp -r extension "${APP_BUNDLE}/Contents/Resources/"

# Copy Chromium to Resources
echo "Copying Chromium (this may take a minute)..."
rm -rf "${APP_BUNDLE}/Contents/Resources/chromium"
mkdir -p "${APP_BUNDLE}/Contents/Resources/chromium"
cp -R chromium/Chromium.app "${APP_BUNDLE}/Contents/Resources/chromium/"

echo -e "${GREEN}✓ App bundle prepared${NC}"
echo ""

# Step 4: Create DMG
echo -e "${YELLOW}Step 4: Creating DMG...${NC}"

DMG_NAME="${APP_NAME}-Installer.dmg"
VOLUME_NAME="${APP_NAME} Installer"
SOURCE_FOLDER="mac-app"
OUTPUT_DMG="dist/${DMG_NAME}"

# Create dist directory if it doesn't exist
mkdir -p dist

# Remove old DMG files if they exist
rm -f "${OUTPUT_DMG}"
rm -f "dist/temp.dmg"

# Calculate size needed (Chromium + extension is ~450-500MB)
echo "Creating temporary DMG (this may take a few minutes)..."
hdiutil create -srcfolder "${SOURCE_FOLDER}" -volname "${VOLUME_NAME}" -fs HFS+ \
    -fsargs "-c c=64,a=16,e=16" -format UDRW -size 600m "dist/temp.dmg"

# Mount the temporary DMG
echo "Mounting temporary DMG..."
DEVICE=$(hdiutil attach -readwrite -noverify -noautoopen "dist/temp.dmg" | \
    egrep '^/dev/' | sed 1q | awk '{print $1}')

# Wait for mount
sleep 2

# Create a symlink to /Applications (if not exists)
echo "Creating Applications symlink..."
if [ ! -e "/Volumes/${VOLUME_NAME}/Applications" ]; then
  ln -s /Applications "/Volumes/${VOLUME_NAME}/Applications"
else
  echo "Applications symlink already exists, skipping..."
fi

# Unmount
echo "Unmounting temporary DMG..."
hdiutil detach "${DEVICE}"

# Convert to compressed DMG
echo "Converting to compressed DMG (this may take a few minutes)..."
hdiutil convert "dist/temp.dmg" -format UDZO -imagekey zlib-level=9 -o "${OUTPUT_DMG}"

# Remove temporary DMG
rm -f "dist/temp.dmg"

echo -e "${GREEN}✓ DMG created${NC}"
echo ""

# Get file size
DMG_SIZE=$(du -h "${OUTPUT_DMG}" | cut -f1)

echo "============================================================"
echo -e "${GREEN}Build complete! Your installer is ready.${NC}"
echo "============================================================"
echo ""
echo "Location: ${OUTPUT_DMG}"
echo "Size: ${DMG_SIZE}"
echo ""
echo "To install:"
echo "1. Double-click the DMG file"
echo "2. Drag ${APP_NAME}.app to the Applications folder"
echo "3. Launch ${APP_NAME} from Applications"
echo ""
echo "No Chrome installation required - Chromium is bundled!"
echo ""

