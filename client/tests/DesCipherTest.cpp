#include "security/DesCipher.h"

#include <QtTest>

class DesCipherTest : public QObject {
    Q_OBJECT

private slots:
    void encryptDecryptRoundTrip();
    void rejectsInvalidCiphertext();
};

void DesCipherTest::encryptDecryptRoundTrip() {
    const QString password = QStringLiteral("P@ssw0rd-\u4e2d\u6587");
    QString ciphertext;
    QString errorMessage;

    QVERIFY2(DesCipher::encrypt(password, &ciphertext, &errorMessage), qPrintable(errorMessage));
    QVERIFY(ciphertext != password);

    QString plaintext;
    QVERIFY2(DesCipher::decrypt(ciphertext, &plaintext, &errorMessage), qPrintable(errorMessage));
    QCOMPARE(plaintext, password);
}

void DesCipherTest::rejectsInvalidCiphertext() {
    QString plaintext;
    QVERIFY(!DesCipher::decrypt(QStringLiteral("not-a-valid-ciphertext"), &plaintext, nullptr));
}

QTEST_APPLESS_MAIN(DesCipherTest)

#include "DesCipherTest.moc"
