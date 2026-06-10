package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type response struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

func ok(c *gin.Context, data any) {
	if data == nil {
		data = gin.H{}
	}
	c.JSON(http.StatusOK, response{
		Code:    0,
		Message: "ok",
		Data:    data,
	})
}

func fail(c *gin.Context, status int, message string) {
	if message == "" {
		message = "请求失败"
	}
	c.JSON(status, response{
		Code:    1,
		Message: message,
		Data:    gin.H{},
	})
}
