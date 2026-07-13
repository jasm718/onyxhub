#pragma once

#include <QObject>
#include <QSettings>

class ApiClient;
class ApplicationModel;
class Launcher;

class ClientApp : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString baseUrl READ baseUrl WRITE setBaseUrl NOTIFY baseUrlChanged)
    Q_PROPERTY(QString serverAddressInput READ serverAddressInput WRITE setServerAddressInput NOTIFY serverAddressInputChanged)
    Q_PROPERTY(QString displayName READ displayName NOTIFY displayNameChanged)
    Q_PROPERTY(bool authenticated READ authenticated NOTIFY authenticatedChanged)
    Q_PROPERTY(bool busy READ busy NOTIFY busyChanged)
    Q_PROPERTY(QString loadingText READ loadingText NOTIFY loadingTextChanged)
    Q_PROPERTY(QString errorMessage READ errorMessage NOTIFY errorMessageChanged)

public:
    ClientApp(ApiClient *apiClient, ApplicationModel *applicationModel, Launcher *launcher, QObject *parent = nullptr);

    QString baseUrl() const;
    void setBaseUrl(const QString &baseUrl);
    QString serverAddressInput() const;
    void setServerAddressInput(const QString &serverAddressInput);

    QString displayName() const;
    bool authenticated() const;
    bool busy() const;
    QString loadingText() const;
    QString errorMessage() const;

    Q_INVOKABLE void login(const QString &username, const QString &password);
    Q_INVOKABLE void logout();
    Q_INVOKABLE void refreshApplications();
    Q_INVOKABLE void launchApplication(const QString &applicationId);
    Q_INVOKABLE void testConnection();
    Q_INVOKABLE void clearError();

signals:
    void baseUrlChanged();
    void serverAddressInputChanged();
    void displayNameChanged();
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
    bool m_authenticated = false;
    bool m_busy = false;
    QString m_loadingText;
    QString m_errorMessage;

    void loadSettings();
    void saveServerAddress();
    void saveSession();
    void clearSession();
    void setAuthenticated(bool authenticated);
    void setBusy(bool busy, const QString &loadingText = QString());
    void setDisplayName(const QString &displayName);
    void setError(const QString &message);
    void handleUnauthorized(int statusCode);
    QString normalizeServerAddressInput(const QString &serverAddressInput) const;
    QString serverAddressInputFromBaseUrl(const QString &baseUrl) const;
    QString serverAddressValidationError() const;
};
