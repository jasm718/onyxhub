import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Window
import FluentUI 1.0

Rectangle {
    id: control

    property string title: ""
    property color textColor: FluTheme.fontPrimaryColor
    property bool showDark: true
    property bool showClose: true
    property bool showMinimize: true
    property bool showMaximize: true
    property alias buttonMaximize: btnMaximize
    property alias buttonMinimize: btnMinimize
    property alias buttonClose: btnClose
    property Item layoutStandardbuttons: standardButtonsContainer
    property alias layoutMacosButtons: macosButtons

    signal settingsRequested

    height: 32
    color: "transparent"
    z: 65535

    QtObject {
        id: d

        property var win: Window.window
        property bool isRestore: win && (Window.Maximized === win.visibility || Window.FullScreen === win.visibility)
        property bool resizable: win && !(win.height === win.maximumHeight && win.height === win.minimumHeight && win.width === win.maximumWidth && win.width === win.minimumWidth)
    }

    RowLayout {
        anchors {
            left: parent.left
            leftMargin: 12
            verticalCenter: parent.verticalCenter
        }
        spacing: 8

        Rectangle {
            Layout.preferredWidth: 20
            Layout.preferredHeight: 20
            radius: 5
            color: FluTheme.primaryColor

            FluIcon {
                anchors.centerIn: parent
                iconSource: FluentIcons.Remote
                iconSize: 12
                iconColor: "white"
            }
        }

        FluText {
            text: control.title
            font.pixelSize: 13
            font.weight: Font.DemiBold
            color: control.textColor
        }
    }

    Item {
        id: standardButtonsContainer
        anchors.right: parent.right
        width: 200
        height: parent.height

        RowLayout {
            anchors.fill: parent
            spacing: 0

            FluIconButton {
                id: btnMinimize

                Layout.preferredWidth: 40
                Layout.preferredHeight: 32
                padding: 0
                radius: 0
                iconSource: FluentIcons.Settings
                iconSize: 15
                iconColor: control.textColor
                text: "设置"
                onClicked: control.settingsRequested()
            }

            FluIconButton {
                id: btnClose

                Layout.preferredWidth: 40
                Layout.preferredHeight: 32
                padding: 0
                radius: 0
                visible: control.showDark
                iconSource: FluTheme.dark ? FluentIcons.Brightness : FluentIcons.QuietHours
                iconSize: 15
                iconColor: control.textColor
                text: FluTheme.dark ? "浅色" : "深色"
                onClicked: FluTheme.darkMode = FluTheme.dark ? FluThemeType.Light : FluThemeType.Dark
            }

            FluIconButton {
                Layout.preferredWidth: 40
                Layout.preferredHeight: 32
                padding: 0
                radius: 0
                visible: control.showMinimize
                iconSource: FluentIcons.ChromeMinimize
                iconSize: 11
                iconColor: control.textColor
                text: "最小化"
                onClicked: d.win.showMinimized()
            }

            FluIconButton {
                id: btnMaximize

                Layout.preferredWidth: 40
                Layout.preferredHeight: 32
                padding: 0
                radius: 0
                visible: d.resizable && control.showMaximize
                iconSource: d.isRestore ? FluentIcons.ChromeRestore : FluentIcons.ChromeMaximize
                iconSize: 11
                iconColor: control.textColor
                text: d.isRestore ? "还原" : "最大化"
                onClicked: d.isRestore ? d.win.showNormal() : d.win.showMaximized()
            }

            FluIconButton {
                Layout.preferredWidth: 40
                Layout.preferredHeight: 32
                padding: 0
                radius: 0
                visible: control.showClose
                iconSource: FluentIcons.ChromeClose
                iconSize: 10
                iconColor: hovered ? "white" : control.textColor
                text: "关闭"
                color: {
                    if (pressed) {
                        return Qt.rgba(251 / 255, 115 / 255, 115 / 255, 0.8)
                    }
                    return hovered ? Qt.rgba(251 / 255, 115 / 255, 115 / 255, 1) : "transparent"
                }
                onClicked: d.win.close()
            }
        }
    }

    Item {
        id: macosButtons
        width: 0
        height: 0
        visible: false
    }
}
