package handler

import (
	"encoding/json"
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/dto"
	"github.com/noa/circle-app/api/usecase"
)

// ChatHandler handles AI chat HTTP requests.
type ChatHandler struct {
	interactor *usecase.ChatInteractor
}

// NewChatHandler creates a new ChatHandler.
func NewChatHandler(i *usecase.ChatInteractor) *ChatHandler {
	return &ChatHandler{interactor: i}
}

// Ask handles POST /ai/chat.
func (h *ChatHandler) Ask(w http.ResponseWriter, r *http.Request) {
	var req dto.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.CircleID == "" {
		http.Error(w, "circleId is required", http.StatusBadRequest)
		return
	}
	if req.Message == "" {
		http.Error(w, "message is required", http.StatusBadRequest)
		return
	}

	response, err := h.interactor.Ask(r.Context(), req.CircleID, req.Message)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
