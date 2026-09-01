#include <windows.h>
#include <shellapi.h>
#include <wrl.h>
#include <wil/com.h>
#include <WebView2.h>
#include <string>
#include "resource.h"

using namespace Microsoft::WRL;

// Global Variables
HINSTANCE g_hInst = NULL;
HWND g_hWnd = NULL;
wil::com_ptr<ICoreWebView2Controller> g_controller = nullptr;
wil::com_ptr<ICoreWebView2> g_webview = nullptr;
NOTIFYICONDATA g_nid = { 0 };
bool g_isMinimizedToTray = false;

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

    // Register Window Class
    WNDCLASSEXW wcex = { 0 };
    wcex.cbSize = sizeof(WNDCLASSEX);
    wcex.style = CS_HREDRAW | CS_VREDRAW;
    wcex.lpfnWndProc = WndProc;
    wcex.hInstance = hInstance;
    wcex.hIcon = LoadIconW(hInstance, MAKEINTRESOURCEW(IDI_APP_ICON));
    wcex.hCursor = LoadCursorW(NULL, IDC_ARROW);
    wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wcex.lpszClassName = g_szClassName;
    wcex.hIconSm = LoadIconW(hInstance, MAKEINTRESOURCEW(IDI_APP_ICON));

    if (!RegisterClassExW(&wcex)) {
        MessageBoxW(NULL, L"Failed to register Fizmoh Window Class.", L"Fizmoh Error", MB_ICONERROR);
        return 1;
    }

    // Calculate Screen Center
    int screenW = GetSystemMetrics(SM_CXSCREEN);
    int screenH = GetSystemMetrics(SM_CYSCREEN);
    int windowW = 1280;
    int windowH = 800;
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

void InitWebView(HWND hWnd) {
    // Locate standard local user data folder
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

                            // Navigate to Fizmoh CRM
                            g_webview->Navigate(g_szDefaultUrl);

                            ResizeWebView();
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
