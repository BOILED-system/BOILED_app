package handler

import (
	"encoding/json"
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/dto"
	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase"
)

// FEHandler handles all FE-compatible HTTP requests.
type FEHandler struct {
	interactor *usecase.FEInteractor
}

func NewFEHandler(i *usecase.FEInteractor) *FEHandler {
	return &FEHandler{interactor: i}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// ===== Users =====

// Login handles POST /api/login
func (h *FEHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MemberID string `json:"memberId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	user, err := h.interactor.Login(r.Context(), req.MemberID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// GetUser handles GET /api/users/{memberId}
func (h *FEHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	memberID := r.PathValue("memberId")
	user, err := h.interactor.GetUser(r.Context(), memberID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// GetAllUsers handles GET /api/users
func (h *FEHandler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.interactor.GetAllUsers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, users)
}

// ===== Practice Sessions =====

// GetPracticeSessions handles GET /api/practice-sessions
func (h *FEHandler) GetPracticeSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := h.interactor.GetPracticeSessions(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, sessions)
}

// GetPracticeSession handles GET /api/practice-sessions/{id}
func (h *FEHandler) GetPracticeSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	session, err := h.interactor.GetPracticeSession(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	writeJSON(w, http.StatusOK, session)
}

// CreatePracticeSession handles POST /api/practice-sessions
func (h *FEHandler) CreatePracticeSession(w http.ResponseWriter, r *http.Request) {
	var req dto.CreatePracticeSessionFERequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	s := &domain.FEPracticeSession{
		Name:              req.Name,
		Date:              req.Date,
		StartTime:         req.StartTime,
		EndTime:           req.EndTime,
		Location:          req.Location,
		Note:              req.Note,
		Type:              req.Type,
		TargetType:        req.TargetType,
		TargetGenres:      req.TargetGenres,
		TargetGenerations: req.TargetGenerations,
		TargetNumberID:      req.TargetNumberID,
		TargetMemberIDs:     req.TargetMemberIDs,
		AdditionalMemberIDs: req.AdditionalMemberIDs,
		ExcludedMemberIDs:   req.ExcludedMemberIDs,
	}
	if err := h.interactor.CreatePracticeSession(r.Context(), s); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, s)
}

// UpdatePracticeSession handles PUT /api/practice-sessions/{id}
func (h *FEHandler) UpdatePracticeSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.interactor.UpdatePracticeSession(r.Context(), id, data); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeletePracticeSession handles DELETE /api/practice-sessions/{id}
func (h *FEHandler) DeletePracticeSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.interactor.DeletePracticeSession(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===== Practice RSVPs =====

// SubmitRSVP handles POST /api/practice-sessions/{id}/rsvps
func (h *FEHandler) SubmitRSVP(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("id")
	var req dto.SubmitRSVPFERequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	rsvp := &domain.FEPracticeRSVP{
		MemberID:   req.MemberID,
		Name:       req.Name,
		Genre:      req.Genre,
		Generation: req.Generation,
		Status:     req.Status,
		Note:       req.Note,
	}
	if err := h.interactor.SubmitRSVP(r.Context(), sessionID, rsvp); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rsvp)
}

// GetMyRSVP handles GET /api/practice-sessions/{id}/rsvps/{memberId}
func (h *FEHandler) GetMyRSVP(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("id")
	memberID := r.PathValue("memberId")
	rsvp, err := h.interactor.GetMyRSVP(r.Context(), sessionID, memberID)
	if err != nil {
		writeJSON(w, http.StatusOK, nil) // not found → null
		return
	}
	writeJSON(w, http.StatusOK, rsvp)
}

// GetMyRSVPs handles GET /api/members/{memberId}/rsvps
func (h *FEHandler) GetMyRSVPs(w http.ResponseWriter, r *http.Request) {
	memberID := r.PathValue("memberId")
	rsvps, err := h.interactor.GetMyRSVPs(r.Context(), memberID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rsvps)
}

// GetSessionRSVPs handles GET /api/practice-sessions/{id}/rsvps
func (h *FEHandler) GetSessionRSVPs(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("id")
	rsvps, err := h.interactor.GetSessionRSVPs(r.Context(), sessionID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rsvps)
}

// ===== Number Rosters =====

// GetNumberRosters handles GET /api/number-rosters
func (h *FEHandler) GetNumberRosters(w http.ResponseWriter, r *http.Request) {
	rosters, err := h.interactor.GetNumberRosters(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rosters)
}

// CreateNumberRoster handles POST /api/number-rosters
func (h *FEHandler) CreateNumberRoster(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateNumberRosterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	roster := &domain.NumberRoster{
		Name:      req.Name,
		MemberIDs: req.MemberIDs,
	}
	if err := h.interactor.CreateNumberRoster(r.Context(), roster); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, roster)
}

// UpdateNumberRoster handles PUT /api/number-rosters/{id}
func (h *FEHandler) UpdateNumberRoster(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.interactor.UpdateNumberRoster(r.Context(), id, data); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeleteNumberRoster handles DELETE /api/number-rosters/{id}
func (h *FEHandler) DeleteNumberRoster(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.interactor.DeleteNumberRoster(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===== Events =====

// GetEvents handles GET /api/events
func (h *FEHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
	events, err := h.interactor.GetEvents(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, events)
}

// GetEvent handles GET /api/events/{id}
func (h *FEHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	event, err := h.interactor.GetEvent(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "event not found")
		return
	}
	writeJSON(w, http.StatusOK, event)
}

// CreateEventFE handles POST /api/events
func (h *FEHandler) CreateEventFE(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateEventFERequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	e := &domain.FEEvent{
		Title:           req.Title,
		Date:            req.Date,
		Location:        req.Location,
		MeetingTime:     req.MeetingTime,
		MeetingLocation: req.MeetingLocation,
		Timetable:       req.Timetable,
		Note:            req.Note,
		ImageURLs:       []string{},
	}
	if err := h.interactor.CreateEvent(r.Context(), e); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

// UpdateEventFE handles PUT /api/events/{id}
func (h *FEHandler) UpdateEventFE(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.interactor.UpdateEvent(r.Context(), id, data); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeleteEventFE handles DELETE /api/events/{id}
func (h *FEHandler) DeleteEventFE(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.interactor.DeleteEvent(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===== Settlements =====

// GetSettlements handles GET /api/settlements
func (h *FEHandler) GetSettlements(w http.ResponseWriter, r *http.Request) {
	settlements, err := h.interactor.GetSettlements(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, settlements)
}

// CreateSettlementFE handles POST /api/settlements
func (h *FEHandler) CreateSettlementFE(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateSettlementFERequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	s := &domain.FESettlement{
		Title:                req.Title,
		Amount:               req.Amount,
		DueDate:              req.DueDate,
		Note:                 req.Note,
		CreatedBy:            req.CreatedBy,
		CreatedByName:        req.CreatedByName,
		TargetType:           req.TargetType,
		TargetGenres:         req.TargetGenres,
		TargetGenerations:    req.TargetGenerations,
		TargetNumberID:       req.TargetNumberID,
		TargetMemberIDs:      req.TargetMemberIDs,
		AdditionalMemberIDs:  req.AdditionalMemberIDs,
		ExcludedMemberIDs:    req.ExcludedMemberIDs,
		ResolvedMemberIDs:    req.ResolvedMemberIDs,
		PaymentMethods:       req.PaymentMethods,
		BankInfo:             req.BankInfo,
		PayPayInfo:           req.PayPayInfo,
		CashCollectors:       req.CashCollectors,
		RequiresConfirmation: req.RequiresConfirmation,
	}
	payments := make([]domain.FEPaymentRecord, len(req.Payments))
	for i, p := range req.Payments {
		payments[i] = domain.FEPaymentRecord{
			MemberID:    p.MemberID,
			Name:        p.Name,
			Status:      "unpaid",
			ConfirmedAt: nil,
		}
	}
	if err := h.interactor.CreateSettlement(r.Context(), s, payments); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, s)
}

// GetSettlementPayments handles GET /api/settlements/{id}/payments
func (h *FEHandler) GetSettlementPayments(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	payments, err := h.interactor.GetSettlementPayments(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, payments)
}

// ReportPaymentFE handles POST /api/settlements/{id}/report-payment
func (h *FEHandler) ReportPaymentFE(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req dto.ReportPaymentFERequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.interactor.ReportPayment(r.Context(), id, req.MemberID, req.Method, req.RequiresConfirmation, req.CashCollectorID, req.CashCollectorName); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// UpdatePaymentStatusFE handles PUT /api/settlements/{id}/payment-status
func (h *FEHandler) UpdatePaymentStatusFE(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req dto.UpdatePaymentStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.interactor.UpdatePaymentStatus(r.Context(), id, req.MemberID, req.Status); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// UpdateSettlementFE handles PUT /api/settlements/{id}
func (h *FEHandler) UpdateSettlementFE(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.interactor.UpdateSettlement(r.Context(), id, data); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DeleteSettlementFE handles DELETE /api/settlements/{id}
func (h *FEHandler) DeleteSettlementFE(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.interactor.DeleteSettlement(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
