cmake_minimum_required(VERSION 3.20)
project(Fizmoh VERSION 1.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_definitions(-DUNICODE -D_UNICODE)

include(FetchContent)

# Fetch WIL (Header-only)
FetchContent_Declare(
    wil
    GIT_REPOSITORY https://github.com/microsoft/wil.git
    GIT_TAG        v1.0.240803.1
)
FetchContent_MakeAvailable(wil)

# Download WebView2 NuGet Package
set(WEBVIEW2_VERSION "1.0.2792.45")
set(WEBVIEW2_URL "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/${WEBVIEW2_VERSION}")
set(WEBVIEW2_DIR "${CMAKE_BINARY_DIR}/packages/Microsoft.Web.WebView2.${WEBVIEW2_VERSION}")

if(NOT EXISTS "${WEBVIEW2_DIR}")
    file(DOWNLOAD "${WEBVIEW2_URL}" "${CMAKE_BINARY_DIR}/webview2.zip" SHOW_PROGRESS)
    file(ARCHIVE_EXTRACT INPUT "${CMAKE_BINARY_DIR}/webview2.zip" DESTINATION "${WEBVIEW2_DIR}")
endif()

include_directories(
    "${CMAKE_CURRENT_SOURCE_DIR}/src"
    "${WEBVIEW2_DIR}/build/native/include"
)

# Source files
set(SOURCES
    src/main.cpp
    src/resource.rc
)

add_executable(Fizmoh WIN32 ${SOURCES})

target_link_libraries(Fizmoh PRIVATE
    wil
    "${WEBVIEW2_DIR}/build/native/x64/WebView2Loader.dll.lib"
    shlwapi
    shell32
    user32
    gdi32
    advapi32
    ole32
    oleaut32
)

# Copy WebView2Loader.dll next to Fizmoh.exe
add_custom_command(TARGET Fizmoh POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${WEBVIEW2_DIR}/build/native/x64/WebView2Loader.dll"
        "$<TARGET_FILE_DIR:Fizmoh>/WebView2Loader.dll"
)
