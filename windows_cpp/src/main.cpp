#include <windows.h>
#include <shellapi.h>
#include <wrl.h>
#include <wil/com.h>
#include <WebView2.h>
#include <string>
#include <sstream>
#include "resource.h"
#include "splash_icon_b64.h"

using namespace Microsoft::WRL;

// Global Variables
HINSTANCE g_hInst = NULL;
HWND g_hWnd = NULL;
wil::com_ptr<ICoreWebView2Controller> g_controller = nullptr;
wil::com_ptr<ICoreWebView2> g_webview = nullptr;
NOTIFYICONDATA g_nid = { 0 };
bool g_isMinimizedToTray = false;
bool g_hasNavigatedToApp = false;

const wchar_t g_szClassName[] = L"FizmohDesktopAppClass";
const wchar_t g_szTitle[] = L"Fizmoh — WhatsApp Cloud API & CRM";
const wchar_t g_szDefaultUrl[] = L"https://app.fizmoh.cloud/admin";
const wchar_t g_szMutexName[] = L"Global\\Fizmoh_WhatsApp_CRM_Single_Instance_Mutex";

// Forward Declarations
LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);
void InitWebView(HWND hWnd);
void ResizeWebView();
void SetupTrayIcon(HWND hWnd);
void RemoveTrayIcon();
void ShowTrayMenu(HWND hWnd);
std::wstring GenerateSplashScreenHtml();

