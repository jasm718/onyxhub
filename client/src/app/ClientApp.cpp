#include "ClientApp.h"

#include "api/ApiClient.h"
#include "app/ApplicationModel.h"
#include "launcher/Launcher.h"
#include "security/DesCipher.h"

#include <QCoreApplication>
#include <QDateTime>
#include <QHostAddress>
#include <QJsonArray>
#include <QJsonObject>
#include <QUrl>
#include <QUrlQuery>

namespace {
constexpr auto SettingsBaseUrl = "baseUrl";
constexpr auto SettingsToken = "token";
constexpr auto SettingsDisplayName = "displayName";
constexpr auto SettingsRememberedBaseUrl = "rememberedBaseUrl";
constexpr auto SettingsRememberedUsername = "rememberedUsername";
constexpr auto SettingsRememberedPassword = "rememberedPassword";
constexpr int DefaultServerPort = 8080;
constexpr qint64 RunningStateDelayMs = 5000;

QString settingsFilePath() {
    return QCoreApplication::applicationDirPath() + QStringLiteral("/config.ini");
}
} // namespace

ClientApp::ClientApp(ApiClient *apiClient, ApplicationModel *applicationModel, Launcher *launcher, QObject *parent)
    : QObject(parent),
      m_apiClient(apiClient),
      m_applicationModel(applicationModel),
      m_launcher(launcher),
      m_settings(settingsFilePath(), QSettings::IniFormat) {
    m_launchProcessTimer.setInterval(1000);
    connect(&m_launchProcessTimer, &QTimer::timeout, this, &ClientApp::pollLaunchProcesses);
    loadSettings();
    saveServerAddress();
    saveSession();
    if (!m_token.isEmpty()) {
        setAuthenticated(true);
        refreshApplications();
    }
}

ClientApp::~ClientApp() {
    clearLaunchSessions();
}

QString ClientApp::baseUrl() const {
    return m_baseUrl;
}

void ClientApp::setBaseUrl(const QString &baseUrl) {
    const QString nextInput = serverAddressInputFromBaseUrl(baseUrl);
    setServerAddressInput(nextInput.isEmpty() ? baseUrl : nextInput);
}

QString ClientApp::serverAddressInput() const {
    return m_serverAddressInput;
}

void ClientApp::setServerAddressInput(const QString &serverAddressInput) {
    const QString trimmedInput = serverAddressInput.trimmed();
    const QString normalizedBaseUrl = normalizeServerAddressInput(trimmedInput);
    const bool inputDidChange = trimmedInput != m_serverAddressInput;
    const bool baseUrlDidChange = normalizedBaseUrl != m_baseUrl;

    if (!inputDidChange && !baseUrlDidChange) {
        return;
    }

    m_serverAddressInput = trimmedInput;
    m_baseUrl = normalizedBaseUrl;
    saveServerAddress();
    if (baseUrlDidChange) {
        clearRememberedCredentials();
    }

    if (inputDidChange) {
        emit serverAddressInputChanged();
    }
    if (baseUrlDidChange) {
        emit baseUrlChanged();
    }
}

QString ClientApp::displayName() const {
    return m_displayName;
}

QString ClientApp::rememberedUsername() const {
    return m_rememberedUsername;
}

QString ClientApp::rememberedPassword() const {
    return m_rememberedPassword;
}

bool ClientApp::rememberPassword() const {
    return m_rememberPassword;
}

bool ClientApp::authenticated() const {
    return m_authenticated;
}

bool ClientApp::busy() const {
    return m_busy;
}

QString ClientApp::loadingText() const {
    return m_loadingText;
}

QString ClientApp::errorMessage() const {
    return m_errorMessage;
}

