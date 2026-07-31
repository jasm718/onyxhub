#include "ApplicationModel.h"

#include <QJsonObject>

ApplicationModel::ApplicationModel(QObject *parent) : QAbstractListModel(parent) {}

int ApplicationModel::rowCount(const QModelIndex &parent) const {
    if (parent.isValid()) {
        return 0;
    }
    return m_items.size();
}

QVariant ApplicationModel::data(const QModelIndex &index, int role) const {
    if (!index.isValid() || index.row() < 0 || index.row() >= m_items.size()) {
        return {};
    }

    const ApplicationItem &item = m_items.at(index.row());
    switch (role) {
    case IdRole:
        return item.id;
    case NameRole:
        return item.name;
    case PathRole:
        return item.path;
    case IconRole:
        return item.icon;
    case IconSourceRole:
        return item.icon.isEmpty() ? QString() : QStringLiteral("data:image/png;base64,%1").arg(item.icon);
    case ArgumentsRole:
        return item.arguments;
    case WorkingDirRole:
        return item.workingDir;
    case StatusRole:
        return item.status;
    default:
        return {};
    }
}

QHash<int, QByteArray> ApplicationModel::roleNames() const {
    return {
        {IdRole, "applicationId"},
        {NameRole, "name"},
        {PathRole, "path"},
        {IconRole, "icon"},
        {IconSourceRole, "iconSource"},
        {ArgumentsRole, "arguments"},
        {WorkingDirRole, "workingDir"},
        {StatusRole, "status"},
    };
}

int ApplicationModel::count() const {
    return m_items.size();
}

void ApplicationModel::setApplications(const QJsonArray &applications) {
    beginResetModel();
    m_items.clear();
    m_items.reserve(applications.size());

    for (const QJsonValue &value : applications) {
        const QJsonObject object = value.toObject();
        ApplicationItem item;
        item.id = object.value(QStringLiteral("id")).toString();
        item.name = object.value(QStringLiteral("name")).toString();
        item.path = object.value(QStringLiteral("path")).toString();
        item.icon = object.value(QStringLiteral("icon")).toString();
        item.arguments = object.value(QStringLiteral("arguments")).toString();
        item.workingDir = object.value(QStringLiteral("workingDir")).toString();
        item.status = object.value(QStringLiteral("status")).toString();
        m_items.push_back(item);
    }

    endResetModel();
    emit countChanged();
}

void ApplicationModel::clear() {
    beginResetModel();
    m_items.clear();
    endResetModel();
    emit countChanged();
}
