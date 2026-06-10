package http

import (
	"net/http"
	"strings"

	"onyxhub/backend/internal/auth"
	"onyxhub/backend/internal/models"

	"github.com/gin-gonic/gin"
)

const claimsKey = "claims"

func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowed[origin] = struct{}{}
		}
	}

	return func(c *gin.Context) {
		origin := strings.TrimSpace(c.GetHeader("Origin"))
		if origin != "" {
			if _, ok := allowed[origin]; ok {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Vary", "Origin")
			}
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Header("Access-Control-Max-Age", "600")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func authMiddleware(jwtSecret string, requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := strings.TrimSpace(c.GetHeader("Authorization"))
		if header == "" {
			fail(c, http.StatusUnauthorized, "未登录")
			c.Abort()
			return
		}
		const prefix = "Bearer "
		if !strings.HasPrefix(header, prefix) {
			fail(c, http.StatusUnauthorized, "未登录")
			c.Abort()
			return
		}

		claims, err := auth.ParseToken(jwtSecret, strings.TrimSpace(strings.TrimPrefix(header, prefix)))
		if err != nil {
			fail(c, http.StatusUnauthorized, "未登录")
			c.Abort()
			return
		}
		if requiredRole != "" && claims.Role != requiredRole {
			fail(c, http.StatusForbidden, "无权限访问")
			c.Abort()
			return
		}

		c.Set(claimsKey, claims)
		c.Next()
	}
}

func currentClaims(c *gin.Context) *auth.Claims {
	v, ok := c.Get(claimsKey)
	if !ok {
		return nil
	}
	claims, _ := v.(*auth.Claims)
	return claims
}

func adminAuth(jwtSecret string) gin.HandlerFunc {
	return authMiddleware(jwtSecret, models.RoleAdmin)
}

func clientAuth(jwtSecret string) gin.HandlerFunc {
	return authMiddleware(jwtSecret, models.RoleUser)
}
