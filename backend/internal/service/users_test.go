package service

import (
	"testing"
	"time"
)

func TestGenerateWindowsUsername(t *testing.T) {
	svc := &Service{now: func() time.Time {
		return time.Unix(1735689600, 0)
	}}

	got, err := svc.generateWindowsUsername("zhangsan")
	if err != nil {
		t.Fatalf("generateWindowsUsername returned error: %v", err)
	}
	if got != "zhangsan_9600" {
		t.Fatalf("unexpected windows username: %s", got)
	}
}

func TestGenerateWindowsUsernameRejectsLongUsername(t *testing.T) {
	svc := &Service{now: time.Now}

	_, err := svc.generateWindowsUsername("abcdefghijklmn")
	if err == nil {
		t.Fatal("expected error for long username")
	}
}

