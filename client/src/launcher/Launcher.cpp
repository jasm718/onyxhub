#include "Launcher.h"

#include <QDesktopServices>
#include <QDir>
#include <QFile>
#include <QStandardPaths>
#include <QTextStream>
#include <QUuid>
#include <QUrl>

Launcher::Launcher(QObject *parent) : QObject(parent) {}

bool Launcher::launchRdp(const QString &rdpContent, QString *errorMessage) {
    if (rdpContent.trimmed().isEmpty()) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("启动信息为空");
        }
        return false;
    }

    const QString tempRoot = QStandardPaths::writableLocation(QStandardPaths::TempLocation);
    QDir dir(tempRoot + QStringLiteral("/onyxhub-client"));
    if (!dir.exists() && !dir.mkpath(QStringLiteral("."))) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("创建临时目录失败");
        }
        return false;
    }

    const QString filePath = dir.filePath(QUuid::createUuid().toString(QUuid::WithoutBraces) + QStringLiteral(".rdp"));
    QFile file(filePath);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("写入 RDP 文件失败: %1").arg(file.errorString());
        }
        return false;
    }

    QTextStream stream(&file);
    stream.setEncoding(QStringConverter::Utf16LE);
    stream.setGenerateByteOrderMark(true);
    stream << rdpContent;
    file.close();

    if (!QDesktopServices::openUrl(QUrl::fromLocalFile(filePath))) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("无法打开系统 RDP 客户端");
        }
        return false;
    }

    return true;
}
