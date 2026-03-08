package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/iterator"
)

// SettlementRepository implements port.SettlementRepository.
type SettlementRepository struct {
	client *firestore.Client
}

// NewSettlementRepository creates a new SettlementRepository.
func NewSettlementRepository(client *firestore.Client) *SettlementRepository {
	return &SettlementRepository{client: client}
}

// Create creates a new settlement.
func (r *SettlementRepository) Create(ctx context.Context, s *domain.Settlement) error {
	s.CreatedAt = time.Now()
	docRef, _, err := r.client.Collection("settlements").Add(ctx, s)
	if err != nil {
		return err
	}
	s.ID = docRef.ID
	return nil
}

// GetByID returns a settlement by ID.
func (r *SettlementRepository) GetByID(ctx context.Context, id string) (*domain.Settlement, error) {
	doc, err := r.client.Collection("settlements").Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var s domain.Settlement
	if err := doc.DataTo(&s); err != nil {
		return nil, err
	}
	s.ID = doc.Ref.ID
	return &s, nil
}

// GetByEvent returns all settlements for an event.
func (r *SettlementRepository) GetByEvent(ctx context.Context, eventID string) ([]*domain.Settlement, error) {
	iter := r.client.Collection("settlements").
		Where("eventId", "==", eventID).
		Documents(ctx)
	defer iter.Stop()

	var settlements []*domain.Settlement
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var s domain.Settlement
		if err := doc.DataTo(&s); err != nil {
			return nil, err
		}
		s.ID = doc.Ref.ID
		settlements = append(settlements, &s)
	}
	return settlements, nil
}

// Update updates a settlement.
func (r *SettlementRepository) Update(ctx context.Context, s *domain.Settlement) error {
	_, err := r.client.Collection("settlements").Doc(s.ID).Set(ctx, s)
	return err
}

// PaymentRepository implements port.PaymentRepository.
type PaymentRepository struct {
	client *firestore.Client
}

// NewPaymentRepository creates a new PaymentRepository.
func NewPaymentRepository(client *firestore.Client) *PaymentRepository {
	return &PaymentRepository{client: client}
}

// Create creates a new payment.
func (r *PaymentRepository) Create(ctx context.Context, p *domain.Payment) error {
	docRef, _, err := r.client.Collection("payments").Add(ctx, p)
	if err != nil {
		return err
	}
	p.ID = docRef.ID
	return nil
}

// GetBySettlementAndUser returns payment for a specific settlement and user.
func (r *PaymentRepository) GetBySettlementAndUser(ctx context.Context, settlementID, userID string) (*domain.Payment, error) {
	iter := r.client.Collection("payments").
		Where("settlementId", "==", settlementID).
		Where("userId", "==", userID).
		Limit(1).
		Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var p domain.Payment
	if err := doc.DataTo(&p); err != nil {
		return nil, err
	}
	p.ID = doc.Ref.ID
	return &p, nil
}

// GetByUser returns all payments for a user.
func (r *PaymentRepository) GetByUser(ctx context.Context, userID string) ([]*domain.Payment, error) {
	iter := r.client.Collection("payments").
		Where("userId", "==", userID).
		Documents(ctx)
	defer iter.Stop()

	var payments []*domain.Payment
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var p domain.Payment
		if err := doc.DataTo(&p); err != nil {
			return nil, err
		}
		p.ID = doc.Ref.ID
		payments = append(payments, &p)
	}
	return payments, nil
}

// Update updates a payment.
func (r *PaymentRepository) Update(ctx context.Context, p *domain.Payment) error {
	_, err := r.client.Collection("payments").Doc(p.ID).Set(ctx, p)
	return err
}

// DeleteBySettlementAndUser deletes a payment for a specific settlement and user.
func (r *PaymentRepository) DeleteBySettlementAndUser(ctx context.Context, settlementID, userID string) error {
	iter := r.client.Collection("payments").
		Where("settlementId", "==", settlementID).
		Where("userId", "==", userID).
		Documents(ctx)
	defer iter.Stop()

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return err
		}
		if _, err := doc.Ref.Delete(ctx); err != nil {
			return err
		}
	}
	return nil
}
