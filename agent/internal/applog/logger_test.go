package applog

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestDailyRunWriterUsesYYMMDDRunLog(t *testing.T) {
	dir := t.TempDir()
	now := func() time.Time { return time.Date(2026, 6, 11, 9, 0, 0, 0, time.Local) }
	writer, err := newDailyRunWriter(dir, now)
	if err != nil {
		t.Fatalf("newDailyRunWriter failed: %v", err)
	}
	defer writer.Close()
	if _, err := writer.Write([]byte("hello\n")); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	path := filepath.Join(dir, "26-06-11.run.log")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read run log failed: %v", err)
	}
	if string(raw) != "hello\n" {
		t.Fatalf("unexpected log content: %q", string(raw))
	}
}

func TestDailyRunWriterRotatesWhenDayChanges(t *testing.T) {
	dir := t.TempDir()
	current := time.Date(2026, 6, 11, 23, 59, 0, 0, time.Local)
	writer, err := newDailyRunWriter(dir, func() time.Time { return current })
	if err != nil {
		t.Fatalf("newDailyRunWriter failed: %v", err)
	}
	defer writer.Close()
	if _, err := writer.Write([]byte("day1\n")); err != nil {
		t.Fatalf("write day1 failed: %v", err)
	}

	current = time.Date(2026, 6, 12, 0, 0, 1, 0, time.Local)
	if _, err := writer.Write([]byte("day2\n")); err != nil {
		t.Fatalf("write day2 failed: %v", err)
	}

	if _, err := os.Stat(filepath.Join(dir, "26-06-11.run.log")); err != nil {
		t.Fatalf("missing first day log: %v", err)
	}
	raw, err := os.ReadFile(filepath.Join(dir, "26-06-12.run.log"))
	if err != nil {
		t.Fatalf("missing second day log: %v", err)
	}
	if string(raw) != "day2\n" {
		t.Fatalf("unexpected second day content: %q", string(raw))
	}
}

func TestPruneRunLogsKeepsLatestThirty(t *testing.T) {
	dir := t.TempDir()
	for day := 1; day <= 35; day++ {
		name := time.Date(2026, 1, day, 0, 0, 0, 0, time.Local).Format("06-01-02") + ".run.log"
		if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0644); err != nil {
			t.Fatalf("write log failed: %v", err)
		}
	}
	if err := pruneRunLogs(dir, 30); err != nil {
		t.Fatalf("pruneRunLogs failed: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read dir failed: %v", err)
	}
	var names []string
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".run.log") {
			names = append(names, entry.Name())
		}
	}
	if len(names) != 30 {
		t.Fatalf("expected 30 run logs, got %d: %v", len(names), names)
	}
	if _, err := os.Stat(filepath.Join(dir, "26-01-01.run.log")); !os.IsNotExist(err) {
		t.Fatalf("oldest log should be removed, err=%v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "26-02-04.run.log")); err != nil {
		t.Fatalf("newest log should remain: %v", err)
	}
}

func TestInstallLoggerWritesInstallLog(t *testing.T) {
	dir := t.TempDir()
	logger, err := newInstallLoggerAt(ComponentInstaller, dir)
	if err != nil {
		t.Fatalf("NewInstallLogger failed: %v", err)
	}
	defer logger.Close()
	logger.Info("install_start", "开始安装")

	raw, err := os.ReadFile(filepath.Join(dir, "install.log"))
	if err != nil {
		t.Fatalf("read install log failed: %v", err)
	}
	if !strings.Contains(string(raw), "component=installer") || !strings.Contains(string(raw), "event=install_start") {
		t.Fatalf("unexpected install log: %q", raw)
	}
	if !strings.Contains(string(raw), "\r\n") {
		t.Fatalf("expected CRLF line ending: %q", raw)
	}
}

func TestEncodeLogTextUsesCRLF(t *testing.T) {
	raw, err := encodeLogText("install done\r\n")
	if err != nil {
		t.Fatalf("encodeLogText failed: %v", err)
	}
	if !strings.HasSuffix(string(raw), "\r\n") {
		t.Fatalf("expected CRLF suffix, got %q", string(raw))
	}
}
