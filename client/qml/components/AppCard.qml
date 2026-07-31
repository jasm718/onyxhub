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

    signal launchRequested

    radius: 8
    color: mouseArea.containsMouse ? FluTheme.itemHoverColor : FluTheme.frameActiveColor

    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        onClicked: root.launchRequested()
    }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 10
        anchors.topMargin: 10
        anchors.bottomMargin: 10
        spacing: 12

        Rectangle {
            Layout.preferredWidth: 52
            Layout.preferredHeight: 52
            Layout.alignment: Qt.AlignVCenter
            radius: 10
            color: FluTheme.dark ? "#2f3136" : "#edf5fb"

            Image {
                anchors.centerIn: parent
                width: 34
                height: 34
                source: root.appIconSource
                fillMode: Image.PreserveAspectFit
                visible: status === Image.Ready
                asynchronous: true
            }

            FluIcon {
                anchors.centerIn: parent
                iconSource: FluentIcons.OpenFile
                iconSize: 24
                iconColor: FluTheme.primaryColor
                visible: root.appIconSource.length === 0
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            Layout.alignment: Qt.AlignVCenter
            spacing: 4

            FluText {
                text: root.appName
                font.pixelSize: 15
                font.weight: Font.DemiBold
                elide: Text.ElideRight
                Layout.fillWidth: true
            }

            FluText {
                text: "RemoteApp"
                textColor: FluTheme.fontSecondaryColor
                elide: Text.ElideRight
                Layout.fillWidth: true
            }
        }

        FluIconButton {
            text: "启动"
            iconSource: FluentIcons.OpenInNewWindow
            iconSize: 16
            radius: 6
            normalColor: FluTheme.primaryColor
            hoverColor: FluTheme.dark ? Qt.darker(FluTheme.primaryColor, 1.1) : Qt.lighter(FluTheme.primaryColor, 1.1)
            pressedColor: Qt.darker(FluTheme.primaryColor, 1.2)
            iconColor: "white"
            Layout.preferredWidth: 34
            Layout.preferredHeight: 34
            Layout.alignment: Qt.AlignVCenter
            onClicked: root.launchRequested()
        }
    }
}
