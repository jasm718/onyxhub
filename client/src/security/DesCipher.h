#pragma once

#include <QString>

class DesCipher {
public:
    static bool encrypt(const QString &plaintext, QString *ciphertext, QString *errorMessage);
    static bool decrypt(const QString &ciphertext, QString *plaintext, QString *errorMessage);
};
