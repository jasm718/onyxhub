package service

import "testing"

func TestRDPPasswordEncryptionRoundTrip(t *testing.T) {
	service := &Service{jwtSecret: "test-secret"}
	password := "Rdp-Password-123"

	encrypted, err := service.encryptRDPPassword(password)
	if err != nil {
		t.Fatalf("encryptRDPPassword failed: %v", err)
	}
	if encrypted == password {
		t.Fatal("encrypted password must not equal plaintext")
	}

	decrypted, err := service.decryptRDPPassword(encrypted)
	if err != nil {
		t.Fatalf("decryptRDPPassword failed: %v", err)
	}
	if decrypted != password {
		t.Fatalf("decrypted password = %q, want %q", decrypted, password)
	}
}

func TestRDPPasswordEncryptionUsesRandomNonce(t *testing.T) {
	service := &Service{jwtSecret: "test-secret"}
	first, err := service.encryptRDPPassword("same-password")
	if err != nil {
		t.Fatalf("first encryption failed: %v", err)
	}
	second, err := service.encryptRDPPassword("same-password")
	if err != nil {
		t.Fatalf("second encryption failed: %v", err)
	}
	if first == second {
		t.Fatal("encrypted values must differ")
	}
}

func TestRDPPasswordDecryptionRejectsInvalidValue(t *testing.T) {
	service := &Service{jwtSecret: "test-secret"}
	if _, err := service.decryptRDPPassword("invalid"); err == nil {
		t.Fatal("decryptRDPPassword should reject invalid value")
	}
}
