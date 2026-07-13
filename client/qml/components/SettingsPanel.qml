import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import FluentUI 1.0

Item {
    implicitWidth: 420
    implicitHeight: 76

    ColumnLayout {
        anchors.fill: parent
        anchors.leftMargin: 20
        anchors.rightMargin: 20
        anchors.topMargin: 8
        spacing: 12

        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            FluText {
                text: "服务端地址"
                font.weight: Font.DemiBold
                Layout.alignment: Qt.AlignVCenter
                Layout.preferredWidth: 84
            }

            FluTextBox {
                text: ClientApp.serverAddressInput
                placeholderText: "格式示例：192.168.10.10"
                Layout.fillWidth: true
                onTextChanged: ClientApp.serverAddressInput = text
            }
        }
    }
}
