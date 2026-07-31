import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import FluentUI 1.0
import "../components"

Item {
    id: root

    Rectangle {
        anchors.fill: parent
        color: "#ECECEC"
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.preferredWidth: 68
            Layout.fillHeight: true
            color: "#F6F6F6"
            border.color: "#E4E4E4"

            ColumnLayout {
                anchors.fill: parent
                spacing: 0

                Item {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 52

                    Rectangle {
                        width: 3
                        height: 36
                        radius: 2
                        anchors.left: parent.left
                        anchors.verticalCenter: parent.verticalCenter
                        color: FluTheme.primaryColor
                    }

                    Rectangle {
                        width: 44
                        height: 40
                        radius: 8
                        anchors.centerIn: parent
                        color: FluTheme.itemHoverColor

                        FluIcon {
                            anchors.centerIn: parent
                            iconSource: FluentIcons.HomeSolid
                            iconSize: 18
                            iconColor: FluTheme.primaryColor
                        }
                    }
                }

                Item {
                    Layout.fillHeight: true
                }

                FluIconButton {
                    text: "退出登录"
                    iconSource: FluentIcons.SignOut
                    iconSize: 18
                    Layout.preferredWidth: 44
                    Layout.preferredHeight: 40
                    Layout.alignment: Qt.AlignHCenter
                    Layout.bottomMargin: 8
                    onClicked: ClientApp.logout()
                }
            }
        }

        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            FluShadow {
                anchors.fill: contentCard
                elevation: 3
                radius: 8
                color: "#707070"
            }

            Rectangle {
                id: contentCard
                anchors.fill: parent
                color: "#FFFFFF"
                radius: 0
                border.width: 1
                border.color: "#DCDCDC"

                ColumnLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 22
                    anchors.rightMargin: 22
                    anchors.topMargin: 18
                    anchors.bottomMargin: 18
                    spacing: 14

                    RowLayout {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 42
                        spacing: 12

                        FluText {
                            Layout.fillWidth: true
                            text: "远程应用"
                            font.pixelSize: 20
                            font.weight: Font.DemiBold
                            Layout.alignment: Qt.AlignVCenter
                        }

                        FluIconButton {
                            text: "刷新"
                            iconSource: FluentIcons.Sync
                            iconSize: 16
                            Layout.preferredWidth: 36
                            Layout.preferredHeight: 34
                            disabled: ClientApp.busy
                            onClicked: ClientApp.refreshApplications()
                        }
                    }

                    Item {
                        Layout.fillWidth: true
                        Layout.fillHeight: true

                        FluFrame {
                            anchors.fill: parent
                            visible: ApplicationModel.count === 0 && !ClientApp.busy
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
                            anchors.fill: parent
                            visible: ApplicationModel.count > 0
                            clip: true
                            model: ApplicationModel
                            cellWidth: 270
                            cellHeight: 96
                            boundsBehavior: Flickable.StopAtBounds

                            ScrollBar.vertical: FluScrollBar {}

                            delegate: AppCard {
                                width: 258
                                height: 84
                                appId: applicationId
                                appName: name
                                appPath: path
                                appIconSource: iconSource
                                onLaunchRequested: ClientApp.launchApplication(appId)
                            }
                        }
                    }
                }
            }
        }
    }
}
