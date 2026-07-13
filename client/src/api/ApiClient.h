#pragma once

#include <QJsonObject>
#include <QJsonValue>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QObject>
#include <QUrl>
#include <QUrlQuery>

#include <functional>

class ApiClient : public QObject {
    Q_OBJECT

public:
    using SuccessHandler = std::function<void(const QJsonValue &)>;
    using ErrorHandler = std::function<void(const QString &, int)>;

    explicit ApiClient(QObject *parent = nullptr);

    void postJson(const QString &baseUrl,
                  const QString &path,
                  const QJsonObject &body,
                  const QString &token,
                  SuccessHandler onSuccess,
                  ErrorHandler onError);

    void getJson(const QString &baseUrl,
                 const QString &path,
                 const QUrlQuery &query,
                 const QString &token,
                 SuccessHandler onSuccess,
                 ErrorHandler onError);

private:
    QNetworkAccessManager m_network;

    QUrl buildUrl(const QString &baseUrl, const QString &path, const QUrlQuery &query) const;
    QNetworkRequest buildRequest(const QUrl &url, const QString &token) const;
    void handleReply(QNetworkReply *reply, SuccessHandler onSuccess, ErrorHandler onError);
};
