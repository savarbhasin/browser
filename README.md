# MyCustomBrowser

A custom browser application that launches Google Chrome with your extension pre-installed.

## 🚀 Quick Start

### For Developers:

**Build Windows Installer (.exe):**
```cmd
build-windows.bat
```

**Build macOS Installer (.dmg):**
```bash
./build-mac.sh
```

See [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) for detailed build documentation.

---

## 📦 What's Included

- **Windows Installer**: Creates a `.exe` installer using Inno Setup
- **macOS Installer**: Creates a `.dmg` installer with app bundle
- **Chrome Extension**: Your phishing detection extension
- **Auto-loading**: Extension loads automatically when browser launches

---

## 🎯 Features

- ✅ One-click installer for Windows and macOS
- ✅ Launches Chrome with extension pre-loaded
- ✅ No manual extension installation needed
- ✅ Separate user profile for your browser
- ✅ Desktop shortcuts (optional on Windows)
- ✅ Clean uninstallation

---

## 📋 Requirements

### For Building:
- **Windows**: Node.js, Inno Setup 6
- **macOS**: Node.js, Xcode Command Line Tools

### For End Users:
- Google Chrome installed
- Windows 10+ or macOS 10.13+

---

## 🛠 Project Structure

```
my-browser/
├── extension/              # Chrome extension source code
├── mac-app/               # macOS app bundle template
├── dist/                  # Build output (installers)
├── launcher.bat           # Windows launcher
├── launcher.sh            # macOS launcher
├── build-windows.bat      # Windows build script
├── build-mac.sh           # macOS build script
└── setup.iss             # Inno Setup configuration
```

---

## 📖 Documentation

- [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) - Complete build guide
- [extension/TESTING.md](extension/TESTING.md) - Extension testing guide
- [extension/OAUTH_SETUP.md](extension/OAUTH_SETUP.md) - OAuth configuration

---

## 🤝 Contributing

1. Make changes to the extension in `extension/src/`
2. Test with `cd extension && npm run dev`
3. Build installers using the build scripts
4. Test installers on clean machines

---

## 📝 License

[Add your license here]

---

## 🆘 Support

For build issues, see [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md#troubleshooting)

---

Built with ❤️ using Chrome Extensions, Vite, React, and TypeScript

