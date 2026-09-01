; Inno Setup script for Fizmoh Native C++ Windows Desktop Application
; Generates standalone Fizmoh-Setup.exe installer (~3 MB)

#define MyAppName "Fizmoh"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "Fizmoh Cloud Platform"
#define MyAppURL "https://app.fizmoh.cloud"
#define MyAppExeName "Fizmoh.exe"

[Setup]
AppId={{E589412A-98C3-48FA-A4B7-1FB2B7C80EF3}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/contact
AppUpdatesURL={#MyAppURL}/downloads
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
DefaultGroupName={#MyAppName}
OutputDir=build\installer
OutputBaseFilename=Fizmoh-Setup
SetupIconFile=resources\app_icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "Create a &Quick Launch shortcut"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "build\Release\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\Release\WebView2Loader.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "resources\app_icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
