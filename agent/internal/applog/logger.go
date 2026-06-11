package applog

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	ComponentAgent     = "agent"
	ComponentInstaller = "installer"

	EventLogInit = "log_init"
)

type Field struct {
	Key   string
	Value any
}

type Logger struct {
	component string
	writer    io.Writer
	mu        sync.Mutex
	now       func() time.Time
}

type dailyRunWriter struct {
	mu         sync.Mutex
	dir        string
	currentDay string
	file       *os.File
	now        func() time.Time
}

func F(key string, value any) Field {
	return Field{Key: key, Value: value}
}

func LogDir() (string, error) {
	executable, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("获取当前程序路径失败: %w", err)
	}
	return filepath.Join(filepath.Dir(executable), "Logs"), nil
}

func NewRunLogger(component string) (*Logger, error) {
	dir, err := LogDir()
	if err != nil {
		return nil, err
	}
	writer, err := newDailyRunWriter(dir, time.Now)
	if err != nil {
		return nil, err
	}
	logger := &Logger{component: component, writer: writer, now: time.Now}
	logger.Info(EventLogInit, "运行日志初始化完成", F("dir", dir))
	return logger, nil
}

func NewInstallLogger(component string) (*Logger, error) {
	dir, err := LogDir()
	if err != nil {
		return nil, err
	}
	return newInstallLoggerAt(component, dir)
}

func newInstallLoggerAt(component string, dir string) (*Logger, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("创建日志目录失败: %w", err)
	}
	file, err := os.OpenFile(filepath.Join(dir, "install.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("打开安装日志失败: %w", err)
	}
	logger := &Logger{component: component, writer: file, now: time.Now}
	logger.Info(EventLogInit, "安装日志初始化完成", F("dir", dir))
	return logger, nil
}

func (l *Logger) Info(event string, msg string, fields ...Field) {
	l.write("INFO", event, msg, fields...)
}

func (l *Logger) Warn(event string, msg string, fields ...Field) {
	l.write("WARN", event, msg, fields...)
}

func (l *Logger) Error(event string, msg string, fields ...Field) {
	l.write("ERROR", event, msg, fields...)
}

func (l *Logger) write(level string, event string, msg string, fields ...Field) {
	if l == nil || l.writer == nil {
		return
	}
	line := formatLine(l.now(), level, l.component, event, msg, fields...)
	data, err := encodeLogText(line + "\r\n")
	if err != nil {
		panic(fmt.Sprintf("编码日志失败: %v", err))
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if _, err := l.writer.Write(data); err != nil {
		panic(fmt.Sprintf("写入日志失败: %v", err))
	}
}

func (l *Logger) Close() error {
	if l == nil {
		return nil
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if closer, ok := l.writer.(io.Closer); ok {
		err := closer.Close()
		l.writer = nil
		return err
	}
	l.writer = nil
	return nil
}

func newDailyRunWriter(dir string, now func() time.Time) (*dailyRunWriter, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("创建日志目录失败: %w", err)
	}
	writer := &dailyRunWriter{dir: dir, now: now}
	if err := writer.rotateIfNeeded(); err != nil {
		return nil, err
	}
	return writer, nil
}

func (w *dailyRunWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if err := w.rotateIfNeeded(); err != nil {
		return 0, err
	}
	return w.file.Write(p)
}

func (w *dailyRunWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.file == nil {
		return nil
	}
	err := w.file.Close()
	w.file = nil
	w.currentDay = ""
	return err
}

func (w *dailyRunWriter) rotateIfNeeded() error {
	day := w.now().Format("06-01-02")
	if w.file != nil && w.currentDay == day {
		return nil
	}
	if w.file != nil {
		if err := w.file.Close(); err != nil {
			return fmt.Errorf("关闭运行日志失败: %w", err)
		}
	}
	path := filepath.Join(w.dir, day+".run.log")
	file, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("打开运行日志失败: %w", err)
	}
	w.file = file
	w.currentDay = day
	if err := pruneRunLogs(w.dir, 30); err != nil {
		_ = w.file.Close()
		w.file = nil
		w.currentDay = ""
		return err
	}
	return nil
}

func pruneRunLogs(dir string, keep int) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("读取日志目录失败: %w", err)
	}
	type item struct {
		name string
		path string
	}
	items := make([]item, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".run.log") {
			continue
		}
		items = append(items, item{name: entry.Name(), path: filepath.Join(dir, entry.Name())})
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].name > items[j].name
	})
	if len(items) <= keep {
		return nil
	}
	for _, item := range items[keep:] {
		if err := os.Remove(item.path); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("删除旧运行日志失败: %w", err)
		}
	}
	return nil
}

func formatLine(t time.Time, level string, component string, event string, msg string, fields ...Field) string {
	parts := []string{
		t.Format("2006-01-02 15:04:05.000"),
		level,
		"component=" + sanitizeToken(component),
		"event=" + sanitizeToken(event),
	}
	for _, field := range fields {
		key := sanitizeToken(field.Key)
		if key == "" {
			continue
		}
		parts = append(parts, key+"="+formatValue(field.Value))
	}
	parts = append(parts, "msg="+quoteValue(msg))
	return strings.Join(parts, " ")
}

func sanitizeToken(value string) string {
	value = strings.TrimSpace(value)
	value = strings.Map(func(r rune) rune {
		if r == ' ' || r == '\t' || r == '\r' || r == '\n' || r == '=' {
			return '_'
		}
		return r
	}, value)
	return value
}

func formatValue(value any) string {
	switch v := value.(type) {
	case nil:
		return quoteValue("")
	case string:
		if isPlainToken(v) {
			return v
		}
		return quoteValue(v)
	case error:
		return quoteValue(v.Error())
	case time.Duration:
		return v.String()
	default:
		text := fmt.Sprint(v)
		if isPlainToken(text) {
			return text
		}
		return quoteValue(text)
	}
}

func isPlainToken(value string) bool {
	if value == "" {
		return false
	}
	for _, r := range value {
		if r == ' ' || r == '\t' || r == '\r' || r == '\n' || r == '"' {
			return false
		}
	}
	return true
}

func quoteValue(value string) string {
	value = strings.ReplaceAll(value, `\`, `\\`)
	value = strings.ReplaceAll(value, `"`, `\"`)
	value = strings.ReplaceAll(value, "\r", `\r`)
	value = strings.ReplaceAll(value, "\n", `\n`)
	return `"` + value + `"`
}