void ClientApp::login(const QString &username, const QString &password, bool rememberPassword) {
    clearError();

    const QString addressError = serverAddressValidationError();
    if (!addressError.isEmpty()) {
        setError(addressError);
        return;
    }
    const QString trimmedUsername = username.trimmed();
    if (trimmedUsername.isEmpty()) {
        setError(QStringLiteral("用户名不能为空"));
        return;
    }
    if (password.isEmpty()) {
        setError(QStringLiteral("密码不能为空"));
        return;
    }

    setBusy(true, QStringLiteral("正在登录"));
    QJsonObject body;
    body.insert(QStringLiteral("username"), trimmedUsername);
    body.insert(QStringLiteral("password"), password);

    m_apiClient->postJson(
        m_baseUrl,
        QStringLiteral("/api/client/auth/login"),
        body,
        QString(),
        [this, trimmedUsername, password, rememberPassword](const QJsonValue &data) {
            const QJsonObject object = data.toObject();
            m_token = object.value(QStringLiteral("token")).toString();
            const QJsonObject user = object.value(QStringLiteral("user")).toObject();
            const QString displayName = user.value(QStringLiteral("displayName")).toString(user.value(QStringLiteral("username")).toString());

            if (m_token.isEmpty()) {
                setBusy(false);
                setError(QStringLiteral("登录响应缺少 token"));
                return;
            }

            setDisplayName(displayName);
            setAuthenticated(true);
            saveServerAddress();
            saveSession();
            if (rememberPassword) {
                QString errorMessage;
                if (!saveRememberedCredentials(trimmedUsername, password, &errorMessage)) {
                    emit operationFailed(errorMessage);
                }
            } else {
                clearRememberedCredentials();
            }
            setBusy(false);
            emit loginSucceeded();
            refreshApplications();
        },
        [this](const QString &message, int statusCode) {
            setBusy(false);
            handleUnauthorized(statusCode);
            setError(message);
        });
}

void ClientApp::logout() {
    clearLaunchSessions();
    clearSession();
    setAuthenticated(false);
    setDisplayName(QString());
    m_applicationModel->clear();
}

void ClientApp::refreshApplications() {
    clearError();
    if (m_token.isEmpty()) {
        setAuthenticated(false);
        return;
    }
    const QString addressError = serverAddressValidationError();
    if (!addressError.isEmpty()) {
        setError(addressError);
        return;
    }

    setBusy(true, QStringLiteral("正在加载应用"));
    m_apiClient->getJson(
        m_baseUrl,
        QStringLiteral("/api/client/applications"),
        QUrlQuery(),
        m_token,
        [this](const QJsonValue &data) {
            m_applicationModel->setApplications(data.toArray());
            setBusy(false);
            emit applicationsLoaded();
        },
        [this](const QString &message, int statusCode) {
            setBusy(false);
            handleUnauthorized(statusCode);
            setError(message);
        });
}

void ClientApp::launchApplication(const QString &applicationId) {
    clearError();
    const QString addressError = serverAddressValidationError();
    if (!addressError.isEmpty()) {
        setError(addressError);
        return;
    }
    const QString normalizedApplicationId = applicationId.trimmed();
    if (normalizedApplicationId.isEmpty()) {
        setError(QStringLiteral("应用 ID 不能为空"));
        return;
    }
    if (m_applicationModel->launchState(normalizedApplicationId) != QStringLiteral("idle")) {
        return;
    }

    const QString modelApplicationName = m_applicationModel->applicationName(normalizedApplicationId);
    m_applicationModel->setLaunchState(normalizedApplicationId, QStringLiteral("starting"));

    QUrlQuery query;
    query.addQueryItem(QStringLiteral("applicationId"), normalizedApplicationId);

    m_apiClient->getJson(
        m_baseUrl,
        QStringLiteral("/api/client/applications/launch-info"),
        query,
        m_token,
        [this, normalizedApplicationId, modelApplicationName](const QJsonValue &data) {
            if (m_applicationModel->launchState(normalizedApplicationId) != QStringLiteral("starting")) {
                return;
            }
            const QJsonObject object = data.toObject();
            const QString rdpContent = object.value(QStringLiteral("rdpContent")).toString();
            const QString applicationName = modelApplicationName.isEmpty()
                ? object.value(QStringLiteral("path")).toString()
                : modelApplicationName;

            QString error;
            const QString username = object.value(QStringLiteral("username")).toString();
            const QString rdpPassword = object.value(QStringLiteral("password")).toString();
            const QString serverAddress = object.value(QStringLiteral("serverAddress")).toString().trimmed();
            LaunchedProcess process;
            if (!m_launcher->launchRdp(rdpContent, serverAddress, username, rdpPassword, &process, &error)) {
                m_applicationModel->setLaunchState(normalizedApplicationId, QStringLiteral("idle"));
                setError(error);
                return;
            }

            LaunchSession session;
            session.process = process;
            session.applicationName = applicationName;
            session.startedAt = QDateTime::currentMSecsSinceEpoch();
            m_launchSessions.insert(normalizedApplicationId, session);
            if (!m_launchProcessTimer.isActive()) {
                m_launchProcessTimer.start();
            }
        },
        [this, normalizedApplicationId](const QString &message, int statusCode) {
            m_applicationModel->setLaunchState(normalizedApplicationId, QStringLiteral("idle"));
            handleUnauthorized(statusCode);
            setError(message);
        });
}

