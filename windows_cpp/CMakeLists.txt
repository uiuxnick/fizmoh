cmake_minimum_required(VERSION 3.15)
project(Fizmoh VERSION 1.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_definitions(-DUNICODE -D_UNICODE)

# Locate WebView2 and WIL NuGet packages installed in packages/
file(GLOB WEBVIEW2_DIRS "${CMAKE_CURRENT_SOURCE_DIR}/packages/Microsoft.Web.WebView2.*")
file(GLOB WIL_DIRS "${CMAKE_CURRENT_SOURCE_DIR}/packages/Microsoft.Windows.ImplementationLibrary.*")

list(GET WEBVIEW2_DIRS 0 WEBVIEW2_DIR)
list(GET WIL_DIRS 0 WIL_DIR)

message(STATUS "Using WebView2 from: ${WEBVIEW2_DIR}")
message(STATUS "Using WIL from: ${WIL_DIR}")

include_directories(
    "${CMAKE_CURRENT_SOURCE_DIR}/src"
    "${WEBVIEW2_DIR}/build/native/include"
    "${WIL_DIR}/include"
)

# Source files
set(SOURCES
    src/main.cpp
    src/resource.rc
)

add_executable(Fizmoh WIN32 ${SOURCES})

target_link_libraries(Fizmoh PRIVATE
    "${WEBVIEW2_DIR}/build/native/x64/WebView2Loader.dll.lib"
    shlwapi
    shell32
    user32
    gdi32
    advapi32
    ole32
    oleaut32
)

# Copy WebView2Loader.dll next to Fizmoh.exe in build folder
add_custom_command(TARGET Fizmoh POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${WEBVIEW2_DIR}/build/native/x64/WebView2Loader.dll"
        "$<TARGET_FILE_DIR:Fizmoh>/WebView2Loader.dll"
)
