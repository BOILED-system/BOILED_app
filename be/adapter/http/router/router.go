// Package router sets up HTTP routes.
package router

import (
	"net/http"

	"github.com/noa/circle-app/api/adapter/http/handler"
)

// Setup configures all routes.
func Setup(
	circleHandler *handler.CircleHandler,
	eventHandler *handler.EventHandler,
	announcementHandler *handler.AnnouncementHandler,
	rsvpHandler *handler.RSVPHandler,
	settlementHandler *handler.SettlementHandler,
	chatHandler *handler.ChatHandler,
	userHandler *handler.UserHandler,
	practiceHandler *handler.PracticeHandler,
) *http.ServeMux {
	mux := http.NewServeMux()

	// Root: simple message (avoid 404 when opening URL in browser)
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message":"Circle API","health":"/health"}`))
	})
	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// User routes
	mux.HandleFunc("POST /users", userHandler.CreateOrUpdate)
	mux.HandleFunc("GET /users/{userId}", userHandler.Get)

	// Circle routes
	mux.HandleFunc("POST /circles", circleHandler.Create)
	mux.HandleFunc("GET /circles/{circleId}", circleHandler.Get)
	mux.HandleFunc("POST /circles/{circleId}/members", circleHandler.AddMember)
	mux.HandleFunc("GET /circles/{circleId}/members", circleHandler.GetMembers)
	mux.HandleFunc("GET /circles/{circleId}/events", eventHandler.GetByCircle)
	mux.HandleFunc("GET /circles/{circleId}/announcements", announcementHandler.GetByCircle)
	mux.HandleFunc("GET /circles/{circleId}/practice-categories", practiceHandler.GetCategories)
	mux.HandleFunc("GET /circles/{circleId}/practice-series", practiceHandler.GetSeriesByCircle)

	// Event routes
	mux.HandleFunc("POST /events", eventHandler.Create)
	mux.HandleFunc("GET /events/{eventId}", eventHandler.Get)
	mux.HandleFunc("PUT /events/{eventId}", eventHandler.Update)
	mux.HandleFunc("DELETE /events/{eventId}", eventHandler.Delete)
	mux.HandleFunc("GET /events/{eventId}/announcements", announcementHandler.GetByEvent)
	mux.HandleFunc("POST /events/{eventId}/rsvp", rsvpHandler.Submit)
	mux.HandleFunc("GET /events/{eventId}/rsvp/me", rsvpHandler.GetMy)
	mux.HandleFunc("GET /events/{eventId}/rsvps", rsvpHandler.GetByEvent)
	mux.HandleFunc("GET /events/{eventId}/settlements", settlementHandler.GetByEvent)

	// Announcement routes
	mux.HandleFunc("POST /announcements", announcementHandler.Create)
	mux.HandleFunc("GET /announcements/{id}", announcementHandler.Get)
	mux.HandleFunc("PUT /announcements/{id}", announcementHandler.Update)
	mux.HandleFunc("DELETE /announcements/{id}", announcementHandler.Delete)

	// Settlement routes
	mux.HandleFunc("POST /settlements", settlementHandler.Create)
	mux.HandleFunc("GET /settlements/me", settlementHandler.GetMy)
	mux.HandleFunc("POST /settlements/{id}/report", settlementHandler.ReportPayment)
	mux.HandleFunc("PUT /settlements/{id}", settlementHandler.Update)

	// Practice routes
	mux.HandleFunc("POST /practice-categories", practiceHandler.CreateCategory)
	mux.HandleFunc("DELETE /practice-categories/{id}", practiceHandler.DeleteCategory)
	mux.HandleFunc("POST /practice-series", practiceHandler.CreateSeries)
	mux.HandleFunc("GET /practice-series/{id}", practiceHandler.GetSeriesDetail)
	mux.HandleFunc("PUT /practice-series/{id}", practiceHandler.UpdateSeries)
	mux.HandleFunc("DELETE /practice-series/{id}", practiceHandler.DeleteSeries)
	mux.HandleFunc("POST /practice-series/{id}/sessions", practiceHandler.CreateSession)
	mux.HandleFunc("POST /practice-series/{id}/bulk-rsvp", practiceHandler.BulkRSVP)
	mux.HandleFunc("POST /practice-series/{id}/settlements", practiceHandler.CreateSettlements) // Added
	mux.HandleFunc("POST /practice-sessions/{id}/rsvp", practiceHandler.SubmitRSVP)
	mux.HandleFunc("GET /practice-sessions/{id}/rsvps", practiceHandler.GetSessionRSVPs)

	// AI Chat routes
	mux.HandleFunc("POST /ai/chat", chatHandler.Ask)

	return mux
}
