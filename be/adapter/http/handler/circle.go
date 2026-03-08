// Package handler provides HTTP handlers.
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/dto"
	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase"
)

// CircleHandler handles circle-related HTTP requests.
type CircleHandler struct {
	interactor *usecase.CircleInteractor
}

// NewCircleHandler creates a new CircleHandler.
func NewCircleHandler(i *usecase.CircleInteractor) *CircleHandler {
	return &CircleHandler{interactor: i}
}

// Create handles POST /circles.
func (h *CircleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateCircleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	circle, err := h.interactor.CreateCircle(r.Context(), req.Name, req.Description, req.LogoURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(circle)
}

// Get handles GET /circles/{circleId}.
func (h *CircleHandler) Get(w http.ResponseWriter, r *http.Request) {
	circleID := r.PathValue("circleId")
	circle, err := h.interactor.GetCircle(r.Context(), circleID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(circle)
}

// AddMember handles POST /circles/{circleId}/members.
func (h *CircleHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	circleID := r.PathValue("circleId")

	var req dto.AddMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	role := domain.MemberRole(req.Role)
	if role != domain.RoleAdmin && role != domain.RoleMember {
		role = domain.RoleMember
	}

	membership, err := h.interactor.AddMember(r.Context(), circleID, req.UserID, role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(membership)
}

// GetMembers handles GET /circles/{circleId}/members.
func (h *CircleHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
	circleID := r.PathValue("circleId")

	members, err := h.interactor.GetMembers(r.Context(), circleID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}
