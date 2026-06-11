//go:build windows

package applog

import (
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	kernel32                = windows.NewLazySystemDLL("kernel32.dll")
	procWideCharToMultiByte = kernel32.NewProc("WideCharToMultiByte")
	procGetACP              = kernel32.NewProc("GetACP")
)

func encodeLogText(value string) ([]byte, error) {
	utf16, err := syscall.UTF16FromString(value)
	if err != nil {
		return nil, err
	}
	codePage, _, _ := procGetACP.Call()
	size, _, err := procWideCharToMultiByte.Call(
		codePage,
		0,
		uintptr(unsafe.Pointer(&utf16[0])),
		uintptr(len(utf16)-1),
		0,
		0,
		0,
		0,
	)
	if size == 0 {
		return nil, err
	}
	out := make([]byte, size)
	written, _, err := procWideCharToMultiByte.Call(
		codePage,
		0,
		uintptr(unsafe.Pointer(&utf16[0])),
		uintptr(len(utf16)-1),
		uintptr(unsafe.Pointer(&out[0])),
		uintptr(len(out)),
		0,
		0,
	)
	if written == 0 {
		return nil, err
	}
	return out[:written], nil
}