int WINAPI wWinMain(_In_ HINSTANCE hInstance,
                     _In_opt_ HINSTANCE hPrevInstance,
                     _In_ LPWSTR lpCmdLine,
                     _In_ int nCmdShow) {
    UNREFERENCED_PARAMETER(hPrevInstance);
    UNREFERENCED_PARAMETER(lpCmdLine);

    // Single Instance Check
    HANDLE hMutex = CreateMutexW(NULL, TRUE, g_szMutexName);
    if (GetLastError() == ERROR_ALREADY_EXISTS) {
        HWND hExisting = FindWindowW(g_szClassName, NULL);
        if (hExisting) {
            ShowWindow(hExisting, SW_RESTORE);
            SetForegroundWindow(hExisting);
        }
        if (hMutex) CloseHandle(hMutex);
        return 0;
    }

    // High DPI Awareness
    SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);

    g_hInst = hInstance;

    // Register Window Class with Dark Charcoal Background (#0D1520)
    WNDCLASSEXW wcex = { 0 };
    wcex.cbSize = sizeof(WNDCLASSEX);
    wcex.style = CS_HREDRAW | CS_VREDRAW;
    wcex.lpfnWndProc = WndProc;
    wcex.hInstance = hInstance;
    wcex.hIcon = LoadIconW(hInstance, MAKEINTRESOURCEW(IDI_APP_ICON));
    wcex.hCursor = LoadCursorW(NULL, IDC_ARROW);
    wcex.hbrBackground = CreateSolidBrush(RGB(13, 21, 32)); // Dark theme #0D1520
    wcex.lpszClassName = g_szClassName;
    wcex.hIconSm = (HICON)LoadImageW(hInstance, MAKEINTRESOURCEW(IDI_APP_ICON), IMAGE_ICON, 32, 32, LR_DEFAULTCOLOR);

    if (!RegisterClassExW(&wcex)) {
        MessageBoxW(NULL, L"Failed to register Fizmoh Window Class.", L"Fizmoh Error", MB_ICONERROR);
        return 1;
    }

    // Calculate Screen Center
    int screenW = GetSystemMetrics(SM_CXSCREEN);
    int screenH = GetSystemMetrics(SM_CYSCREEN);
    int windowW = 1280;
    int windowH = 820;
    int posX = (screenW - windowW) / 2;
    int posY = (screenH - windowH) / 2;

    // Create Window
    g_hWnd = CreateWindowW(
        g_szClassName,
        g_szTitle,
        WS_OVERLAPPEDWINDOW,
        posX, posY, windowW, windowH,
        NULL, NULL, hInstance, NULL
    );

    if (!g_hWnd) {
        MessageBoxW(NULL, L"Failed to create Fizmoh application window.", L"Fizmoh Error", MB_ICONERROR);
        return 1;
    }

    // Set large and small window icons explicitly
    HICON hIconBig = LoadIconW(hInstance, MAKEINTRESOURCEW(IDI_APP_ICON));
    HICON hIconSmall = (HICON)LoadImageW(hInstance, MAKEINTRESOURCEW(IDI_APP_ICON), IMAGE_ICON, 16, 16, LR_DEFAULTCOLOR);
    SendMessageW(g_hWnd, WM_SETICON, ICON_BIG, (LPARAM)hIconBig);
    SendMessageW(g_hWnd, WM_SETICON, ICON_SMALL, (LPARAM)hIconSmall);

    ShowWindow(g_hWnd, nCmdShow);
    UpdateWindow(g_hWnd);

    SetupTrayIcon(g_hWnd);
    InitWebView(g_hWnd);

    // Main Message Loop
    MSG msg;
    while (GetMessageW(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    RemoveTrayIcon();
    if (hMutex) {
        ReleaseMutex(hMutex);
        CloseHandle(hMutex);
    }

    return (int)msg.wParam;
}

std::wstring GenerateSplashScreenHtml() {
    std::string iconB64 = g_szSplashIconBase64;
    std::stringstream ss;
    ss << "<!DOCTYPE html>"
       << "<html lang='en'>"
       << "<head>"
       << "<meta charset='UTF-8'/>"
       << "<meta name='viewport' content='width=device-width, initial-scale=1.0'/>"
       << "<title>Fizmoh</title>"
       << "<style>"
       << "* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }"
       << "body {"
       << "  background: radial-gradient(circle at 50% 30%, #152233 0%, #0D1520 70%, #080D14 100%);"
       << "  height: 100vh;"
       << "  display: flex;"
       << "  flex-direction: column;"
       << "  align-items: center;"
       << "  justify-content: center;"
       << "  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;"
       << "  color: #FFFFFF;"
       << "  overflow: hidden;"
       << "}"
       << ".container {"
       << "  display: flex;"
       << "  flex-direction: column;"
       << "  align-items: center;"
       << "  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;"
       << "}"
       << ".logo-wrapper {"
       << "  position: relative;"
       << "  width: 110px;"
       << "  height: 110px;"
       << "  margin-bottom: 24px;"
       << "  display: flex;"
       << "  align-items: center;"
       << "  justify-content: center;"
       << "}"
       << ".glow-ring {"
       << "  position: absolute;"
       << "  inset: -12px;"
       << "  border-radius: 32px;"
       << "  background: radial-gradient(circle, rgba(0,231,133,0.35) 0%, rgba(0,231,133,0) 70%);"
       << "  animation: pulseGlow 2.5s infinite ease-in-out;"
       << "}"
       << ".logo-img {"
       << "  width: 96px;"
       << "  height: 96px;"
       << "  border-radius: 24px;"
       << "  box-shadow: 0 12px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);"
       << "  z-index: 2;"
       << "}"
       << ".title {"
       << "  font-size: 28px;"
       << "  font-weight: 800;"
       << "  letter-spacing: -0.5px;"
       << "  color: #FFFFFF;"
       << "  margin-bottom: 6px;"
       << "}"
       << ".badge {"
       << "  font-size: 11px;"
       << "  font-weight: 700;"
       << "  color: #00E785;"
       << "  background: rgba(0, 231, 133, 0.12);"
       << "  border: 1px solid rgba(0, 231, 133, 0.3);"
       << "  padding: 4px 12px;"
       << "  border-radius: 20px;"
       << "  letter-spacing: 0.5px;"
       << "  text-transform: uppercase;"
       << "  margin-bottom: 32px;"
       << "}"
       << ".progress-bar {"
       << "  width: 200px;"
       << "  height: 4px;"
       << "  background: rgba(255,255,255,0.1);"
       << "  border-radius: 4px;"
       << "  overflow: hidden;"
       << "  position: relative;"
       << "  margin-bottom: 14px;"
       << "}"
       << ".progress-fill {"
       << "  position: absolute;"
       << "  height: 100%;"
       << "  background: linear-gradient(90deg, #00E785, #00b368);"
       << "  border-radius: 4px;"
       << "  animation: loadProgress 1.5s infinite ease-in-out;"
       << "}"
       << ".status-text {"
       << "  font-size: 12px;"
       << "  color: #8E9CAE;"
       << "  font-weight: 500;"
       << "}"
       << "@keyframes fadeIn {"
       << "  from { opacity: 0; transform: translateY(12px) scale(0.97); }"
       << "  to { opacity: 1; transform: translateY(0) scale(1); }"
       << "}"
       << "@keyframes pulseGlow {"
       << "  0%, 100% { opacity: 0.4; transform: scale(0.95); }"
       << "  50% { opacity: 0.9; transform: scale(1.1); }"
       << "}"
       << "@keyframes loadProgress {"
       << "  0% { left: -40%; width: 40%; }"
       << "  50% { left: 30%; width: 50%; }"
       << "  100% { left: 100%; width: 40%; }"
       << "}"
       << "</style>"
       << "</head>"
       << "<body>"
       << "<div class='container'>"
       << "  <div class='logo-wrapper'>"
       << "    <div class='glow-ring'></div>"
       << "    <img class='logo-img' src='data:image/png;base64," << iconB64 << "' alt='Fizmoh Logo'/>"
       << "  </div>"
       << "  <h1 class='title'>Fizmoh</h1>"
       << "  <div class='badge'>WhatsApp Cloud API &amp; CRM</div>"
       << "  <div class='progress-bar'>"
       << "    <div class='progress-fill'></div>"
       << "  </div>"
       << "  <p class='status-text'>Connecting to secure WhatsApp workspace...</p>"
       << "</div>"
       << "</body>"
       << "</html>";

    std::string s = ss.str();
    int len = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, NULL, 0);
    std::wstring ws(len, 0);
    MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, &ws[0], len);
    return ws;
}

