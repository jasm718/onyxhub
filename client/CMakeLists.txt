cmake_minimum_required(VERSION 3.20)

project(OnyxHubClient VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

find_package(Qt6 6.5 REQUIRED COMPONENTS Core Core5Compat Gui Quick Qml Network Svg Widgets)

qt_standard_project_setup()

set(FLUENTUI_BUILD_EXAMPLES OFF CACHE BOOL "Build FluentUI examples" FORCE)
set(FLUENTUI_BUILD_STATIC_LIB OFF CACHE BOOL "Build FluentUI as static library" FORCE)
set(FLUENTUI_QML_PLUGIN_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/qml/FluentUI" CACHE PATH "Path to FluentUI plugin" FORCE)
add_subdirectory(third_party/FluentUI)

qt_add_executable(onyxhub-client
    MANUAL_FINALIZATION
    src/main.cpp
    src/api/ApiClient.cpp
    src/api/ApiClient.h
    src/app/ApplicationModel.cpp
    src/app/ApplicationModel.h
    src/app/ClientApp.cpp
    src/app/ClientApp.h
    src/launcher/Launcher.cpp
    src/launcher/Launcher.h
)

qt_add_qml_module(onyxhub-client
    URI OnyxHub.Client
    VERSION 1.0
    QML_FILES
        qml/App.qml
        qml/components/AppCard.qml
        qml/components/ClientTitleBar.qml
        qml/components/SettingsPanel.qml
        qml/pages/AppsPage.qml
        qml/pages/LoginPage.qml
    RESOURCES
        assets/login-landscape-bg.jpg
        assets/login-landscape-bg2.png
)

target_include_directories(onyxhub-client PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_compile_definitions(onyxhub-client PRIVATE
    QT_MESSAGELOGCONTEXT
)

target_link_libraries(onyxhub-client PRIVATE
    Qt6::Core
    Qt6::Core5Compat
    Qt6::Gui
    Qt6::Quick
    Qt6::Qml
    Qt6::Network
    Qt6::Svg
    Qt6::Widgets
    fluentuiplugin
)

set_target_properties(onyxhub-client PROPERTIES
    WIN32_EXECUTABLE TRUE
    MACOSX_BUNDLE TRUE
    MACOSX_BUNDLE_GUI_IDENTIFIER com.onyxhub.client
)

install(TARGETS onyxhub-client
    BUNDLE DESTINATION .
    RUNTIME DESTINATION bin
)

install(DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/qml/FluentUI"
    DESTINATION imports
)

qt_finalize_executable(onyxhub-client)
