package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"time"

	"onyxhub/backend/internal/models"
)

func generateRDPPassword() (string, error) {
	value := make([]byte, 24)
	if _, err := io.ReadFull(rand.Reader, value); err != nil {
		return "", fmt.Errorf("生成 RDP 密码失败: %w", err)
	}
	return "Aa1!" + base64.RawURLEncoding.EncodeToString(value), nil
}

func (s *Service) encryptRDPPassword(password string) (string, error) {
	if password == "" {
		return "", errors.New("RDP 密码不能为空")
	}
	gcm, err := s.rdpPasswordCipher()
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("生成 RDP 密码随机数失败: %w", err)
	}
	value := gcm.Seal(nonce, nonce, []byte(password), nil)
	return base64.RawStdEncoding.EncodeToString(value), nil
}

func (s *Service) decryptRDPPassword(value string) (string, error) {
	if value == "" {
		return "", errors.New("用户尚未初始化 RDP 凭据")
	}
	raw, err := base64.RawStdEncoding.DecodeString(value)
	if err != nil {
		return "", errors.New("RDP 凭据格式无效")
	}
	gcm, err := s.rdpPasswordCipher()
	if err != nil {
		return "", err
	}
	if len(raw) <= gcm.NonceSize() {
		return "", errors.New("RDP 凭据格式无效")
	}
	plain, err := gcm.Open(nil, raw[:gcm.NonceSize()], raw[gcm.NonceSize():], nil)
	if err != nil {
		return "", errors.New("RDP 凭据解密失败")
	}
	return string(plain), nil
}

func (s *Service) rdpPasswordCipher() (cipher.AEAD, error) {
	key := sha256.Sum256([]byte("onyxhub-rdp-password:" + s.jwtSecret))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, fmt.Errorf("初始化 RDP 凭据加密失败: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("初始化 RDP 凭据加密失败: %w", err)
	}
	return gcm, nil
}

func (s *Service) initializeRDPPassword(user *models.User) (string, error) {
	password, err := generateRDPPassword()
	if err != nil {
		return "", err
	}
	windowsUsername := publicWindowsUsername(*user)
	if windowsUsername == "" {
		return "", errors.New("Windows 用户名不能为空")
	}
	if _, err := s.sendAgentCommandWithTimeout("set_windows_user_password", map[string]any{
		"windowsUsername": windowsUsername,
		"password":        password,
	}, 30*time.Second); err != nil {
		return "", fmt.Errorf("初始化 Windows RDP 密码失败: %w", err)
	}
	encrypted, err := s.encryptRDPPassword(password)
	if err != nil {
		return "", err
	}
	if err := s.db.Model(user).Update("rdp_password", encrypted).Error; err != nil {
		return "", fmt.Errorf("保存 RDP 凭据失败: %w", err)
	}
	user.RDPPassword = encrypted
	return password, nil
}
