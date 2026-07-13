#include "ApiClient.h"

#include <QJsonDocument>
#include <QNetworkReply>
#include <QUrl>
#include <QUrlQuery>

ApiClient::ApiClient(QObject *parent) : QObject(parent) {}

void ApiClient::postJson(const QString &baseUrl,
                         const QString &path,
                         const QJsonObject &body,
                         const QString &token,
                         SuccessHandler onSuccess,
                         ErrorHandler onError) {
    QNetworkRequest request = buildRequest(buildUrl(baseUrl, path, QUrlQuery()), token);
    auto *reply = m_network.post(request, QJsonDocument(body).toJson(QJsonDocument::Compact));
    handleReply(reply, std::move(onSuccess), std::move(onError));
}

void ApiClient::getJson(const QString &baseUrl,
                        const QString &path,
                        const QUrlQuery &query,
                        const QString &token,
                        SuccessHandler onSuccess,
                        ErrorHandler onError) {
    QNetworkRequest request = buildRequest(buildUrl(baseUrl, path, query), token);
    auto *reply = m_network.get(request);
    handleReply(reply, std::move(onSuccess), std::move(onError));
}

QUrl ApiClient::buildUrl(const QString &baseUrl, const QString &path, const QUrlQuery &query) const {
    QString normalized = baseUrl.trimmed();
    while (normalized.endsWith('/')) {
        normalized.chop(1);
    }

    QString normalizedPath = path;
    if (!normalizedPath.startsWith('/')) {
        normalizedPath.prepend('/');
    }

    QUrl url(normalized + normalizedPath);
    url.setQuery(query);
    return url;
}

QNetworkRequest ApiClient::buildRequest(const QUrl &url, const QString &token) const {
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, QStringLiteral("application/json"));
    request.setRawHeader("Accept", "application/json");
    if (!token.isEmpty()) {
        request.setRawHeader("Authorization", "Bearer " + token.toUtf8());
    }
    return request;
}

void ApiClient::handleReply(QNetworkReply *reply, SuccessHandler onSuccess, ErrorHandler onError) {
    connect(reply, &QNetworkReply::finished, this, [reply, onSuccess = std::move(onSuccess), onError = std::move(onError)]() mutable {
        const int statusCode = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
        const QNetworkReply::NetworkError networkError = reply->error();
        const QString networkErrorString = reply->errorString();
        const QByteArray payload = reply->readAll();
        reply->deleteLater();

        if (networkError != QNetworkReply::NoError) {
            onError(networkErrorString, statusCode);
            return;
        }

        QJsonParseError parseError;
        const QJsonDocument document = QJsonDocument::fromJson(payload, &parseError);
        if (parseError.error != QJsonParseError::NoError || !document.isObject()) {
            onError(QStringLiteral("解析响应失败"), statusCode);
            return;
        }

        const QJsonObject root = document.object();
        const int code = root.value(QStringLiteral("code")).toInt(1);
        const QString message = root.value(QStringLiteral("message")).toString(QStringLiteral("请求失败"));
        if (code != 0) {
            onError(message, statusCode);
            return;
        }

        onSuccess(root.value(QStringLiteral("data")));
    });
}
