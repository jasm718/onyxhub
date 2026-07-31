#include "DesCipher.h"

#include <QByteArray>

#include <windows.h>
#include <bcrypt.h>

namespace {
constexpr ULONG DesBlockSize = 8;
const QByteArray DesKey = QByteArray::fromHex("133457799BBCDFF1");

void setError(QString *errorMessage, const QString &message) {
    if (errorMessage) {
        *errorMessage = message;
    }
}

class DesContext {
public:
    ~DesContext() {
        if (m_key) {
            BCryptDestroyKey(m_key);
        }
        if (m_algorithm) {
            BCryptCloseAlgorithmProvider(m_algorithm, 0);
        }
    }

    bool initialize(QString *errorMessage) {
        if (BCryptOpenAlgorithmProvider(&m_algorithm, BCRYPT_DES_ALGORITHM, nullptr, 0) < 0
            || BCryptSetProperty(m_algorithm,
                                 BCRYPT_CHAINING_MODE,
                                 reinterpret_cast<PUCHAR>(const_cast<wchar_t *>(BCRYPT_CHAIN_MODE_CBC)),
                                 sizeof(BCRYPT_CHAIN_MODE_CBC),
                                 0)
                   < 0) {
            setError(errorMessage, QStringLiteral("DES 加密初始化失败"));
            return false;
        }

        ULONG keyObjectSize = 0;
        ULONG resultSize = 0;
        if (BCryptGetProperty(m_algorithm,
                              BCRYPT_OBJECT_LENGTH,
                              reinterpret_cast<PUCHAR>(&keyObjectSize),
                              sizeof(keyObjectSize),
                              &resultSize,
                              0)
                < 0
            || keyObjectSize == 0) {
            setError(errorMessage, QStringLiteral("DES 密钥初始化失败"));
            return false;
        }

        m_keyObject.resize(static_cast<int>(keyObjectSize));
        if (BCryptGenerateSymmetricKey(m_algorithm,
                                       &m_key,
                                       reinterpret_cast<PUCHAR>(m_keyObject.data()),
                                       keyObjectSize,
                                       reinterpret_cast<PUCHAR>(const_cast<char *>(DesKey.constData())),
                                       static_cast<ULONG>(DesKey.size()),
                                       0)
            < 0) {
            setError(errorMessage, QStringLiteral("DES 密钥初始化失败"));
            return false;
        }

        return true;
    }

    bool encrypt(const QByteArray &plaintext, const QByteArray &initializationVector, QByteArray *ciphertext, QString *errorMessage) const {
        QByteArray input = plaintext;
        QByteArray iv = initializationVector;
        ULONG requiredSize = 0;
        if (BCryptEncrypt(m_key,
                          reinterpret_cast<PUCHAR>(input.data()),
                          static_cast<ULONG>(input.size()),
                          nullptr,
                          reinterpret_cast<PUCHAR>(iv.data()),
                          static_cast<ULONG>(iv.size()),
                          nullptr,
                          0,
                          &requiredSize,
                          BCRYPT_BLOCK_PADDING)
            < 0) {
            setError(errorMessage, QStringLiteral("DES 加密失败"));
            return false;
        }

        QByteArray output(static_cast<int>(requiredSize), '\0');
        iv = initializationVector;
        ULONG outputSize = 0;
        if (BCryptEncrypt(m_key,
                          reinterpret_cast<PUCHAR>(input.data()),
                          static_cast<ULONG>(input.size()),
                          nullptr,
                          reinterpret_cast<PUCHAR>(iv.data()),
                          static_cast<ULONG>(iv.size()),
                          reinterpret_cast<PUCHAR>(output.data()),
                          static_cast<ULONG>(output.size()),
                          &outputSize,
                          BCRYPT_BLOCK_PADDING)
            < 0) {
            setError(errorMessage, QStringLiteral("DES 加密失败"));
            return false;
        }

        output.resize(static_cast<int>(outputSize));
        *ciphertext = output;
        return true;
    }

