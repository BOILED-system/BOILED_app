package handler

import (
	"encoding/json"
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/dto"
	"github.com/noa/circle-app/api/usecase"
)

// EventHandler handles event-related HTTP requests.
type EventHandler struct {
	interactor *usecase.EventInteractor
}

// NewEventHandler creates a new EventHandler.
func NewEventHandler(i *usecase.EventInteractor) *EventHandler {
	return &EventHandler{interactor: i}
}

// Create handles POST /events.
func (h *EventHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	event, err := h.interactor.CreateEvent(
		r.Context(),
		req.CircleID,
		req.Title,
		req.StartAt,
		req.Location,
		req.CoverImageURL,
		req.RSVPTargetUserIDs,
		req.CreatedBy,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(event)
}

// Get handles GET /events/{eventId}.
func (h *EventHandler) Get(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")
	event, err := h.interactor.GetEvent(r.Context(), eventID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(event)
}

// GetByCircle handles GET /circles/{circleId}/events.
func (h *EventHandler) GetByCircle(w http.ResponseWriter, r *http.Request) {
	circleID := r.PathValue("circleId")
	events, err := h.interactor.GetEventsByCircle(r.Context(), circleID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// Update handles PUT /events/{eventId}.
func (h *EventHandler) Update(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")
	var req dto.UpdateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	event, err := h.interactor.UpdateEvent(
		r.Context(),
		eventID,
		req.Title,
		req.StartAt,
		req.Location,
		req.CoverImageURL,
		req.RSVPTargetUserIDs,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(event)
}

// Delete handles DELETE /events/{eventId}.
func (h *EventHandler) Delete(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")
	if err := h.interactor.DeleteEvent(r.Context(), eventID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