void ClientApp::testConnection() {
    clearError();

    const QString addressError = serverAddressValidationError();
    if (!addressError.isEmpty()) {
        setError(addressError);
        return;
    }

    setBusy(true, QStringLiteral("正在测试连接"));
    m_apiClient->getJson(
        m_baseUrl,
        QStringLiteral("/api/client/ping"),
        QUrlQuery(),
        QString(),
        [this](const QJsonValue &) {
            setBusy(false);
            emit connectionTestSucceeded(QStringLiteral("连接成功"));
        },
        [this](const QString &message, int) {
            setBusy(false);
            setError(message);
        });
}

void ClientApp::clearError() {
    if (m_errorMessage.isEmpty()) {
        return;
    }
    m_errorMessage.clear();
    emit errorMessageChanged();
}

void ClientApp::loadSettings() {
    const QString storedBaseUrl = m_settings.value(QString::fromLatin1(SettingsBaseUrl), m_baseUrl).toString().trimmed();
    if (!storedBaseUrl.isEmpty()) {
        m_baseUrl = storedBaseUrl;
        const QString input = serverAddressInputFromBaseUrl(storedBaseUrl);
        if (!input.isEmpty()) {
            m_serverAddressInput = input;
        }
    }
    m_token = m_settings.value(QString::fromLatin1(SettingsToken)).toString();
    m_displayName = m_settings.value(QString::fromLatin1(SettingsDisplayName)).toString();

    const QString rememberedBaseUrl = m_settings.value(QString::fromLatin1(SettingsRememberedBaseUrl)).toString().trimmed();
    const QString username = m_settings.value(QString::fromLatin1(SettingsRememberedUsername)).toString();
    const QString encryptedPassword = m_settings.value(QString::fromLatin1(SettingsRememberedPassword)).toString();
    if (rememberedBaseUrl == m_baseUrl && !username.isEmpty() && !encryptedPassword.isEmpty()) {
        QString password;
        if (DesCipher::decrypt(encryptedPassword, &password, nullptr)) {
            setRememberedCredentials(username, password, true);
            return;
        }
    }

    if (!rememberedBaseUrl.isEmpty() || !username.isEmpty() || !encryptedPassword.isEmpty()) {
        clearRememberedCredentials();
    }
}

void ClientApp::saveServerAddress() {
    m_settings.remove(QStringLiteral("serverAddressInput"));
    if (m_baseUrl.isEmpty()) {
        m_settings.remove(QString::fromLatin1(SettingsBaseUrl));
        m_settings.sync();
        return;
    }
    m_settings.setValue(QString::fromLatin1(SettingsBaseUrl), m_baseUrl);
    m_settings.sync();
}

void ClientApp::saveSession() {
    m_settings.setValue(QString::fromLatin1(SettingsToken), m_token);
    m_settings.setValue(QString::fromLatin1(SettingsDisplayName), m_displayName);
    m_settings.sync();
}

void ClientApp::clearSession() {
    m_token.clear();
    m_settings.remove(QString::fromLatin1(SettingsToken));
    m_settings.remove(QString::fromLatin1(SettingsDisplayName));
    m_settings.sync();
}

bool ClientApp::saveRememberedCredentials(const QString &username, const QString &password, QString *errorMessage) {
    QString encryptedPassword;
    if (!DesCipher::encrypt(password, &encryptedPassword, errorMessage)) {
        return false;
    }

    m_settings.setValue(QString::fromLatin1(SettingsRememberedBaseUrl), m_baseUrl);
    m_settings.setValue(QString::fromLatin1(SettingsRememberedUsername), username);
    m_settings.setValue(QString::fromLatin1(SettingsRememberedPassword), encryptedPassword);
    m_settings.sync();
    if (m_settings.status() != QSettings::NoError) {
        clearRememberedCredentials();
        if (errorMessage) {
            *errorMessage = QStringLiteral("密码保存失败");
        }
        return false;
    }

    setRememberedCredentials(username, password, true);
    return true;
}

void ClientApp::clearRememberedCredentials() {
    m_settings.remove(QString::fromLatin1(SettingsRememberedBaseUrl));
    m_settings.remove(QString::fromLatin1(SettingsRememberedUsername));
    m_settings.remove(QString::fromLatin1(SettingsRememberedPassword));
    m_settings.sync();
    setRememberedCredentials(QString(), QString(), false);
}

void ClientApp::setRememberedCredentials(const QString &username, const QString &password, bool rememberPassword) {
    if (m_rememberedUsername == username && m_rememberedPassword == password && m_rememberPassword == rememberPassword) {
        return;
    }

    m_rememberedUsername = username;
    m_rememberedPassword = password;
    m_rememberPassword = rememberPassword;
    emit rememberedCredentialsChanged();
}

