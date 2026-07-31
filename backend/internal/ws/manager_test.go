package ws

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func TestManagerCallsConnectionHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	manager := NewManager()
	connected := make(chan struct{}, 1)
	manager.SetConnectionHandler(func() {
		connected <- struct{}{}
	})

	router := gin.New()
	router.GET("/ws", manager.Handle)
	server := httptest.NewServer(router)
	defer server.Close()

	conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/ws", nil)
	if err != nil {
		t.Fatalf("dial websocket failed: %v", err)
	}
	defer conn.Close()

	select {
	case <-connected:
	case <-time.After(time.Second):
		t.Fatal("connection handler was not called")
	}
}
