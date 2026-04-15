// Package port defines FE-compatible repository interfaces.
package port

import (
	"context"

	"github.com/noa/circle-app/api/domain"
)

// FEUserRepository defines user data access using FE schema.
type FEUserRepository interface {
	GetByMemberID(ctx context.Context, memberID string) (*domain.FEUser, error)
	GetAll(ctx context.Context) ([]*domain.FEUser, error)
	Save(ctx context.Context, u *domain.FEUser) error
}

// FEPracticeSessionRepository defines practice session data access using FE schema.
type FEPracticeSessionRepository interface {
	Create(ctx context.Context, s *domain.FEPracticeSession) error
	GetAll(ctx context.Context) ([]*domain.FEPracticeSession, error)
	GetByID(ctx context.Context, id string) (*domain.FEPracticeSession, error)
	Update(ctx context.Context, id string, data map[string]interface{}) error
	Delete(ctx context.Context, id string) error
}

// FEPracticeRSVPRepository defines practice RSVP data access using FE schema.
type FEPracticeRSVPRepository interface {
	Upsert(ctx context.Context, sessionID string, rsvp *domain.FEPracticeRSVP) error
	GetBySessionAndMember(ctx context.Context, sessionID, memberID string) (*domain.FEPracticeRSVP, error)
	GetBySession(ctx context.Context, sessionID string) ([]*domain.FEPracticeRSVP, error)
}

// NumberRosterRepository defines number roster data access.
type NumberRosterRepository interface {
	Create(ctx context.Context, r *domain.NumberRoster) error
	GetAll(ctx context.Context) ([]*domain.NumberRoster, error)
	Update(ctx context.Context, id string, data map[string]interface{}) error
	Delete(ctx context.Context, id string) error
}

// FEEventRepository defines event data access using FE schema.
type FEEventRepository interface {
	Create(ctx context.Context, e *domain.FEEvent) error
	GetAll(ctx context.Context) ([]*domain.FEEvent, error)
	GetByID(ctx context.Context, id string) (*domain.FEEvent, error)
	Update(ctx context.Context, id string, data map[string]interface{}) error
	Delete(ctx context.Context, id string) error
}

// FESettlementRepository defines settlement data access using FE schema.
type FESettlementRepository interface {
	Create(ctx context.Context, s *domain.FESettlement) error
	GetAll(ctx context.Context) ([]*domain.FESettlement, error)
	GetByID(ctx context.Context, id string) (*domain.FESettlement, error)
	Update(ctx context.Context, id string, data map[string]interface{}) error
	Delete(ctx context.Context, id string) error
}

// FEPaymentRepository defines payment record data access using FE schema.
type FEPaymentRepository interface {
	Create(ctx context.Context, settlementID string, p *domain.FEPaymentRecord) error
	GetBySettlement(ctx context.Context, settlementID string) ([]*domain.FEPaymentRecord, error)
	Update(ctx context.Context, settlementID, memberID string, data map[string]interface{}) error
}