void ClientApp::setAuthenticated(bool authenticated) {
    if (authenticated == m_authenticated) {
        return;
    }
    m_authenticated = authenticated;
    emit authenticatedChanged();
}

void ClientApp::setBusy(bool busy, const QString &loadingText) {
    if (busy != m_busy) {
        m_busy = busy;
        emit busyChanged();
    }
    if (loadingText != m_loadingText) {
        m_loadingText = loadingText;
        emit loadingTextChanged();
    }
}

void ClientApp::setDisplayName(const QString &displayName) {
    if (displayName == m_displayName) {
        return;
    }
    m_displayName = displayName;
    emit displayNameChanged();
}

void ClientApp::setError(const QString &message) {
    m_errorMessage = message;
    emit errorMessageChanged();
    emit operationFailed(message);
}

void ClientApp::handleUnauthorized(int statusCode) {
    if (statusCode == 401 || statusCode == 403) {
        clearLaunchSessions();
        clearSession();
        setAuthenticated(false);
        m_applicationModel->clear();
    }
}

void ClientApp::pollLaunchProcesses() {
    const qint64 now = QDateTime::currentMSecsSinceEpoch();
    QStringList exitedApplicationIds;

    for (auto it = m_launchSessions.begin(); it != m_launchSessions.end(); ++it) {
        if (!m_launcher->isRunning(it->process)) {
            m_launcher->release(&it->process);
            exitedApplicationIds.append(it.key());
            continue;
        }

        if (m_applicationModel->launchState(it.key()) == QStringLiteral("starting")
            && now - it->startedAt >= RunningStateDelayMs) {
            m_applicationModel->setLaunchState(it.key(), QStringLiteral("running"));
            emit launchStarted(it->applicationName);
        }
    }

    for (const QString &applicationId : exitedApplicationIds) {
        m_launchSessions.remove(applicationId);
        m_applicationModel->setLaunchState(applicationId, QStringLiteral("idle"));
    }

    if (m_launchSessions.isEmpty()) {
        m_launchProcessTimer.stop();
    }
}

void ClientApp::clearLaunchSessions() {
    m_launchProcessTimer.stop();
    for (auto it = m_launchSessions.begin(); it != m_launchSessions.end(); ++it) {
        m_launcher->release(&it->process);
    }
    m_launchSessions.clear();
    m_applicationModel->clearLaunchStates();
}

QString ClientApp::normalizeServerAddressInput(const QString &serverAddressInput) const {
    QString normalizedInput = serverAddressInput.trimmed();
    if (normalizedInput.isEmpty()) {
        return QString();
    }
    if (normalizedInput.startsWith(QStringLiteral("http://"), Qt::CaseInsensitive)) {
        normalizedInput.remove(0, 7);
    } else if (normalizedInput.startsWith(QStringLiteral("https://"), Qt::CaseInsensitive)) {
        normalizedInput.remove(0, 8);
    }
    if (normalizedInput.contains('/')) {
        return QString();
    }

    const QStringList parts = normalizedInput.split(':');
    if (parts.isEmpty() || parts.size() > 2) {
        return QString();
    }

    QHostAddress hostAddress;
    const QString host = parts.first().trimmed();
    if (!hostAddress.setAddress(host) || hostAddress.protocol() != QAbstractSocket::IPv4Protocol) {
        return QString();
    }

    int port = DefaultServerPort;
    if (parts.size() == 2) {
        bool ok = false;
        const int parsedPort = parts.last().trimmed().toInt(&ok);
        if (!ok || parsedPort < 1 || parsedPort > 65535) {
            return QString();
        }
        port = parsedPort;
    }

    return QStringLiteral("http://%1:%2").arg(host, QString::number(port));
}

QString ClientApp::serverAddressInputFromBaseUrl(const QString &baseUrl) const {
    const QUrl url(baseUrl.trimmed());
    if (!url.isValid()) {
        return QString();
    }

    QHostAddress hostAddress;
    const QString host = url.host().trimmed();
    if (host.isEmpty() || !hostAddress.setAddress(host) || hostAddress.protocol() != QAbstractSocket::IPv4Protocol) {
        return QString();
    }

    const int port = url.port();
    if (port <= 0 || port == DefaultServerPort) {
        return host;
    }
    return QStringLiteral("%1:%2").arg(host, QString::number(port));
}

QString ClientApp::serverAddressValidationError() const {
    if (m_serverAddressInput.isEmpty()) {
        return QStringLiteral("服务端地址不能为空");
    }
    if (m_baseUrl.isEmpty()) {
        return QStringLiteral("服务端地址格式不正确");
    }
    return QString();
}
