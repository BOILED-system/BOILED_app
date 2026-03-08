package handler

import (
	"encoding/json"
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/dto"
	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase"
)

// PracticeHandler handles practice-related HTTP requests.
type PracticeHandler struct {
	uc *usecase.PracticeUseCase
}

// NewPracticeHandler creates a new PracticeHandler.
func NewPracticeHandler(uc *usecase.PracticeUseCase) *PracticeHandler {
	return &PracticeHandler{uc: uc}
}

// --- Category ---

// CreateCategory handles POST /practice-categories.
func (h *PracticeHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var req dto.CreatePracticeCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	userID := r.Header.Get("X-User-Id")
	cat := &domain.PracticeCategory{
		CircleID:  req.CircleID,
		Name:      req.Name,
		ParentID:  req.ParentID,
		Order:     req.Order,
		CreatedBy: userID,
	}
	if err := h.uc.CreateCategory(r.Context(), cat); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(cat)
}

// GetCategories handles GET /circles/{circleId}/practice-categories.
func (h *PracticeHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	circleID := r.PathValue("circleId")
	cats, err := h.uc.GetCategories(r.Context(), circleID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cats)
}

// DeleteCategory handles DELETE /practice-categories/{id}.
func (h *PracticeHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.uc.DeleteCategory(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Series ---

// CreateSeries handles POST /practice-series.
func (h *PracticeHandler) CreateSeries(w http.ResponseWriter, r *http.Request) {
	var req dto.CreatePracticeSeriesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	userID := r.Header.Get("X-User-Id")
	series := &domain.PracticeSeries{
		CircleID:   req.CircleID,
		CategoryID: req.CategoryID,
		Name:       req.Name,
		DayOfWeek:  req.DayOfWeek,
		StartTime:  req.StartTime,
		Location:   req.Location,
		Fee:        req.Fee,
		CreatedBy:  userID,
	}
	if err := h.uc.CreateSeries(r.Context(), series); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(series)
}

// GetSeriesByCircle handles GET /circles/{circleId}/practice-series.
func (h *PracticeHandler) GetSeriesByCircle(w http.ResponseWriter, r *http.Request) {
	circleID := r.PathValue("circleId")
	series, err := h.uc.GetSeriesByCircle(r.Context(), circleID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(series)
}

// GetSeriesDetail handles GET /practice-series/{id}.
func (h *PracticeHandler) GetSeriesDetail(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID := r.Header.Get("X-User-Id")
	detail, err := h.uc.GetSeriesDetail(r.Context(), id, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(detail)
}

// --- Session ---

// CreateSession handles POST /practice-series/{id}/sessions.
func (h *PracticeHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	seriesID := r.PathValue("id")
	var req dto.CreatePracticeSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	session := &domain.PracticeSession{
		SeriesID: seriesID,
		Date:     req.Date,
		Note:     req.Note,
	}
	if err := h.uc.CreateSession(r.Context(), session); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(session)
}

// --- RSVP ---

// SubmitRSVP handles POST /practice-sessions/{id}/rsvp.
func (h *PracticeHandler) SubmitRSVP(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("id")
	userID := r.Header.Get("X-User-Id")
	var req dto.PracticeRSVPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	rsvp := &domain.PracticeRSVP{
		SessionID: sessionID,
		UserID:    userID,
		Status:    domain.PracticeRSVPStatus(req.Status),
	}
	if err := h.uc.SubmitRSVP(r.Context(), rsvp); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rsvp)
}

// BulkRSVP handles POST /practice-series/{id}/bulk-rsvp.
func (h *PracticeHandler) BulkRSVP(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-Id")
	var req dto.BulkPracticeRSVPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var rsvps []*domain.PracticeRSVP
	for _, item := range req.RSVPs {
		rsvps = append(rsvps, &domain.PracticeRSVP{
			SessionID: item.SessionID,
			UserID:    userID,
			Status:    domain.PracticeRSVPStatus(item.Status),
		})
	}

	if err := h.uc.BulkRSVP(r.Context(), rsvps); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// GetSessionRSVPs handles GET /practice-sessions/{id}/rsvps.
func (h *PracticeHandler) GetSessionRSVPs(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("id")
	rsvps, err := h.uc.GetSessionRSVPs(r.Context(), sessionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rsvps)
}

// --- Settlement ---

// CreateSettlements handles POST /practice-series/{id}/settlements.
func (h *PracticeHandler) CreateSettlements(w http.ResponseWriter, r *http.Request) {
	seriesID := r.PathValue("id")

	// Parse optional month from query or body?
	// For simplicity, let's say body: { "month": "2024-04" }
	var req struct {
		Month string `json:"month"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// If no body or invalid, maybe default to current month?
		// Or return error. Let's return error for now to be safe.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.uc.CreateSettlements(r.Context(), seriesID, req.Month); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated) // 201 Created
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// UpdateSeries handles PUT /practice-series/{id}.
func (h *PracticeHandler) UpdateSeries(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req dto.CreatePracticeSeriesRequest // Reusing Create request DTO for simplicity
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	// Create domain object from req
	updateData := &domain.PracticeSeries{
		Name:      req.Name,
		DayOfWeek: req.DayOfWeek,
		StartTime: req.StartTime,
		Location:  req.Location,
		Fee:       req.Fee,
	}
	updated, err := h.uc.UpdateSeries(r.Context(), id, updateData)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

// DeleteSeries handles DELETE /practice-series/{id}.
func (h *PracticeHandler) DeleteSeries(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.uc.DeleteSeries(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
