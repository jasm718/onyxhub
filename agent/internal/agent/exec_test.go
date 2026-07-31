package agent

import "testing"

func TestNewExecutorDoesNotStartDisconnectedSessionCleanup(t *testing.T) {
	executor := NewExecutor(nil)
	if executor.cleanupCancel != nil {
		t.Fatal("new executor must wait for backend cleanup settings")
	}
}
