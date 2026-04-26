// Package dto contains FE-compatible request/response DTOs.
package dto

import "github.com/noa/circle-app/api/domain"

// ===== Practice Sessions =====

type CreatePracticeSessionFERequest struct {
	Name              string   `json:"name"`
	Date              string   `json:"date"`
	StartTime         string   `json:"startTime"`
	EndTime           string   `json:"endTime"`
	Location          string   `json:"location"`
	Note              string   `json:"note"`
	Type              string   `json:"type"`
	TargetType        string   `json:"targetType"`
	TargetGenres      []string `json:"targetGenres"`
	TargetGenerations []int    `json:"targetGenerations"`
	TargetNumberID      string   `json:"targetNumberId"`
	TargetMemberIDs     []string `json:"targetMemberIds"`
	AdditionalMemberIDs []string `json:"additionalMemberIds"`
	ExcludedMemberIDs   []string `json:"excludedMemberIds"`
	CreatedBy           string   `json:"createdBy"`
	CreatedByName       string   `json:"createdByName"`
}

type SubmitRSVPFERequest struct {
	MemberID   string `json:"memberId"`
	Name       string `json:"name"`
	Genre      string `json:"genre"`
	Generation int    `json:"generation"`
	Status     string `json:"status"`
	Note       string `json:"note"`
}

// ===== Number Rosters =====

type CreateNumberRosterRequest struct {
	Name      string   `json:"name"`
	MemberIDs []string `json:"memberIds"`
}

type UpdateNumberRosterRequest struct {
	Name      *string  `json:"name,omitempty"`
	MemberIDs []string `json:"memberIds,omitempty"`
}

// ===== Events =====

type CreateEventFERequest struct {
	Title           string               `json:"title"`
	Date            string               `json:"date"`
	Location        string               `json:"location"`
	MeetingTime     string               `json:"meetingTime"`
	MeetingLocation string               `json:"meetingLocation"`
	Timetable       []domain.TimetableRow `json:"timetable"`
	Note            string               `json:"note"`
	CreatedBy       string               `json:"createdBy"`
	CreatedByName   string               `json:"createdByName"`
}

// ===== Settlements =====

type CreateSettlementFERequest struct {
	Title                string                `json:"title"`
	Amount               int                   `json:"amount"`
	DueDate              string                `json:"dueDate"`
	Note                 string                `json:"note"`
	CreatedBy            string                `json:"createdBy"`
	CreatedByName        string                `json:"createdByName"`
	TargetType           string                `json:"targetType"`
	TargetGenres         []string              `json:"targetGenres"`
	TargetGenerations    []int                 `json:"targetGenerations"`
	TargetNumberID       string                `json:"targetNumberId"`
	TargetMemberIDs      []string              `json:"targetMemberIds"`
	AdditionalMemberIDs  []string              `json:"additionalMemberIds"`
	ExcludedMemberIDs    []string              `json:"excludedMemberIds"`
	ResolvedMemberIDs    []string              `json:"resolvedMemberIds"`
	PaymentMethods       []string              `json:"paymentMethods"`
	BankInfo             string                `json:"bankInfo"`
	PayPayInfo           string                `json:"paypayInfo"`
	CashCollectors       []domain.CashCollector `json:"cashCollectors"`
	RequiresConfirmation bool                  `json:"requiresConfirmation"`
	Payments             []PaymentInit         `json:"payments"`
}

type PaymentInit struct {
	MemberID string `json:"memberId"`
	Name     string `json:"name"`
}

type ReportPaymentFERequest struct {
	MemberID              string `json:"memberId"`
	Method                string `json:"method"`
	RequiresConfirmation  bool   `json:"requiresConfirmation"`
	CashCollectorID       string `json:"cashCollectorId,omitempty"`
	CashCollectorName     string `json:"cashCollectorName,omitempty"`
}

type UpdatePaymentStatusRequest struct {
	MemberID string `json:"memberId"`
	Status   string `json:"status"`
}

// ===== Sheet Sync =====

type SyncPracticeSession struct {
	Name              string   `json:"name"`
	Date              string   `json:"date"`
	StartTime         string   `json:"startTime"`
	EndTime           string   `json:"endTime"`
	Location          string   `json:"location"`
	Type              string   `json:"type"`
	TargetGenres      []string `json:"targetGenres"`
}

type SyncPracticesRequest struct {
	Sessions []SyncPracticeSession `json:"sessions"`
}
