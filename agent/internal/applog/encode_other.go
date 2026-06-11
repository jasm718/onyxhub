//go:build !windows

package applog

func encodeLogText(value string) ([]byte, error) {
	return []byte(value), nil
}