void InitWebView(HWND hWnd) {
    wchar_t localAppData[MAX_PATH];
    GetEnvironmentVariableW(L"LOCALAPPDATA", localAppData, MAX_PATH);
    std::wstring userDataFolder = std::wstring(localAppData) + L"\\Fizmoh\\WebView2";

    CreateCoreWebView2EnvironmentWithOptions(
        nullptr,
        userDataFolder.c_str(),
        nullptr,
        Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
            [hWnd](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
                if (FAILED(result) || !env) {
                    MessageBoxW(hWnd, 
                        L"Microsoft Edge WebView2 runtime is required to run Fizmoh.\nPlease download and install WebView2 from Microsoft.", 
                        L"WebView2 Runtime Missing", MB_ICONERROR);
                    return result;
                }

                env->CreateCoreWebView2Controller(
                    hWnd,
                    Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                        [hWnd](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
                            if (FAILED(result) || !controller) {
                                return result;
                            }

                            g_controller = controller;
                            g_controller->get_CoreWebView2(&g_webview);

                            // Configure Settings
                            wil::com_ptr<ICoreWebView2Settings> settings;
                            g_webview->get_Settings(&settings);
                            if (settings) {
                                settings->put_IsScriptEnabled(TRUE);
                                settings->put_AreDefaultScriptDialogsEnabled(TRUE);
                                settings->put_IsWebMessageEnabled(TRUE);
                                settings->put_AreDevToolsEnabled(TRUE);
                                settings->put_AreDefaultContextMenusEnabled(TRUE);
                                settings->put_IsStatusBarEnabled(FALSE);
                            }

                            // Automatically grant microphone & notification permissions for WhatsApp Voice Notes
                            wil::com_ptr<ICoreWebView2_2> webview2;
                            if (SUCCEEDED(g_webview->QueryInterface(IID_PPV_ARGS(&webview2)))) {
                                g_webview->add_PermissionRequested(
                                    Callback<ICoreWebView2PermissionRequestedEventHandler>(
                                        [](ICoreWebView2* sender, ICoreWebView2PermissionRequestedEventArgs* args) -> HRESULT {
                                            COREWEBVIEW2_PERMISSION_KIND kind;
                                            args->get_PermissionKind(&kind);
                                            if (kind == COREWEBVIEW2_PERMISSION_KIND_MICROPHONE ||
                                                kind == COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS) {
                                                args->put_State(COREWEBVIEW2_PERMISSION_STATE_ALLOW);
                                            }
                                            return S_OK;
                                        }).Get(), nullptr);
                            }

                            // 1. Show instant premium branded splash screen
                            std::wstring splashHtml = GenerateSplashScreenHtml();
                            g_webview->NavigateToString(splashHtml.c_str());
                            ResizeWebView();

                            // 2. Smoothly transition to the CRM dashboard after 1.2 seconds
                            SetTimer(hWnd, 101, 1200, NULL);

                            return S_OK;
                        }).Get());
                return S_OK;
            }).Get());
}

void ResizeWebView() {
    if (g_controller) {
        RECT bounds;
        GetClientRect(g_hWnd, &bounds);
        g_controller->put_Bounds(bounds);
    }
}

