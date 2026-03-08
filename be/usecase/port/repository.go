// Package port defines repository and service interfaces.
// Part of usecase layer - no external dependencies.
package port

import (
	"context"

	"github.com/noa/circle-app/api/domain"
)

// UserRepository defines user data access interface.
type UserRepository interface {
	Create(ctx context.Context, u *domain.User) error
	GetByID(ctx context.Context, id string) (*domain.User, error)
	Update(ctx context.Context, u *domain.User) error
}

// CircleRepository defines circle data access interface.
type CircleRepository interface {
	Create(ctx context.Context, c *domain.Circle) error
	GetByID(ctx context.Context, id string) (*domain.Circle, error)
}

// MembershipRepository defines membership data access interface.
type MembershipRepository interface {
	Create(ctx context.Context, m *domain.Membership) error
	GetByCircle(ctx context.Context, circleID string) ([]*domain.Membership, error)
	GetByCircleAndUser(ctx context.Context, circleID, userID string) (*domain.Membership, error)
}

// EventRepository defines event data access interface.
type EventRepository interface {
	Create(ctx context.Context, e *domain.Event) error
	GetByID(ctx context.Context, id string) (*domain.Event, error)
	GetByCircle(ctx context.Context, circleID string) ([]*domain.Event, error)
	Update(ctx context.Context, e *domain.Event) error
	Delete(ctx context.Context, id string) error
}

// AnnouncementRepository defines announcement data access interface.
type AnnouncementRepository interface {
	Create(ctx context.Context, a *domain.Announcement) error
	GetByEvent(ctx context.Context, eventID string) ([]*domain.Announcement, error)
	GetByCircle(ctx context.Context, circleID string, limit int) ([]*domain.Announcement, error)
	GetByID(ctx context.Context, id string) (*domain.Announcement, error)
	Update(ctx context.Context, a *domain.Announcement) error
	Delete(ctx context.Context, id string) error
}

// RSVPRepository defines RSVP data access interface.
type RSVPRepository interface {
	Upsert(ctx context.Context, r *domain.RSVP) error
	GetByEventAndUser(ctx context.Context, eventID, userID string) (*domain.RSVP, error)
	GetByEvent(ctx context.Context, eventID string) ([]*domain.RSVP, error)
}

// SettlementRepository defines settlement data access interface.
type SettlementRepository interface {
	Create(ctx context.Context, s *domain.Settlement) error
	GetByID(ctx context.Context, id string) (*domain.Settlement, error)
	GetByEvent(ctx context.Context, eventID string) ([]*domain.Settlement, error)
	Update(ctx context.Context, s *domain.Settlement) error
}

// PaymentRepository defines payment data access interface.
type PaymentRepository interface {
	Create(ctx context.Context, p *domain.Payment) error
	GetBySettlementAndUser(ctx context.Context, settlementID, userID string) (*domain.Payment, error)
	GetByUser(ctx context.Context, userID string) ([]*domain.Payment, error)
	Update(ctx context.Context, p *domain.Payment) error
	DeleteBySettlementAndUser(ctx context.Context, settlementID, userID string) error
}

// AIService defines AI chat service interface.
type AIService interface {
	GenerateResponse(ctx context.Context, message string, announcements []*domain.Announcement, events []*domain.Event) (*domain.ChatResponse, error)
}

// PracticeCategoryRepository defines practice category data access interface.
type PracticeCategoryRepository interface {
	Create(ctx context.Context, c *domain.PracticeCategory) error
	GetByCircle(ctx context.Context, circleID string) ([]*domain.PracticeCategory, error)
	Update(ctx context.Context, c *domain.PracticeCategory) error
	Delete(ctx context.Context, id string) error
}

// PracticeSeriesRepository defines practice series data access interface.
type PracticeSeriesRepository interface {
	Create(ctx context.Context, s *domain.PracticeSeries) error
	GetByID(ctx context.Context, id string) (*domain.PracticeSeries, error)
	GetByCircle(ctx context.Context, circleID string) ([]*domain.PracticeSeries, error)
	GetByCategory(ctx context.Context, categoryID string) ([]*domain.PracticeSeries, error)
	Update(ctx context.Context, s *domain.PracticeSeries) error
	Delete(ctx context.Context, id string) error
}

// PracticeSessionRepository defines practice session data access interface.
type PracticeSessionRepository interface {
	Create(ctx context.Context, s *domain.PracticeSession) error
	GetByID(ctx context.Context, id string) (*domain.PracticeSession, error)
	GetBySeries(ctx context.Context, seriesID string) ([]*domain.PracticeSession, error)
	Update(ctx context.Context, s *domain.PracticeSession) error
}

// PracticeRSVPRepository defines practice RSVP data access interface.
type PracticeRSVPRepository interface {
	Upsert(ctx context.Context, r *domain.PracticeRSVP) error
	GetBySessionAndUser(ctx context.Context, sessionID, userID string) (*domain.PracticeRSVP, error)
	GetBySession(ctx context.Context, sessionID string) ([]*domain.PracticeRSVP, error)
	GetBySeriesAndUser(ctx context.Context, seriesID, userID string) ([]*domain.PracticeRSVP, error)
}
