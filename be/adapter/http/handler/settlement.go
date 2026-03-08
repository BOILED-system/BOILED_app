package handler

import (
	"encoding/json"
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/dto"
	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase"
)

// SettlementHandler handles settlement-related HTTP requests.
type SettlementHandler struct {
	interactor *usecase.SettlementInteractor
}

// NewSettlementHandler creates a new SettlementHandler.
func NewSettlementHandler(i *usecase.SettlementInteractor) *SettlementHandler {
	return &SettlementHandler{interactor: i}
}

// Create handles POST /settlements.
func (h *SettlementHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateSettlementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	settlement, err := h.interactor.CreateSettlement(
		r.Context(),
		req.CircleID,
		req.EventID,
		req.Title,
		req.Amount,
		req.DueAt,
		req.TargetUserIDs,
		req.BankInfo,
		req.PayPayInfo,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(settlement)
}

// GetByEvent handles GET /events/{eventId}/settlements.
func (h *SettlementHandler) GetByEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("eventId")
	settlements, err := h.interactor.GetByEvent(r.Context(), eventID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settlements)
}

// GetMy handles GET /settlements/me.
func (h *SettlementHandler) GetMy(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		http.Error(w, "X-User-Id header required", http.StatusUnauthorized)
		return
	}

	settlements, err := h.interactor.GetMySettlements(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Separate into unpaid and paid
	type Response struct {
		Unpaid []usecase.SettlementWithPayment `json:"unpaid"`
		Paid   []usecase.SettlementWithPayment `json:"paid"`
	}

	resp := Response{
		Unpaid: make([]usecase.SettlementWithPayment, 0),
		Paid:   make([]usecase.SettlementWithPayment, 0),
	}

	for _, s := range settlements {
		if s.Payment != nil && s.Payment.Status != domain.PaymentUnpaid {
			resp.Paid = append(resp.Paid, s)
		} else {
			resp.Unpaid = append(resp.Unpaid, s)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// ReportPayment handles POST /settlements/{id}/report.
func (h *SettlementHandler) ReportPayment(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		http.Error(w, "X-User-Id header required", http.StatusUnauthorized)
		return
	}

	settlementID := r.PathValue("id")

	var req dto.ReportPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	method := domain.PaymentMethod(req.Method)
	if method != domain.PaymentMethodBank && method != domain.PaymentMethodPayPay {
		http.Error(w, "invalid method: must be BANK or PAYPAY", http.StatusBadRequest)
		return
	}

	payment, err := h.interactor.ReportPayment(r.Context(), settlementID, userID, method, req.Note)
	if err != nil {
		if err == domain.ErrForbidden {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		if err == domain.ErrNotFound {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payment)
}

// Update handles PUT /settlements/{id}.
func (h *SettlementHandler) Update(w http.ResponseWriter, r *http.Request) {
	settlementID := r.PathValue("id")

	var req dto.UpdateSettlementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	settlement, err := h.interactor.UpdateSettlement(r.Context(), settlementID, req.Title, req.Amount, req.DueAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settlement)
}
