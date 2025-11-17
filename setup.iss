[Setup]
AppName=MyCustomBrowser
AppVersion=1.0
AppPublisher=MyCustomBrowser Team
AppPublisherURL=https://mycustombrowser.com
AppSupportURL=https://mycustombrowser.com/support
AppUpdatesURL=https://mycustombrowser.com/updates
DefaultDirName={autopf}\MyCustomBrowser
DefaultGroupName=MyCustomBrowser
AllowNoIcons=yes
LicenseFile=
InfoBeforeFile=
InfoAfterFile=
OutputDir=dist
OutputBaseFilename=MyCustomBrowserInstaller
SetupIconFile=
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\launcher.bat

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
; Chromium browser (bundled)
Source: "chromium\*"; DestDir: "{app}\chromium"; Flags: ignoreversion recursesubdirs createallsubdirs
; Extension files
Source: "extension\dist\*"; DestDir: "{app}\extension\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "extension\package.json"; DestDir: "{app}\extension"; Flags: ignoreversion
; Launcher script
Source: "launcher.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\MyCustomBrowser"; Filename: "{app}\launcher.bat"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,MyCustomBrowser}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\MyCustomBrowser"; Filename: "{app}\launcher.bat"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\MyCustomBrowser"; Filename: "{app}\launcher.bat"; WorkingDir: "{app}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\launcher.bat"; Description: "{cm:LaunchProgram,MyCustomBrowser}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
