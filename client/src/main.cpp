#include <QApplication>
#include <QCoreApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickWindow>
#include <QIcon>

#include "api/ApiClient.h"
#include "app/ApplicationModel.h"
#include "app/ClientApp.h"
#include "launcher/Launcher.h"

int main(int argc, char *argv[]) {
#ifdef Q_OS_WIN
    qputenv("QT_QPA_PLATFORM", "windows:darkmode=2");
#endif
    qputenv("QT_QUICK_CONTROLS_STYLE", "Basic");

    QApplication::setOrganizationName("OnyxHub");
    QApplication::setOrganizationDomain("onyxhub.local");
    QApplication::setApplicationName("onyxhub-client");
    QApplication::setApplicationDisplayName("OnyxHub Client");
    QApplication::setApplicationVersion("0.1.0");

    QApplication app(argc, argv);
    app.setWindowIcon(QIcon(QStringLiteral(":/OnyxHub/Client/assets/onyxhub.ico")));
    QQuickWindow::setGraphicsApi(QSGRendererInterface::OpenGL);

    ApiClient apiClient;
    ApplicationModel applicationModel;
    Launcher launcher;
    ClientApp clientApp(&apiClient, &applicationModel, &launcher);

    QQmlApplicationEngine engine;
    const QString appDir = QCoreApplication::applicationDirPath();
    engine.addImportPath(appDir + QStringLiteral("/qml"));
    engine.addImportPath(appDir + QStringLiteral("/imports"));
    engine.rootContext()->setContextProperty("ClientApp", &clientApp);
    engine.rootContext()->setContextProperty("ApplicationModel", &applicationModel);

    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreationFailed,
        &app,
        [] { QCoreApplication::exit(-1); },
        Qt::QueuedConnection);

    engine.loadFromModule("OnyxHub.Client", "App");
    return QApplication::exec();
}
