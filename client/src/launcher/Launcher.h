#pragma once

#include <QObject>
#include <QtGlobal>

struct LaunchedProcess {
    qint64 id = 0;
    quintptr handle = 0;
};

class Launcher : public QObject {
    Q_OBJECT

public:
    explicit Launcher(QObject *parent = nullptr);

    bool launchRdp(const QString &rdpContent,
                   const QString &serverAddress,
                   const QString &username,
                   const QString &password,
                   LaunchedProcess *process,
                   QString *errorMessage);

    bool isRunning(const LaunchedProcess &process) const;
    void release(LaunchedProcess *process) const;
};
