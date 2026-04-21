// Package domain contains frontend-compatible entities.
// These match the data model used by the Next.js frontend.
package domain

// TargetType specifies how a practice session or settlement targets members.
type TargetType string

const (
	TargetGenreGeneration TargetType = "genre_generation"
	TargetNumber          TargetType = "number"
	TargetIndividual      TargetType = "individual"
)

// FEPracticeSession represents a flat practice session matching frontend schema.
type FEPracticeSession struct {
	ID                string   `json:"id" firestore:"id"`
	Name              string   `json:"name" firestore:"name"`
	Date              string   `json:"date" firestore:"date"` // "2025-04-15"
	StartTime         string   `json:"startTime" firestore:"startTime"`
	EndTime           string   `json:"endTime" firestore:"endTime"`
	Location          string   `json:"location" firestore:"location"`
	Note              string   `json:"note" firestore:"note"`
	Type              string   `json:"type" firestore:"type"` // "regular" | "event"
	TargetType        string   `json:"targetType" firestore:"targetType"`
	TargetGenres      []string `json:"targetGenres" firestore:"targetGenres"`
	TargetGenerations []int    `json:"targetGenerations" firestore:"targetGenerations"`
	TargetNumberID    string   `json:"targetNumberId" firestore:"targetNumberId"`
	TargetMemberIDs      []string `json:"targetMemberIds" firestore:"targetMemberIds"`
	AdditionalMemberIDs  []string `json:"additionalMemberIds" firestore:"additionalMemberIds"`
	ExcludedMemberIDs    []string `json:"excludedMemberIds" firestore:"excludedMemberIds"`
	CreatedAt            any      `json:"createdAt" firestore:"createdAt"`
}

// FEPracticeRSVP represents a practice attendance record matching frontend schema.
type FEPracticeRSVP struct {
	MemberID   string `json:"memberId" firestore:"memberId"`
	Name       string `json:"name" firestore:"name"`
	Genre      string `json:"genre" firestore:"genre"`
	Generation int    `json:"generation" firestore:"generation"`
	Status     string `json:"status" firestore:"status"` // GO | NO | LATE | EARLY
	Note       string `json:"note" firestore:"note"`
	UpdatedAt  any    `json:"updatedAt" firestore:"updatedAt"`
}

// FEUser represents a user matching frontend schema.
type FEUser struct {
	MemberID   string `json:"memberId" firestore:"memberId"`
	Name       string `json:"name" firestore:"name"`
	Role       string `json:"role" firestore:"role"` // "admin" | "member"
	Genre      string `json:"genre" firestore:"genre"`
	Generation int    `json:"generation" firestore:"generation"`
	UpdatedAt  any    `json:"updatedAt,omitempty" firestore:"updatedAt,omitempty"`
}

// NumberRoster represents a group roster for targeting practices.
type NumberRoster struct {
	ID        string   `json:"id" firestore:"id"`
	Name      string   `json:"name" firestore:"name"`
	MemberIDs []string `json:"memberIds" firestore:"memberIds"`
	CreatedAt any      `json:"createdAt" firestore:"createdAt"`
}

// CashCollector represents a person who can collect cash payments.
type CashCollector struct {
	MemberID   string `json:"memberId" firestore:"memberId"`
	Name       string `json:"name" firestore:"name"`
	Genre      string `json:"genre,omitempty" firestore:"genre,omitempty"`
	Generation int    `json:"generation,omitempty" firestore:"generation,omitempty"`
}

// FESettlement represents a settlement matching frontend schema.
type FESettlement struct {
	ID                   string          `json:"id" firestore:"id"`
	Title                string          `json:"title" firestore:"title"`
	Amount               int             `json:"amount" firestore:"amount"`
	DueDate              string          `json:"dueDate" firestore:"dueDate"`
	Note                 string          `json:"note" firestore:"note"`
	CreatedBy            string          `json:"createdBy" firestore:"createdBy"`
	CreatedByName        string          `json:"createdByName" firestore:"createdByName"`
	TargetType           string          `json:"targetType" firestore:"targetType"`
	TargetGenres         []string        `json:"targetGenres" firestore:"targetGenres"`
	TargetGenerations    []int           `json:"targetGenerations" firestore:"targetGenerations"`
	TargetNumberID       string          `json:"targetNumberId" firestore:"targetNumberId"`
	TargetMemberIDs      []string        `json:"targetMemberIds" firestore:"targetMemberIds"`
	AdditionalMemberIDs  []string        `json:"additionalMemberIds" firestore:"additionalMemberIds"`
	ExcludedMemberIDs    []string        `json:"excludedMemberIds" firestore:"excludedMemberIds"`
	ResolvedMemberIDs    []string        `json:"resolvedMemberIds" firestore:"resolvedMemberIds"`
	PaymentMethods       []string        `json:"paymentMethods" firestore:"paymentMethods"`
	BankInfo             string          `json:"bankInfo" firestore:"bankInfo"`
	PayPayInfo           string          `json:"paypayInfo" firestore:"paypayInfo"`
	CashCollectors       []CashCollector `json:"cashCollectors" firestore:"cashCollectors"`
	RequiresConfirmation bool            `json:"requiresConfirmation" firestore:"requiresConfirmation"`
	CreatedAt            any             `json:"createdAt" firestore:"createdAt"`
}

// FEPaymentRecord represents individual payment status matching frontend schema.
type FEPaymentRecord struct {
	MemberID          string `json:"memberId" firestore:"memberId"`
	Name              string `json:"name" firestore:"name"`
	Status            string `json:"status" firestore:"status"` // unpaid | reported | confirmed
	ReportedMethod    string `json:"reportedMethod,omitempty" firestore:"reportedMethod,omitempty"`
	CashCollectorID   string `json:"cashCollectorId,omitempty" firestore:"cashCollectorId,omitempty"`
	CashCollectorName string `json:"cashCollectorName,omitempty" firestore:"cashCollectorName,omitempty"`
	ReportedAt        any    `json:"reportedAt,omitempty" firestore:"reportedAt,omitempty"`
	ConfirmedAt       any    `json:"confirmedAt" firestore:"confirmedAt"`
}

// TimetableRow represents a timetable entry for an event.
type TimetableRow struct {
	Time        string `json:"time" firestore:"time"`
	Description string `json:"description" firestore:"description"`
}

// FEEvent represents an event matching frontend schema.
type FEEvent struct {
	ID                string         `json:"id" firestore:"id"`
	Title             string         `json:"title" firestore:"title"`
	Date              string         `json:"date" firestore:"date"`
	Location          string         `json:"location" firestore:"location"`
	MeetingTime       string         `json:"meetingTime" firestore:"meetingTime"`
	MeetingLocation   string         `json:"meetingLocation" firestore:"meetingLocation"`
	Timetable         []TimetableRow `json:"timetable" firestore:"timetable"`
	TimetableImageURL string         `json:"timetableImageUrl,omitempty" firestore:"timetableImageUrl,omitempty"`
	Note              string         `json:"note" firestore:"note"`
	ImageURLs         []string       `json:"imageUrls" firestore:"imageUrls"`
	CreatedAt         any            `json:"createdAt" firestore:"createdAt"`
}
