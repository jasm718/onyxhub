import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import FluentUI 1.0

FluFrame {
    id: root

    property string appId
    property string appName
    property string appPath
    property string appIconSource
    property bool remoteApp

    signal launchRequested

    radius: 8
    color: mouseArea.containsMouse ? FluTheme.itemHoverColor : FluTheme.frameActiveColor

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        onClicked: root.launchRequested()
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            Rectangle {
                Layout.preferredWidth: 40
                Layout.preferredHeight: 40
                radius: 10
                color: FluTheme.dark ? "#2f3136" : "#f4f6f8"

                Image {
                    anchors.centerIn: parent
                    width: 24
                    height: 24
                    source: root.appIconSource
                    fillMode: Image.PreserveAspectFit
                    visible: status === Image.Ready
                    asynchronous: true
                }

                FluIcon {
                    anchors.centerIn: parent
                    iconSource: FluentIcons.OpenFile
                    iconSize: 21
                    iconColor: FluTheme.primaryColor
                    visible: root.appIconSource.length === 0
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3

                FluText {
                    text: root.appName
                    font.pixelSize: 15
                    font.weight: Font.DemiBold
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }

                FluText {
                    text: root.remoteApp ? "RemoteApp" : "桌面会话"
                    textColor: FluTheme.fontSecondaryColor
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }
            }

            FluIconButton {
                text: "启动"
                iconSource: FluentIcons.Play
                iconSize: 16
                width: 32
                height: 32
                onClicked: root.launchRequested()
            }
        }

        FluText {
            text: root.appPath
            textColor: FluTheme.fontSecondaryColor
            elide: Text.ElideMiddle
            Layout.fillWidth: true
        }

        Item {
            Layout.fillHeight: true
        }
    }
}
