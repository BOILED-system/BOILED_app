package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/noa/circle-app/api/adapter/http/dto"
	"github.com/noa/circle-app/api/usecase"
)

// AnnouncementHandler handles announcement-related HTTP requests.
type AnnouncementHandler struct {
	interactor *usecase.AnnouncementInteractor
}

// NewAnnouncementHandler creates a new AnnouncementHandler.
func NewAnnouncementHandler(i *usecase.AnnouncementInteractor) *AnnouncementHandler {
	return &AnnouncementHandler{interactor: i}
}

// Create handles POST /announcements.
func (h *AnnouncementHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	announcement, err := h.interactor.CreateAnnouncement(
		r.Context(),
		req.CircleID,
		req.EventID,
		req.Title,
		req.Body,
		req.CreatedBy,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(announcement)
}

// Get handles GET /announcements/{id}.
func (h *AnnouncementHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	announcement, err := h.interactor.GetAnnouncement(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"announcement": announcement,
		// For now, return empty attendance/payments to match frontend expectation
		// Frontend expects { announcement, attendance, payments }
		"attendance": nil,
		"payments":   []interface{}{},
	})
}

// GetByEvent handles GET /events/{eventId}/announcements.
func (h *AnnouncementHandler) GetByEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")
	announcements, err := h.interactor.GetByEvent(r.Context(), eventID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(announcements)
}

// GetByCircle handles GET /circles/{circleId}/announcements.
func (h *AnnouncementHandler) GetByCircle(w http.ResponseWriter, r *http.Request) {
	circleID := r.PathValue("circleId")
	limitStr := r.URL.Query().Get("limit")
	limit := 10
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	announcements, err := h.interactor.GetByCircle(r.Context(), circleID, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(announcements)
}

// Update handles PUT /announcements/{id}.
func (h *AnnouncementHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Title string `json:"title"`
		Body  string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	announcement, err := h.interactor.UpdateAnnouncement(r.Context(), id, req.Title, req.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(announcement)
}

// Delete handles DELETE /announcements/{id}.
func (h *AnnouncementHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.interactor.DeleteAnnouncement(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