    bool decrypt(const QByteArray &ciphertext, const QByteArray &initializationVector, QByteArray *plaintext, QString *errorMessage) const {
        QByteArray input = ciphertext;
        QByteArray iv = initializationVector;
        ULONG requiredSize = 0;
        if (BCryptDecrypt(m_key,
                          reinterpret_cast<PUCHAR>(input.data()),
                          static_cast<ULONG>(input.size()),
                          nullptr,
                          reinterpret_cast<PUCHAR>(iv.data()),
                          static_cast<ULONG>(iv.size()),
                          nullptr,
                          0,
                          &requiredSize,
                          BCRYPT_BLOCK_PADDING)
            < 0) {
            setError(errorMessage, QStringLiteral("DES 解密失败"));
            return false;
        }

        QByteArray output(static_cast<int>(requiredSize), '\0');
        iv = initializationVector;
        ULONG outputSize = 0;
        if (BCryptDecrypt(m_key,
                          reinterpret_cast<PUCHAR>(input.data()),
                          static_cast<ULONG>(input.size()),
                          nullptr,
                          reinterpret_cast<PUCHAR>(iv.data()),
                          static_cast<ULONG>(iv.size()),
                          reinterpret_cast<PUCHAR>(output.data()),
                          static_cast<ULONG>(output.size()),
                          &outputSize,
                          BCRYPT_BLOCK_PADDING)
            < 0) {
            setError(errorMessage, QStringLiteral("DES 解密失败"));
            return false;
        }

        output.resize(static_cast<int>(outputSize));
        *plaintext = output;
        return true;
    }

private:
    BCRYPT_ALG_HANDLE m_algorithm = nullptr;
    BCRYPT_KEY_HANDLE m_key = nullptr;
    QByteArray m_keyObject;
};
} // namespace

bool DesCipher::encrypt(const QString &plaintext, QString *ciphertext, QString *errorMessage) {
    if (plaintext.isEmpty()) {
        setError(errorMessage, QStringLiteral("密码不能为空"));
        return false;
    }

    DesContext context;
    if (!context.initialize(errorMessage)) {
        return false;
    }

    QByteArray initializationVector(static_cast<int>(DesBlockSize), '\0');
    if (BCryptGenRandom(nullptr,
                         reinterpret_cast<PUCHAR>(initializationVector.data()),
                         DesBlockSize,
                         BCRYPT_USE_SYSTEM_PREFERRED_RNG)
        < 0) {
        setError(errorMessage, QStringLiteral("DES 加密初始化失败"));
        return false;
    }

    QByteArray encrypted;
    if (!context.encrypt(plaintext.toUtf8(), initializationVector, &encrypted, errorMessage)) {
        return false;
    }

    *ciphertext = QString::fromLatin1((initializationVector + encrypted).toBase64());
    return true;
}

bool DesCipher::decrypt(const QString &ciphertext, QString *plaintext, QString *errorMessage) {
    const QByteArray encoded = ciphertext.toLatin1();
    const QByteArray payload = QByteArray::fromBase64(encoded);
    if (payload.size() <= static_cast<int>(DesBlockSize)
        || (payload.size() - static_cast<int>(DesBlockSize)) % static_cast<int>(DesBlockSize) != 0
        || payload.toBase64() != encoded) {
        setError(errorMessage, QStringLiteral("已保存的密码格式无效"));
        return false;
    }

    DesContext context;
    if (!context.initialize(errorMessage)) {
        return false;
    }

    QByteArray decrypted;
    if (!context.decrypt(payload.mid(static_cast<int>(DesBlockSize)),
                         payload.left(static_cast<int>(DesBlockSize)),
                         &decrypted,
                         errorMessage)) {
        return false;
    }

    const QString value = QString::fromUtf8(decrypted);
    if (value.isEmpty()) {
        setError(errorMessage, QStringLiteral("已保存的密码无效"));
        return false;
    }

    *plaintext = value;
    return true;
}
