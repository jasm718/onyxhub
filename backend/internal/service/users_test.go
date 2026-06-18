package service

import (
	"testing"
	"time"
)

func TestRequireWindowsUsernameUsesLoginName(t *testing.T) {
	got, err := requireWindowsUsername("zhangsan")
	if err != nil {
		t.Fatalf("requireWindowsUsername returned error: %v", err)
	}
	if got != "zhangsan" {
		t.Fatalf("unexpected windows username: %s", got)
	}
}

func TestRequireWindowsUsernameRejectsLongUsername(t *testing.T) {
	_, err := requireWindowsUsername("abcdefghijklmnopqrstu")
	if err == nil {
		t.Fatal("expected error for long username")
	}
}

func TestRequireWindowsUsernameRejectsInvalidCharacters(t *testing.T) {
	_, err := requireWindowsUsername("zhang/san")
	if err == nil {
		t.Fatal("expected error for invalid username")
	}
}

func TestValidSessionSnapshotItemIgnoresAdministrator(t *testing.T) {
	svc := &Service{}
	item := sessionSnapshotItem{
		WindowsUsername:  "Administrator",
		WindowsSessionID: intPtr(1),
		ConnectedAt:      time.Now(),
	}

	_, _, ok := svc.validSessionSnapshotItem(nil, "host", item)
	if ok {
		t.Fatal("expected administrator session to be ignored")
	}
}

func intPtr(v int) *int {
	return &v
}
