// Package router sets up FE-compatible API routes.
package router

import (
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/handler"
)

// SetupFE configures all FE-compatible routes under /api prefix.
func SetupFE(mux *http.ServeMux, feHandler *handler.FEHandler) {
	// Auth
	mux.HandleFunc("POST /api/login", feHandler.Login)

	// Users
	mux.HandleFunc("GET /api/users", feHandler.GetAllUsers)
	mux.HandleFunc("GET /api/users/{memberId}", feHandler.GetUser)

	// Practice Sessions
	mux.HandleFunc("GET /api/practice-sessions", feHandler.GetPracticeSessions)
	mux.HandleFunc("POST /api/practice-sessions", feHandler.CreatePracticeSession)
	mux.HandleFunc("GET /api/practice-sessions/{id}", feHandler.GetPracticeSession)
	mux.HandleFunc("PUT /api/practice-sessions/{id}", feHandler.UpdatePracticeSession)
	mux.HandleFunc("DELETE /api/practice-sessions/{id}", feHandler.DeletePracticeSession)

	// Practice RSVPs
	mux.HandleFunc("GET /api/practice-sessions/{id}/rsvps", feHandler.GetSessionRSVPs)
	mux.HandleFunc("POST /api/practice-sessions/{id}/rsvps", feHandler.SubmitRSVP)
	mux.HandleFunc("GET /api/practice-sessions/{id}/rsvps/{memberId}", feHandler.GetMyRSVP)
	mux.HandleFunc("GET /api/members/{memberId}/rsvps", feHandler.GetMyRSVPs)

	// Number Rosters
	mux.HandleFunc("GET /api/number-rosters", feHandler.GetNumberRosters)
	mux.HandleFunc("POST /api/number-rosters", feHandler.CreateNumberRoster)
	mux.HandleFunc("PUT /api/number-rosters/{id}", feHandler.UpdateNumberRoster)
	mux.HandleFunc("DELETE /api/number-rosters/{id}", feHandler.DeleteNumberRoster)

	// Events
	mux.HandleFunc("GET /api/events", feHandler.GetEvents)
	mux.HandleFunc("POST /api/events", feHandler.CreateEventFE)
	mux.HandleFunc("GET /api/events/{id}", feHandler.GetEvent)
	mux.HandleFunc("PUT /api/events/{id}", feHandler.UpdateEventFE)
	mux.HandleFunc("DELETE /api/events/{id}", feHandler.DeleteEventFE)

	// Settlements
	mux.HandleFunc("GET /api/settlements", feHandler.GetSettlements)
	mux.HandleFunc("POST /api/settlements", feHandler.CreateSettlementFE)
	mux.HandleFunc("GET /api/settlements/{id}/payments", feHandler.GetSettlementPayments)
	mux.HandleFunc("POST /api/settlements/{id}/report-payment", feHandler.ReportPaymentFE)
	mux.HandleFunc("PUT /api/settlements/{id}/payment-status", feHandler.UpdatePaymentStatusFE)
	mux.HandleFunc("PUT /api/settlements/{id}", feHandler.UpdateSettlementFE)
	mux.HandleFunc("DELETE /api/settlements/{id}", feHandler.DeleteSettlementFE)
}
