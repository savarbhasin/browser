#!/bin/bash

# Pack the extension with a fixed key to ensure consistent extension ID
# This is critical for OAuth redirect URIs to work correctly

EXTENSION_DIR="extension/dist"
KEY_FILE="extension.pem"
OUTPUT_DIR="extension-packed"

echo "Packing extension with fixed key..."

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if key exists, if not Chrome will generate one
if [ ! -f "$KEY_FILE" ]; then
    echo "No key found. Chrome will generate one on first pack."
    echo "Save the generated .pem file for future builds!"
fi

# Use Chromium to pack the extension
# Note: This requires Chromium to be downloaded first
CHROMIUM_PATH="chromium/Chromium.app/Contents/MacOS/Chromium"

if [ ! -f "$CHROMIUM_PATH" ]; then
    echo "Error: Chromium not found. Run download-chromium.js first."
    exit 1
fi

# Pack extension (Chromium will create .crx and save/use .pem)
if [ -f "$KEY_FILE" ]; then
    "$CHROMIUM_PATH" --pack-extension="$EXTENSION_DIR" --pack-extension-key="$KEY_FILE" 2>/dev/null
else
    "$CHROMIUM_PATH" --pack-extension="$EXTENSION_DIR" 2>/dev/null
fi

# Move the packed extension and key
if [ -f "extension/dist.crx" ]; then
    mv extension/dist.crx "$OUTPUT_DIR/extension.crx"
    echo "✓ Extension packed: $OUTPUT_DIR/extension.crx"
fi

if [ -f "extension/dist.pem" ]; then
    mv extension/dist.pem "$KEY_FILE"
    echo "✓ Key saved: $KEY_FILE"
    echo ""
    echo "IMPORTANT: Keep $KEY_FILE secure and never share it!"
    echo "This key ensures all users get the same extension ID."
fi

# Extract the extension ID from the key
if [ -f "$KEY_FILE" ]; then
    # Calculate extension ID from public key
    # This is a base32 encoding of the first 128 bits of the SHA256 hash
    echo ""
    echo "Your extension will have a consistent ID across all installations."
fi

