# Build Instructions for MyCustomBrowser

This guide will help you create installers for both Windows (.exe) and macOS (.dmg) that include **Chromium bundled** with your extension. The result is a fully standalone browser that doesn't require Chrome to be installed.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Building for Windows](#building-for-windows)
- [Building for macOS](#building-for-macos)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Customization](#customization)

---

## 🔧 Prerequisites

### For Windows Build:

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/

2. **Inno Setup 6**
   - Download from: https://jrsoftware.org/isdl.php
   - Install to default location: `C:\Program Files (x86)\Inno Setup 6\`

3. **Fast internet connection** (will download ~150-200 MB of Chromium)

4. **Disk space**: ~500 MB free space required

### For macOS Build:

1. **Node.js** (v16 or higher)
   ```bash
   brew install node
   ```

2. **Xcode Command Line Tools** (for `hdiutil`)
   ```bash
   xcode-select --install
   ```

3. **Fast internet connection** (will download ~150-200 MB of Chromium)

4. **Disk space**: ~500 MB free space required

---

## 🪟 Building for Windows

### Step 1: Install Dependencies

```bash
cd extension
npm install
cd ..
```

### Step 2: Run the Build Script

Simply double-click `build-windows.bat` or run from command prompt:

```cmd
build-windows.bat
```

### What It Does:

1. ✅ Builds the extension using Vite
2. ✅ Downloads Chromium if not already present (~150-200 MB)
3. ✅ Creates the installer using Inno Setup
4. ✅ Packages everything (Chromium + Extension) into one installer
5. ✅ Outputs `MyCustomBrowserInstaller.exe` in the `dist` folder

### Build Time:

- **First build**: 5-10 minutes (includes Chromium download)
- **Subsequent builds**: 2-3 minutes (reuses downloaded Chromium)

### Output:

- **File**: `dist/MyCustomBrowserInstaller.exe`
- **Size**: ~150-200 MB

### Installation for End Users:

1. Run `MyCustomBrowserInstaller.exe`
2. Follow the installation wizard
3. Choose to create desktop shortcut (optional)
4. Launch from Start Menu or desktop
5. **No Chrome installation required!** The browser is fully self-contained

---

## 🍎 Building for macOS

### Step 1: Install Dependencies

```bash
cd extension
npm install
cd ..
```

### Step 2: Run the Build Script

```bash
./build-mac.sh
```

### What It Does:

1. ✅ Builds the extension using Vite
2. ✅ Downloads Chromium if not already present (~150-200 MB)
3. ✅ Creates the app bundle structure
4. ✅ Packages everything (Chromium + Extension) into app bundle
5. ✅ Creates a DMG installer
6. ✅ Outputs `MyCustomBrowser-Installer.dmg` in the `dist` folder

### Build Time:

- **First build**: 5-10 minutes (includes Chromium download)
- **Subsequent builds**: 3-5 minutes (reuses downloaded Chromium)

### Output:

- **File**: `dist/MyCustomBrowser-Installer.dmg`
- **Size**: ~200-250 MB

### Installation for End Users:

1. Double-click `MyCustomBrowser-Installer.dmg`
2. Drag `MyCustomBrowser.app` to the `Applications` folder
3. Eject the DMG
4. Launch from Applications folder (or Spotlight)
5. **No Chrome installation required!** The browser is fully self-contained

---

## 🚀 How It Works

### Architecture:

```
MyCustomBrowser
├── Chromium (open-source browser)
│   └── ~150-200 MB
├── Extension (your code)
│   └── ~2-5 MB
└── Launcher Script
    └── Connects them together
```

### What Happens When Users Launch:

1. Launcher script runs
2. Finds bundled Chromium
3. Launches Chromium with `--load-extension` flag
4. Your extension is automatically loaded
5. User data stored in dedicated profile directory

### User Data Locations:

**Windows:**
```
%LOCALAPPDATA%\MyCustomBrowser\Profile
```

**macOS:**
```
~/Library/Application Support/MyCustomBrowser
```

This means bookmarks, settings, and browsing data are kept separate from regular Chrome/Chromium installations.

---

## 📁 Project Structure

```
my-browser/
├── chromium/                    # Downloaded Chromium (gitignored)
│   ├── Chromium.app (Mac)
│   └── chrome.exe (Windows)
│
├── extension/                   # Your Chrome extension source
│   ├── src/
│   ├── dist/                   # Built extension (after npm run build)
│   └── package.json
│
├── mac-app/                    # macOS app bundle template
│   └── MyCustomBrowser.app/
│       └── Contents/
│           ├── Info.plist      # App metadata
│           ├── MacOS/
│           │   └── launcher    # Launch script
│           └── Resources/      # Chromium + Extension copied here during build
│
├── dist/                       # Build output directory
│   ├── MyCustomBrowserInstaller.exe  (Windows, ~150-200 MB)
│   └── MyCustomBrowser-Installer.dmg (macOS, ~200-250 MB)
│
├── download-chromium.js        # Script to download Chromium
├── launcher.bat                # Windows launcher script
├── launcher.sh                 # macOS standalone launcher script
├── setup.iss                   # Inno Setup configuration
├── build-windows.bat           # Windows build script
└── build-mac.sh                # macOS build script
```

---

## 🛠 Troubleshooting

### Windows Issues:

**Problem**: "Inno Setup not found"
- **Solution**: Install Inno Setup from https://jrsoftware.org/isdl.php
- Make sure it's installed in the default location: `C:\Program Files (x86)\Inno Setup 6\`

**Problem**: "Extension build failed"
- **Solution**: Make sure you're in the project root directory
- Run `cd extension && npm install && npm run build` manually

**Problem**: "Chromium download failed"
- **Solution**: Check your internet connection
- Delete `chromium` folder and `.chromium-download` folder, then try again
- Make sure you have ~500 MB free disk space

**Problem**: Installer is too large to distribute
- **Solution**: The installer is ~150-200 MB due to bundled Chromium. This is normal.
- Consider hosting on cloud storage (S3, Google Drive, etc.) instead of email

### macOS Issues:

**Problem**: "Permission denied" when running build script
- **Solution**: Make the script executable:
  ```bash
  chmod +x build-mac.sh
  ```

**Problem**: "hdiutil: command not found"
- **Solution**: Install Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

**Problem**: "Cannot be opened because the developer cannot be verified"
- **Solution**: Users need to right-click the app and choose "Open" the first time
- Or: Sign the app with an Apple Developer certificate (requires paid Apple Developer account)

**Problem**: Chromium download stuck or slow
- **Solution**: Check your internet connection
- The download is ~150-200 MB and may take 5-10 minutes on slow connections
- Delete `chromium` folder and try again

**Problem**: "No space left on device"
- **Solution**: Free up at least 500 MB of disk space
- The build process needs space for: Chromium download, app bundle, and DMG creation

### General Issues:

**Problem**: Build process is very slow
- **Solution**: This is normal for the first build (downloading Chromium)
- Subsequent builds will be faster as Chromium is cached
- On slow internet, the initial download may take 10+ minutes

**Problem**: Want to rebuild with fresh Chromium
- **Solution**: Delete the `chromium` folder and run build script again
  ```bash
  # Mac/Linux
  rm -rf chromium
  ./build-mac.sh
  
  # Windows
  rmdir /s chromium
  build-windows.bat
  ```

---

## 🔧 Customization

### Change App Name:

1. **Windows**: 
   - Edit `setup.iss` - change `AppName` value
   - Edit `launcher.bat` - change profile folder name
   
2. **macOS**: 
   - Rename `mac-app/MyCustomBrowser.app` directory
   - Edit `Info.plist` - change `CFBundleName` and `CFBundleDisplayName`
   - Edit `build-mac.sh` - change `APP_NAME` variable
   - Edit launcher script - change profile folder name

### Add App Icon:

1. **Windows**:
   - Create a `.ico` file (256x256 recommended)
   - Update `setup.iss`: `SetupIconFile=path\to\icon.ico`

2. **macOS**:
   - Create a `.icns` file (1024x1024 recommended)
   - Save as `mac-app/MyCustomBrowser.app/Contents/Resources/AppIcon.icns`
   - The `Info.plist` already references it

### Modify Chromium Flags:

Edit the launcher scripts to add custom Chromium flags:

**Windows** (`launcher.bat`):
```batch
start "" "%CHROMIUM%" --load-extension="%EXT%" --user-data-dir="%PROFILE%" --no-first-run --disable-extensions-except="%EXT%" --new-window
```

**macOS** (`mac-app/MyCustomBrowser.app/Contents/MacOS/launcher`):
```bash
"$CHROMIUM_PATH" --load-extension="$EXT_PATH" --user-data-dir="$PROFILE_PATH" --no-first-run --disable-extensions-except="$EXT_PATH" --new-window
```

Useful flags:
- `--start-maximized` - Start in fullscreen
- `--disable-extensions-except="$EXT"` - Only allow your extension
- `--app=https://example.com` - Open specific URL
- `--disable-features=Translate` - Disable translation
- `--new-window` - Always open in new window

### Use Different Chromium Version:

Edit `download-chromium.js` and change the version numbers in `CHROMIUM_URLS`:

```javascript
const CHROMIUM_URLS = {
  'darwin-x64': 'https://storage.googleapis.com/chromium-browser-snapshots/Mac/1234567/chrome-mac.zip',
  // ... change version number here
};
```

Find version numbers at: https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html

---

## 📦 Distribution

After building:

1. **Test the installer** on a clean machine
2. **Upload to hosting service** (installers are 150-250 MB)
3. **Provide installation instructions** to users
4. **Consider hosting on GitHub Releases** for version management

### Recommended Hosting:

- **GitHub Releases** (free, 2GB file limit per file)
- **AWS S3 + CloudFront** (pay-per-use)
- **Google Drive** (free, simple sharing)
- **Dropbox** (free, simple sharing)
- **DigitalOcean Spaces** (pay-per-use)

### Important Notes:

- Installers are **150-250 MB** - too large for email
- Consider providing **download links** instead
- Users may need to **whitelist** the installer in antivirus software
- On Windows, users may see **SmartScreen warning** (normal for unsigned apps)

---

## 🔒 Code Signing (Recommended)

### Why Sign Your App?

- Removes security warnings
- Builds user trust
- Required for wider distribution

### Windows:

To avoid "Unknown Publisher" warnings:

1. Get a code signing certificate ($100-400/year)
   - Options: Sectigo, DigiCert, GlobalSign
2. Sign the installer:
   ```cmd
   signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com dist\MyCustomBrowserInstaller.exe
   ```

### macOS:

To avoid Gatekeeper warnings:

1. Join the Apple Developer Program ($99/year)
2. Get a Developer ID certificate
3. Sign the app:
   ```bash
   codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" mac-app/MyCustomBrowser.app
   ```
4. Notarize the app (required for macOS 10.15+):
   ```bash
   xcrun notarytool submit dist/MyCustomBrowser-Installer.dmg --apple-id your@email.com --password app-specific-password --team-id TEAMID
   ```

---

## 🔄 Updates

To release a new version:

1. Update your extension code
2. Update version numbers:
   - `extension/package.json`
   - `setup.iss` (Windows)
   - `Info.plist` (macOS)
3. Rebuild both installers
4. Distribute new installers to users

**Note**: Currently no auto-update mechanism is included. Users must download and install new versions manually. Consider implementing auto-update using:
- Electron's auto-updater (if you switch to Electron)
- Custom update checker in your extension
- GitHub Releases API for update checks

---

## 🎯 Advantages of Bundled Chromium

✅ **Fully Self-Contained**: No Chrome installation required  
✅ **Version Control**: Know exactly which browser version users have  
✅ **Consistent Experience**: Same across all installations  
✅ **Extension Always Loaded**: No manual installation steps  
✅ **Separate Profile**: Won't interfere with user's regular Chrome  
✅ **Open Source**: Chromium is free and open source  

## ⚠️ Considerations

❌ **Large File Size**: 150-250 MB installers  
❌ **No Auto-Updates**: Chromium won't auto-update (you control updates)  
❌ **Storage Space**: Takes ~300 MB installed  
❌ **Initial Build Time**: First build takes 5-10 minutes  

---

## 📊 Build Performance

| Action | First Build | Subsequent Builds |
|--------|-------------|-------------------|
| Download Chromium | 3-8 minutes | Skipped (cached) |
| Build Extension | 10-30 seconds | 10-30 seconds |
| Create Installer (Win) | 1-2 minutes | 1-2 minutes |
| Create DMG (Mac) | 2-4 minutes | 2-4 minutes |
| **Total** | **5-10 minutes** | **2-5 minutes** |

---

## 🆘 Support

For build issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Verify all prerequisites are installed
3. Try deleting `chromium` folder and rebuilding
4. Check available disk space (need ~500 MB)

---

## 📝 License

Make sure to include appropriate license information for:
- Your extension code
- Chromium (BSD-style license)
- Any third-party libraries

Chromium License: https://chromium.googlesource.com/chromium/src/+/master/LICENSE

---

**Happy Building! 🚀**

Your users will love having a browser that "just works" without requiring Chrome installation!
