import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import FluentUI 1.0
import "components"
import "pages"

FluWindow {
    id: window

    width: 860
    height: 560
    fixSize: true
    title: "OnyxHub"
    showDark: true
    closeListener: function(event) {
        event.accepted = true
        Qt.quit()
    }
    appBar: FluAppBar {
        title: window.title
        showDark: true
        showMaximize: false
        stayTopClickListener: function() {
            settingsDialog.open()
        }

        Component.onCompleted: {
            buttonStayTop.iconSource = FluentIcons.Settings
            buttonStayTop.text = "设置"
            buttonStayTop.iconSize = 15
        }
    }

    Component.onCompleted: {
        FluApp.useSystemAppBar = false
        FluTheme.animationEnabled = true
    }

    Connections {
        target: ClientApp

        function onAuthenticatedChanged() {
            pageLoader.sourceComponent = ClientApp.authenticated ? appsPageComponent : loginPageComponent
        }

        function onOperationFailed(message) {
            if (message.length > 0) {
                window.showError(message, 2600)
            }
        }

        function onLaunchStarted() {
            window.showSuccess("已启动远程应用", 1800)
        }

        function onConnectionTestSucceeded(message) {
            if (message.length > 0) {
                window.showSuccess(message, 2200)
            }
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Loader {
            id: pageLoader
            Layout.fillWidth: true
            Layout.fillHeight: true
            sourceComponent: ClientApp.authenticated ? appsPageComponent : loginPageComponent
        }
    }

    Rectangle {
        visible: ClientApp.busy
        anchors.fill: parent
        color: "#66000000"
        z: 20

        MouseArea {
            anchors.fill: parent
        }

        FluFrame {
            width: 220
            height: 132
            anchors.centerIn: parent
            radius: 8

            ColumnLayout {
                anchors.centerIn: parent
                spacing: 14

                FluProgressRing {
                    Layout.preferredWidth: 42
                    Layout.preferredHeight: 42
                    Layout.alignment: Qt.AlignHCenter
                    strokeWidth: 4
                }

                FluText {
                    text: ClientApp.loadingText.length > 0 ? ClientApp.loadingText : "请稍候"
                    Layout.alignment: Qt.AlignHCenter
                }
            }
        }
    }

    Component {
        id: loginPageComponent
        LoginPage {}
    }

    Component {
        id: appsPageComponent
        AppsPage {}
    }

    FluContentDialog {
        id: settingsDialog

        title: "设置"
        negativeText: "测试连接"
        positiveText: "完成"
        buttonFlags: FluContentDialogType.NegativeButton | FluContentDialogType.PositiveButton
        onNegativeClickListener: function() {
            ClientApp.testConnection()
        }
        contentDelegate: Component {
            SettingsPanel {}
        }
    }
}
