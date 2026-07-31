#pragma once

#include <QObject>

class Launcher : public QObject {
    Q_OBJECT

public:
    explicit Launcher(QObject *parent = nullptr);

    bool launchRdp(const QString &rdpContent,
                   const QString &serverAddress,
                   const QString &username,
                   const QString &password,
                   QString *statusFilePath,
                   QString *errorMessage);
};
