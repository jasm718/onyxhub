#include "Launcher.h"

#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QProcess>
#include <QRegularExpression>
#include <QStandardPaths>
#include <QStringList>
#include <QUuid>

#define NOMINMAX
#include <windows.h>

namespace {
QString withServerAddress(const QString &rdpContent, const QString &serverAddress) {
    const QString address = serverAddress.trimmed();
    if (address.isEmpty()) {
        return rdpContent;
    }

    const QStringList sourceLines = rdpContent.split(QRegularExpression(QStringLiteral("\\r?\\n")), Qt::SkipEmptyParts);
    QStringList lines;
    bool hasFullAddress = false;
    bool hasAlternateAddress = false;
    for (const QString &sourceLine : sourceLines) {
        const QString lower = sourceLine.trimmed().toLower();
        if (lower.startsWith(QStringLiteral("full address:s:"))) {
            lines.append(QStringLiteral("full address:s:") + address);
            hasFullAddress = true;
        } else if (lower.startsWith(QStringLiteral("alternate full address:s:"))) {
            lines.append(QStringLiteral("alternate full address:s:") + address);
            hasAlternateAddress = true;
        } else {
            lines.append(sourceLine);
        }
    }
    if (!hasFullAddress) {
        lines.append(QStringLiteral("full address:s:") + address);
    }
    if (!hasAlternateAddress) {
        lines.append(QStringLiteral("alternate full address:s:") + address);
    }
    return lines.join(QStringLiteral("\r\n")) + QStringLiteral("\r\n");
}
} // namespace

Launcher::Launcher(QObject *parent) : QObject(parent) {}

bool Launcher::launchRdp(const QString &rdpContent,
                         const QString &serverAddress,
                         const QString &username,
                         const QString &password,
                         LaunchedProcess *process,
                         QString *errorMessage) {
    if (rdpContent.trimmed().isEmpty()) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("启动信息为空");
        }
        return false;
    }
    if (username.trimmed().isEmpty() || password.isEmpty()) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("启动远程应用缺少凭据");
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
    const QString normalizedRdpContent = withServerAddress(rdpContent, serverAddress);
    QFile file(filePath);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("写入 RDP 文件失败: %1").arg(file.errorString());
        }
        return false;
    }

    const QByteArray rdpData = normalizedRdpContent.toUtf8();
    if (file.write(rdpData) != rdpData.size()) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("写入 RDP 文件失败: %1").arg(file.errorString());
        }
        file.close();
        file.remove();
        return false;
    }
    file.close();

    const QString credentialPath = dir.filePath(QUuid::createUuid().toString(QUuid::WithoutBraces) + QStringLiteral(".json"));
    QFile credentialFile(credentialPath);
    if (!credentialFile.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("写入临时凭据失败: %1").arg(credentialFile.errorString());
        }
        file.remove();
        return false;
    }
    const QJsonObject credentials{
        {QStringLiteral("username"), username.trimmed()},
        {QStringLiteral("password"), password},
    };
    const QByteArray credentialData = QJsonDocument(credentials).toJson(QJsonDocument::Compact);
    if (credentialFile.write(credentialData) != credentialData.size()) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("写入临时凭据失败: %1").arg(credentialFile.errorString());
        }
        credentialFile.close();
        credentialFile.remove();
        file.remove();
        return false;
    }
    credentialFile.close();

    const QString launcherPath = QDir(QCoreApplication::applicationDirPath())
                                     .filePath(QStringLiteral("runtime/active-remoteapp/RichActiveRemoteApp.exe"));
    if (!QFileInfo::exists(launcherPath)) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("未找到远程应用启动器");
        }
        credentialFile.remove();
        file.remove();
        return false;
    }

    const QString runtimeDir = QFileInfo(launcherPath).absolutePath();
    qint64 processId = 0;
    const bool started = QProcess::startDetached(
        launcherPath,
        {QStringLiteral("--rdp-file"), filePath, QStringLiteral("--credential-file"), credentialPath},
        runtimeDir,
        &processId);
    if (!started) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("无法启动远程应用启动器");
        }
        credentialFile.remove();
        file.remove();
        return false;
    }

    HANDLE processHandle = OpenProcess(SYNCHRONIZE, FALSE, static_cast<DWORD>(processId));
    if (!processHandle) {
        if (errorMessage) {
            *errorMessage = QStringLiteral("无法监控远程应用启动器");
        }
        return false;
    }

    if (process) {
        process->id = processId;
        process->handle = reinterpret_cast<quintptr>(processHandle);
    } else {
        CloseHandle(processHandle);
    }

    return true;
}

bool Launcher::isRunning(const LaunchedProcess &process) const {
    if (!process.handle) {
        return false;
    }
    return WaitForSingleObject(reinterpret_cast<HANDLE>(process.handle), 0) == WAIT_TIMEOUT;
}

void Launcher::release(LaunchedProcess *process) const {
    if (!process || !process->handle) {
        return;
    }
    CloseHandle(reinterpret_cast<HANDLE>(process->handle));
    process->handle = 0;
    process->id = 0;
}
