import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import FluentUI 1.0

Item {
    id: root

    function submit() {
        ClientApp.login(usernameField.text, passwordField.text, rememberPasswordCheck.checked)
    }

    Image {
        anchors.fill: parent
        source: "qrc:/OnyxHub/Client/assets/login-landscape-bg2.png"
        fillMode: Image.PreserveAspectCrop
        smooth: true
        cache: true
    }

    FluFrame {
        width: 360
        height: 372
        radius: 8
        anchors.centerIn: parent

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 14

            Image {
                Layout.preferredWidth: 64
                Layout.preferredHeight: 64
                Layout.alignment: Qt.AlignHCenter
                source: "qrc:/OnyxHub/Client/assets/onyxhub-logo-256.png"
                fillMode: Image.PreserveAspectFit
                smooth: true
            }

            FluText {
                text: "OnyxHub"
                font.pixelSize: 26
                font.weight: Font.DemiBold
                Layout.alignment: Qt.AlignHCenter
            }

            FluText {
                text: "远程应用客户端"
                textColor: FluTheme.fontSecondaryColor
                Layout.alignment: Qt.AlignHCenter
            }

            FluTextBox {
                id: usernameField
                text: ClientApp.rememberedUsername
                placeholderText: "用户名"
                Layout.fillWidth: true
                Layout.topMargin: 8
                onCommit: passwordField.forceActiveFocus()
            }

            FluPasswordBox {
                id: passwordField
                text: ClientApp.rememberedPassword
                placeholderText: "密码"
                Layout.fillWidth: true
                onCommit: root.submit()
            }

            FluCheckBox {
                id: rememberPasswordCheck
                text: "记住密码"
                checked: ClientApp.rememberPassword
                Layout.alignment: Qt.AlignLeft
            }

            Item {
                Layout.fillHeight: true
            }

            FluFilledButton {
                text: "登录"
                disabled: ClientApp.busy
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                onClicked: root.submit()
            }

        }
    }
}
