import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import FluentUI 1.0
import "../components"

Item {
    id: root

    Rectangle {
        anchors.fill: parent
        color: FluTheme.windowActiveBackgroundColor
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 22
        spacing: 16

        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            Rectangle {
                Layout.preferredWidth: 42
                Layout.preferredHeight: 42
                radius: 10
                color: FluTheme.primaryColor

                FluIcon {
                    anchors.centerIn: parent
                    iconSource: FluentIcons.Remote
                    iconSize: 22
                    iconColor: "white"
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                FluText {
                    text: "远程应用"
                    font.pixelSize: 23
                    font.weight: Font.DemiBold
                }

                FluText {
                    text: ApplicationModel.count > 0 ? "选择应用并启动远程连接" : "当前账号暂无授权应用"
                    textColor: FluTheme.fontSecondaryColor
                }
            }

            FluIconButton {
                text: "刷新"
                iconSource: FluentIcons.Sync
                iconSize: 16
                width: 34
                height: 34
                disabled: ClientApp.busy
                onClicked: ClientApp.refreshApplications()
            }

            FluButton {
                text: "退出登录"
                Layout.preferredWidth: 88
                Layout.preferredHeight: 34
                onClicked: ClientApp.logout()
            }
        }

        FluFrame {
            visible: ApplicationModel.count === 0 && !ClientApp.busy
            Layout.fillWidth: true
            Layout.fillHeight: true
            radius: 8

            ColumnLayout {
                anchors.centerIn: parent
                spacing: 10

                FluIcon {
                    Layout.alignment: Qt.AlignHCenter
                    iconSource: FluentIcons.AllApps
                    iconSize: 34
                    iconColor: FluTheme.fontSecondaryColor
                }

                FluText {
                    text: "暂无可用应用"
                    font.pixelSize: 16
                    font.weight: Font.DemiBold
                    Layout.alignment: Qt.AlignHCenter
                }

                FluText {
                    text: "请联系管理员完成应用授权。"
                    textColor: FluTheme.fontSecondaryColor
                    Layout.alignment: Qt.AlignHCenter
                }
            }
        }

        GridView {
            visible: ApplicationModel.count > 0
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: ApplicationModel
            cellWidth: Math.max(216, Math.floor(width / Math.max(1, Math.floor(width / 232))))
            cellHeight: 132
            boundsBehavior: Flickable.StopAtBounds

            delegate: AppCard {
                width: GridView.view.cellWidth - 12
                height: 118
                appId: applicationId
                appName: name
                appPath: path
                appIconSource: iconSource
                remoteApp: remoteAppRegistered
                onLaunchRequested: ClientApp.launchApplication(appId)
            }
        }
    }
}
