package handler

import (
	"encoding/json"
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/dto"
	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase"
)

// RSVPHandler handles RSVP-related HTTP requests.
type RSVPHandler struct {
	interactor *usecase.RSVPInteractor
}

// NewRSVPHandler creates a new RSVPHandler.
func NewRSVPHandler(i *usecase.RSVPInteractor) *RSVPHandler {
	return &RSVPHandler{interactor: i}
}

// getUserID extracts user ID from request header.
func getUserID(r *http.Request) string {
	return r.Header.Get("X-User-Id")
}

// Submit handles POST /events/{eventId}/rsvp.
func (h *RSVPHandler) Submit(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		http.Error(w, "X-User-Id header required", http.StatusUnauthorized)
		return
	}

	eventID := r.PathValue("eventId")

	var req dto.RSVPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	status := domain.RSVPStatus(req.Status)
	if status != domain.RSVPGo && status != domain.RSVPNo && status != domain.RSVPLate && status != domain.RSVPEarly {
		http.Error(w, "invalid status: must be GO, NO, LATE, or EARLY", http.StatusBadRequest)
		return
	}

	rsvp, err := h.interactor.SubmitRSVP(r.Context(), eventID, userID, status, req.Note)
	if err != nil {
		if err == domain.ErrForbidden {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rsvp)
}

// GetMy handles GET /events/{eventId}/rsvp/me.
func (h *RSVPHandler) GetMy(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		http.Error(w, "X-User-Id header required", http.StatusUnauthorized)
		return
	}

	eventID := r.PathValue("eventId")

	rsvp, err := h.interactor.GetMyRSVP(r.Context(), eventID, userID)
	if err != nil {
		if err == domain.ErrForbidden {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if rsvp == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("null"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rsvp)
}

// GetByEvent handles GET /events/{eventId}/rsvps.
func (h *RSVPHandler) GetByEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")

	rsvps, err := h.interactor.GetEventRSVPs(r.Context(), eventID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if rsvps == nil {
		rsvps = []*domain.RSVP{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rsvps)
}
