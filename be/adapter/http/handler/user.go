package handler

import (
	"encoding/json"
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/dto"
	"github.com/noa/circle-app/api/usecase"
)

// UserHandler handles user-related HTTP requests.
type UserHandler struct {
	interactor *usecase.UserInteractor
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(i *usecase.UserInteractor) *UserHandler {
	return &UserHandler{interactor: i}
}

// CreateOrUpdate handles POST /users.
func (h *UserHandler) CreateOrUpdate(w http.ResponseWriter, r *http.Request) {
	var req dto.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	user, err := h.interactor.UpdateUser(
		r.Context(),
		req.ID,
		req.Name,
		req.AvatarURL,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// Get handles GET /users/{userId}.
func (h *UserHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	user, err := h.interactor.GetUser(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
