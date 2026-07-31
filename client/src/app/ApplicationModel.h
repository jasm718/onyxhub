#pragma once

#include <QAbstractListModel>
#include <QHash>
#include <QJsonArray>
#include <QVector>

struct ApplicationItem {
    QString id;
    QString name;
    QString path;
    QString icon;
    QString arguments;
    QString workingDir;
    QString status;
};

class ApplicationModel : public QAbstractListModel {
    Q_OBJECT
    Q_PROPERTY(int count READ count NOTIFY countChanged)

public:
    enum Role {
        IdRole = Qt::UserRole + 1,
        NameRole,
        PathRole,
        IconRole,
        IconSourceRole,
        ArgumentsRole,
        WorkingDirRole,
        StatusRole,
        LaunchStateRole,
    };

    explicit ApplicationModel(QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QHash<int, QByteArray> roleNames() const override;

    int count() const;
    void setApplications(const QJsonArray &applications);
    QString applicationName(const QString &applicationId) const;
    QString launchState(const QString &applicationId) const;
    void setLaunchState(const QString &applicationId, const QString &state);
    void clearLaunchStates();
    Q_INVOKABLE void clear();

signals:
    void countChanged();

private:
    QVector<ApplicationItem> m_items;
    QHash<QString, QString> m_launchStates;
};
