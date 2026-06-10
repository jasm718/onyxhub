package http

import (
	"net/http"

	"onyxhub/backend/internal/models"
	"onyxhub/backend/internal/service"
	agentws "onyxhub/backend/internal/ws"

	"github.com/gin-gonic/gin"
)

type Server struct {
	service   *service.Service
	jwtSecret string
	agent     *agentws.Manager
}

func NewRouter(svc *service.Service, jwtSecret string, agent *agentws.Manager, corsAllowedOrigins []string) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), corsMiddleware(corsAllowedOrigins))

	server := &Server{
		service:   svc,
		jwtSecret: jwtSecret,
		agent:     agent,
	}

	router.POST("/api/admin/auth/login", server.adminLogin)
	router.POST("/api/client/auth/login", server.clientLogin)
	router.GET("/ws/agent", agent.Handle)

	admin := router.Group("/api/admin")
	admin.Use(adminAuth(jwtSecret))
	{
		admin.GET("/users", server.listUsers)
		admin.POST("/users/create", server.createUser)
		admin.POST("/users/update", server.updateUser)
		admin.POST("/users/delete", server.deleteUser)

		admin.GET("/applications", server.listApplications)
		admin.POST("/applications/create", server.createApplication)
		admin.POST("/applications/update", server.updateApplication)
		admin.POST("/applications/delete", server.deleteApplication)
		admin.POST("/applications/enable", server.enableApplication)
		admin.POST("/applications/disable", server.disableApplication)

		admin.GET("/authorizations", server.listAuthorizations)
		admin.POST("/authorizations/grant", server.grantAuthorization)
		admin.POST("/authorizations/revoke", server.revokeAuthorization)

		admin.GET("/overview", server.overview)
	}

	client := router.Group("/api/client")
	client.Use(clientAuth(jwtSecret))
	{
		client.GET("/applications", server.clientApplications)
		client.GET("/applications/launch-info", server.launchInfo)
	}

	return router
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type idRequest struct {
	ID string `json:"id"`
}

func bindJSON(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		fail(c, http.StatusBadRequest, "参数错误")
		return false
	}
	return true
}

func actorUserID(c *gin.Context) string {
	claims := currentClaims(c)
	if claims == nil {
		return ""
	}
	return claims.UserID
}

func (s *Server) adminLogin(c *gin.Context) {
	var req loginRequest
	if !bindJSON(c, &req) {
		return
	}
	result, err := s.service.AdminLogin(req.Username, req.Password)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, result)
}

func (s *Server) clientLogin(c *gin.Context) {
	var req loginRequest
	if !bindJSON(c, &req) {
		return
	}
	result, err := s.service.ClientLogin(req.Username, req.Password)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, result)
}

func (s *Server) listUsers(c *gin.Context) {
	users, err := s.service.ListUsers()
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, users)
}

func (s *Server) createUser(c *gin.Context) {
	var req service.CreateUserInput
	if !bindJSON(c, &req) {
		return
	}
	user, err := s.service.CreateUser(actorUserID(c), req)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, user)
}

func (s *Server) updateUser(c *gin.Context) {
	var req service.UpdateUserInput
	if !bindJSON(c, &req) {
		return
	}
	user, err := s.service.UpdateUser(actorUserID(c), req)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, user)
}

func (s *Server) deleteUser(c *gin.Context) {
	var req idRequest
	if !bindJSON(c, &req) {
		return
	}
	if err := s.service.DeleteUser(actorUserID(c), req.ID); err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, nil)
}

func (s *Server) listApplications(c *gin.Context) {
	applications, err := s.service.ListApplications()
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, applications)
}

func (s *Server) createApplication(c *gin.Context) {
	var req service.CreateApplicationInput
	if !bindJSON(c, &req) {
		return
	}
	application, err := s.service.CreateApplication(actorUserID(c), req)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, application)
}

func (s *Server) updateApplication(c *gin.Context) {
	var req service.UpdateApplicationInput
	if !bindJSON(c, &req) {
		return
	}
	application, err := s.service.UpdateApplication(actorUserID(c), req)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, application)
}

func (s *Server) deleteApplication(c *gin.Context) {
	var req idRequest
	if !bindJSON(c, &req) {
		return
	}
	if err := s.service.DeleteApplication(actorUserID(c), req.ID); err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, nil)
}

func (s *Server) enableApplication(c *gin.Context) {
	var req idRequest
	if !bindJSON(c, &req) {
		return
	}
	application, err := s.service.SetApplicationStatus(actorUserID(c), req.ID, models.StatusActive)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, application)
}

func (s *Server) disableApplication(c *gin.Context) {
	var req idRequest
	if !bindJSON(c, &req) {
		return
	}
	application, err := s.service.SetApplicationStatus(actorUserID(c), req.ID, models.StatusDisabled)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, application)
}

func (s *Server) listAuthorizations(c *gin.Context) {
	authorizations, err := s.service.ListAuthorizations()
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, authorizations)
}

func (s *Server) grantAuthorization(c *gin.Context) {
	var req service.AuthorizationInput
	if !bindJSON(c, &req) {
		return
	}
	authorization, err := s.service.GrantAuthorization(actorUserID(c), req)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, authorization)
}

func (s *Server) revokeAuthorization(c *gin.Context) {
	var req service.AuthorizationInput
	if !bindJSON(c, &req) {
		return
	}
	if err := s.service.RevokeAuthorization(actorUserID(c), req); err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, nil)
}

func (s *Server) overview(c *gin.Context) {
	overview, err := s.service.GetOverview()
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, overview)
}

func (s *Server) clientApplications(c *gin.Context) {
	claims := currentClaims(c)
	applications, err := s.service.ListClientApplications(claims.UserID)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, applications)
}

func (s *Server) launchInfo(c *gin.Context) {
	claims := currentClaims(c)
	applicationID := c.Query("applicationId")
	launchInfo, err := s.service.GetLaunchInfo(claims.UserID, applicationID)
	if err != nil {
		fail(c, http.StatusOK, err.Error())
		return
	}
	ok(c, launchInfo)
}
