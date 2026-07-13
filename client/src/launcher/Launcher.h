#pragma once

#include <QObject>

class Launcher : public QObject {
    Q_OBJECT

public:
    explicit Launcher(QObject *parent = nullptr);

    bool launchRdp(const QString &rdpContent, QString *errorMessage);
};
