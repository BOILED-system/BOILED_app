// Package dto contains Data Transfer Objects for HTTP layer.
package dto

import "time"

// CreateCircleRequest represents request to create a circle.
type CreateCircleRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	LogoURL     string `json:"logoUrl"`
}

// AddMemberRequest represents request to add a member.
type AddMemberRequest struct {
	UserID string `json:"userId"`
	Role   string `json:"role"`
}

// CreateEventRequest represents request to create an event.
type CreateEventRequest struct {
	CircleID          string    `json:"circleId"`
	Title             string    `json:"title"`
	StartAt           time.Time `json:"startAt"`
	Location          string    `json:"location"`
	CoverImageURL     string    `json:"coverImageUrl"`
	RSVPTargetUserIDs []string  `json:"rsvpTargetUserIds"`
	CreatedBy         string    `json:"createdBy"`
}

// CreateAnnouncementRequest represents request to create an announcement.
type CreateAnnouncementRequest struct {
	CircleID  string `json:"circleId"`
	EventID   string `json:"eventId"`
	Title     string `json:"title"`
	Body      string `json:"body"`
	CreatedBy string `json:"createdBy"`
}

// RSVPRequest represents request to submit RSVP.
type RSVPRequest struct {
	Status string `json:"status"` // GO, NO, LATE, EARLY
	Note   string `json:"note"`
}

// CreateSettlementRequest represents request to create a settlement.
type CreateSettlementRequest struct {
	CircleID      string    `json:"circleId"`
	EventID       string    `json:"eventId"`
	Title         string    `json:"title"`
	Amount        int       `json:"amount"`
	DueAt         time.Time `json:"dueAt"`
	TargetUserIDs []string  `json:"targetUserIds"`
	BankInfo      string    `json:"bankInfo"`
	PayPayInfo    string    `json:"paypayInfo"`
}

// ReportPaymentRequest represents request to report a payment.
type ReportPaymentRequest struct {
	Method string `json:"method"` // BANK, PAYPAY
	Note   string `json:"note"`
}

// ChatRequest represents request for AI chat.
type ChatRequest struct {
	CircleID string `json:"circleId"`
	Message  string `json:"message"`
}

// UpdateUserRequest represents request to update user profile.
type UpdateUserRequest struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatarUrl"`
}

// UpdateEventRequest represents request to update an event.
type UpdateEventRequest struct {
	Title             string    `json:"title"`
	StartAt           time.Time `json:"startAt"`
	Location          string    `json:"location"`
	CoverImageURL     string    `json:"coverImageUrl"`
	RSVPTargetUserIDs []string  `json:"rsvpTargetUserIds"`
}

// UpdateSettlementRequest represents request to update a settlement.
type UpdateSettlementRequest struct {
	Title  string    `json:"title"`
	Amount int       `json:"amount"`
	DueAt  time.Time `json:"dueAt"`
}

// CreatePracticeCategoryRequest represents request to create a practice category.
type CreatePracticeCategoryRequest struct {
	CircleID string `json:"circleId"`
	Name     string `json:"name"`
	ParentID string `json:"parentId"` // optional
	Order    int    `json:"order"`
}

// CreatePracticeSeriesRequest represents request to create a practice series.
type CreatePracticeSeriesRequest struct {
	CircleID   string `json:"circleId"`
	CategoryID string `json:"categoryId"`
	Name       string `json:"name"`
	DayOfWeek  int    `json:"dayOfWeek"`
	StartTime  string `json:"startTime"`
	Location   string `json:"location"`
	Fee        int    `json:"fee"`
}

// CreatePracticeSessionRequest represents request to create a practice session.
type CreatePracticeSessionRequest struct {
	Date time.Time `json:"date"`
	Note string    `json:"note"`
}

// PracticeRSVPRequest represents request to submit practice RSVP.
type PracticeRSVPRequest struct {
	Status string `json:"status"` // GO, NO
}

// BulkPracticeRSVPItem represents a single item in bulk RSVP.
type BulkPracticeRSVPItem struct {
	SessionID string `json:"sessionId"`
	Status    string `json:"status"` // GO, NO
}

// BulkPracticeRSVPRequest represents request to bulk submit practice RSVPs.
type BulkPracticeRSVPRequest struct {
	RSVPs []BulkPracticeRSVPItem `json:"rsvps"`
}