void SetupTrayIcon(HWND hWnd) {
    ZeroMemory(&g_nid, sizeof(NOTIFYICONDATA));
    g_nid.cbSize = sizeof(NOTIFYICONDATA);
    g_nid.hWnd = hWnd;
    g_nid.uID = 1;
    g_nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
    g_nid.uCallbackMessage = WM_TRAYICON;
    g_nid.hIcon = LoadIconW(g_hInst, MAKEINTRESOURCEW(IDI_APP_ICON));
    wcscpy_s(g_nid.szTip, L"Fizmoh WhatsApp CRM");
    Shell_NotifyIconW(NIM_ADD, &g_nid);
}

void RemoveTrayIcon() {
    Shell_NotifyIconW(NIM_DELETE, &g_nid);
}

void ShowTrayMenu(HWND hWnd) {
    POINT pt;
    GetCursorPos(&pt);
    HMENU hMenu = CreatePopupMenu();
    InsertMenuW(hMenu, 0, MF_BYPOSITION | MF_STRING, ID_TRAY_OPEN, L"Open Fizmoh CRM");
    InsertMenuW(hMenu, 1, MF_BYPOSITION | MF_STRING, ID_TRAY_DASHBOARD, L"Open Live Dashboard");
    InsertMenuW(hMenu, 2, MF_BYPOSITION | MF_STRING, ID_TRAY_RELOAD, L"Reload WhatsApp Inbox");
    InsertMenuW(hMenu, 3, MF_BYPOSITION | MF_SEPARATOR, 0, NULL);
    InsertMenuW(hMenu, 4, MF_BYPOSITION | MF_STRING, ID_TRAY_DOWNLOADS, L"Check for Updates...");
    InsertMenuW(hMenu, 5, MF_BYPOSITION | MF_SEPARATOR, 0, NULL);
    InsertMenuW(hMenu, 6, MF_BYPOSITION | MF_STRING, ID_TRAY_EXIT, L"Exit");

    SetForegroundWindow(hWnd);
    TrackPopupMenu(hMenu, TPM_BOTTOMALIGN | TPM_LEFTALIGN, pt.x, pt.y, 0, hWnd, NULL);
    DestroyMenu(hMenu);
}

LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
    switch (message) {
    case WM_TIMER:
        if (wParam == 101) {
            KillTimer(hWnd, 101);
            if (!g_hasNavigatedToApp && g_webview) {
                g_hasNavigatedToApp = true;
                g_webview->Navigate(g_szDefaultUrl);
            }
        }
        break;

    case WM_SIZE:
        if (wParam == SIZE_MINIMIZED) {
            ShowWindow(hWnd, SW_HIDE);
            g_isMinimizedToTray = true;
        } else {
            ResizeWebView();
        }
        break;

    case WM_TRAYICON:
        if (lParam == WM_LBUTTONDBLCLK || lParam == WM_LBUTTONUP) {
            ShowWindow(hWnd, SW_SHOW);
            ShowWindow(hWnd, SW_RESTORE);
            SetForegroundWindow(hWnd);
            g_isMinimizedToTray = false;
        } else if (lParam == WM_RBUTTONUP) {
            ShowTrayMenu(hWnd);
        }
        break;

    case WM_COMMAND: {
        int wmId = LOWORD(wParam);
        switch (wmId) {
        case ID_TRAY_OPEN:
            ShowWindow(hWnd, SW_SHOW);
            ShowWindow(hWnd, SW_RESTORE);
            SetForegroundWindow(hWnd);
            break;
        case ID_TRAY_DASHBOARD:
            if (g_webview) g_webview->Navigate(L"https://app.fizmoh.cloud/admin");
            ShowWindow(hWnd, SW_SHOW);
            ShowWindow(hWnd, SW_RESTORE);
            SetForegroundWindow(hWnd);
            break;
        case ID_TRAY_RELOAD:
            if (g_webview) g_webview->Reload();
            break;
        case ID_TRAY_DOWNLOADS:
            ShellExecuteW(NULL, L"open", L"https://app.fizmoh.cloud/downloads/", NULL, NULL, SW_SHOWNORMAL);
            break;
        case ID_TRAY_EXIT:
            DestroyWindow(hWnd);
            break;
        }
        break;
    }

    case WM_KEYDOWN:
        if (wParam == VK_F5) {
            if (g_webview) g_webview->Reload();
        }
        break;

    case WM_CLOSE:
        // Minimize to tray on close
        ShowWindow(hWnd, SW_HIDE);
        g_isMinimizedToTray = true;
        return 0;

    case WM_DESTROY:
        PostQuitMessage(0);
        break;

    default:
        return DefWindowProcW(hWnd, message, wParam, lParam);
    }
    return 0;
}
