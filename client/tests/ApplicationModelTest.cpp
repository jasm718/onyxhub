#include "app/ApplicationModel.h"

#include <QJsonObject>
#include <QSignalSpy>
#include <QTest>

class ApplicationModelTest : public QObject {
    Q_OBJECT

private slots:
    void tracksLaunchState();
    void preservesLaunchStateAcrossRefresh();
};

namespace {
QJsonArray applications() {
    return {
        QJsonObject{
            {QStringLiteral("id"), QStringLiteral("7")},
            {QStringLiteral("name"), QStringLiteral("Notepad")},
        },
    };
}
} // namespace

void ApplicationModelTest::tracksLaunchState() {
    ApplicationModel model;
    model.setApplications(applications());
    QSignalSpy dataChangedSpy(&model, &QAbstractItemModel::dataChanged);

    QCOMPARE(model.launchState(QStringLiteral("7")), QStringLiteral("idle"));
    QCOMPARE(model.data(model.index(0), ApplicationModel::LaunchStateRole).toString(), QStringLiteral("idle"));

    model.setLaunchState(QStringLiteral("7"), QStringLiteral("starting"));
    QCOMPARE(model.launchState(QStringLiteral("7")), QStringLiteral("starting"));
    QCOMPARE(model.data(model.index(0), ApplicationModel::LaunchStateRole).toString(), QStringLiteral("starting"));
    QCOMPARE(dataChangedSpy.count(), 1);

    model.setLaunchState(QStringLiteral("7"), QStringLiteral("idle"));
    QCOMPARE(model.launchState(QStringLiteral("7")), QStringLiteral("idle"));
    QCOMPARE(dataChangedSpy.count(), 2);
}

void ApplicationModelTest::preservesLaunchStateAcrossRefresh() {
    ApplicationModel model;
    model.setApplications(applications());
    model.setLaunchState(QStringLiteral("7"), QStringLiteral("running"));

    model.setApplications(applications());
    QCOMPARE(model.data(model.index(0), ApplicationModel::LaunchStateRole).toString(), QStringLiteral("running"));

    model.clearLaunchStates();
    QCOMPARE(model.data(model.index(0), ApplicationModel::LaunchStateRole).toString(), QStringLiteral("idle"));
}

QTEST_GUILESS_MAIN(ApplicationModelTest)

#include "ApplicationModelTest.moc"
