#pragma once

#include "launcher/Launcher.h"

#include <QHash>
#include <QObject>
#include <QSettings>
#include <QTimer>

class ApiClient;
class ApplicationModel;

class ClientApp : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString baseUrl READ baseUrl WRITE setBaseUrl NOTIFY baseUrlChanged)
    Q_PROPERTY(QString serverAddressInput READ serverAddressInput WRITE setServerAddressInput NOTIFY serverAddressInputChanged)
    Q_PROPERTY(QString displayName READ displayName NOTIFY displayNameChanged)
    Q_PROPERTY(QString rememberedUsername READ rememberedUsername NOTIFY rememberedCredentialsChanged)
    Q_PROPERTY(QString rememberedPassword READ rememberedPassword NOTIFY rememberedCredentialsChanged)
    Q_PROPERTY(bool rememberPassword READ rememberPassword NOTIFY rememberedCredentialsChanged)
    Q_PROPERTY(bool authenticated READ authenticated NOTIFY authenticatedChanged)
    Q_PROPERTY(bool busy READ busy NOTIFY busyChanged)
    Q_PROPERTY(QString loadingText READ loadingText NOTIFY loadingTextChanged)
    Q_PROPERTY(QString errorMessage READ errorMessage NOTIFY errorMessageChanged)

public:
    ClientApp(ApiClient *apiClient, ApplicationModel *applicationModel, Launcher *launcher, QObject *parent = nullptr);
    ~ClientApp() override;

    QString baseUrl() const;
    void setBaseUrl(const QString &baseUrl);
    QString serverAddressInput() const;
    void setServerAddressInput(const QString &serverAddressInput);

    QString displayName() const;
    QString rememberedUsername() const;
    QString rememberedPassword() const;
    bool rememberPassword() const;
    bool authenticated() const;
    bool busy() const;
    QString loadingText() const;
    QString errorMessage() const;

    Q_INVOKABLE void login(const QString &username, const QString &password, bool rememberPassword);
    Q_INVOKABLE void logout();
    Q_INVOKABLE void refreshApplications();
    Q_INVOKABLE void launchApplication(const QString &applicationId);
    Q_INVOKABLE void testConnection();
    Q_INVOKABLE void clearError();

signals:
    void baseUrlChanged();
    void serverAddressInputChanged();
    void displayNameChanged();
    void rememberedCredentialsChanged();
    void authenticatedChanged();
    void busyChanged();
    void loadingTextChanged();
    void errorMessageChanged();

    void loginSucceeded();
    void applicationsLoaded();
    void launchStarted(const QString &applicationName);
    void connectionTestSucceeded(const QString &message);
    void operationFailed(const QString &message);

private:
    ApiClient *m_apiClient;
    ApplicationModel *m_applicationModel;
    Launcher *m_launcher;
    QSettings m_settings;

    QString m_baseUrl = QStringLiteral("http://127.0.0.1:8080");
    QString m_serverAddressInput = QStringLiteral("127.0.0.1");
    QString m_token;
    QString m_displayName;
    QString m_rememberedUsername;
    QString m_rememberedPassword;
    bool m_rememberPassword = false;
    bool m_authenticated = false;
    bool m_busy = false;
    QString m_loadingText;
    QString m_errorMessage;
    struct LaunchSession {
        LaunchedProcess process;
        QString applicationName;
        qint64 startedAt = 0;
    };

    QTimer m_launchProcessTimer;
    QHash<QString, LaunchSession> m_launchSessions;

    void loadSettings();
    void saveServerAddress();
    void saveSession();
    void clearSession();
    bool saveRememberedCredentials(const QString &username, const QString &password, QString *errorMessage);
    void clearRememberedCredentials();
    void setRememberedCredentials(const QString &username, const QString &password, bool rememberPassword);
    void setAuthenticated(bool authenticated);
    void setBusy(bool busy, const QString &loadingText = QString());
    void setDisplayName(const QString &displayName);
    void setError(const QString &message);
    void handleUnauthorized(int statusCode);
    void pollLaunchProcesses();
    void clearLaunchSessions();
    QString normalizeServerAddressInput(const QString &serverAddressInput) const;
    QString serverAddressInputFromBaseUrl(const QString &baseUrl) const;
    QString serverAddressValidationError() const;
};
