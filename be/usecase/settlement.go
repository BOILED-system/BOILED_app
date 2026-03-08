package usecase

import (
	"context"
	"time"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase/port"
)

// SettlementInteractor handles settlement-related business logic.
type SettlementInteractor struct {
	settlementRepo port.SettlementRepository
	paymentRepo    port.PaymentRepository
}

// NewSettlementInteractor creates a new SettlementInteractor.
func NewSettlementInteractor(settlementRepo port.SettlementRepository, paymentRepo port.PaymentRepository) *SettlementInteractor {
	return &SettlementInteractor{
		settlementRepo: settlementRepo,
		paymentRepo:    paymentRepo,
	}
}

// CreateSettlement creates a new settlement and payment records for each target user.
func (i *SettlementInteractor) CreateSettlement(ctx context.Context, circleID, eventID, title string, amount int, dueAt time.Time, targetUserIDs []string, bankInfo, paypayInfo string) (*domain.Settlement, error) {
	settlement := &domain.Settlement{
		CircleID:      circleID,
		EventID:       eventID,
		Title:         title,
		Amount:        amount,
		DueAt:         dueAt,
		TargetUserIDs: targetUserIDs,
		BankInfo:      bankInfo,
		PayPayInfo:    paypayInfo,
		CreatedAt:     time.Now(),
	}

	if err := i.settlementRepo.Create(ctx, settlement); err != nil {
		return nil, err
	}

	// Create payment records for each target user
	for _, userID := range targetUserIDs {
		payment := &domain.Payment{
			SettlementID: settlement.ID,
			UserID:       userID,
			Status:       domain.PaymentUnpaid,
		}
		if err := i.paymentRepo.Create(ctx, payment); err != nil {
			// Log error but continue
			continue
		}
	}

	return settlement, nil
}

// GetByEvent returns all settlements for an event.
func (i *SettlementInteractor) GetByEvent(ctx context.Context, eventID string) ([]*domain.Settlement, error) {
	return i.settlementRepo.GetByEvent(ctx, eventID)
}

// SettlementWithPayment combines settlement with user's payment status.
type SettlementWithPayment struct {
	Settlement *domain.Settlement `json:"settlement"`
	Payment    *domain.Payment    `json:"payment,omitempty"`
}

// GetMySettlements returns settlements for a user with their payment status.
func (i *SettlementInteractor) GetMySettlements(ctx context.Context, userID string) ([]SettlementWithPayment, error) {
	payments, err := i.paymentRepo.GetByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	var results []SettlementWithPayment
	for _, payment := range payments {
		settlement, err := i.settlementRepo.GetByID(ctx, payment.SettlementID)
		if err != nil {
			continue
		}
		results = append(results, SettlementWithPayment{
			Settlement: settlement,
			Payment:    payment,
		})
	}

	return results, nil
}

// ReportPayment reports a payment.
func (i *SettlementInteractor) ReportPayment(ctx context.Context, settlementID, userID string, method domain.PaymentMethod, note string) (*domain.Payment, error) {
	// Get payment record for this user
	payment, err := i.paymentRepo.GetBySettlementAndUser(ctx, settlementID, userID)
	if err != nil {
		return nil, err
	}
	if payment == nil {
		return nil, domain.ErrNotFound
	}

	// Update payment
	payment.Status = domain.PaymentPaidReported
	payment.Method = method
	payment.Note = note
	payment.ReportedAt = time.Now()

	if err := i.paymentRepo.Update(ctx, payment); err != nil {
		return nil, err
	}

	return payment, nil
}

// UpdateSettlement updates a settlement's title, amount, and dueAt.
func (i *SettlementInteractor) UpdateSettlement(ctx context.Context, settlementID, title string, amount int, dueAt time.Time) (*domain.Settlement, error) {
	settlement, err := i.settlementRepo.GetByID(ctx, settlementID)
	if err != nil {
		return nil, err
	}

	settlement.Title = title
	settlement.Amount = amount
	settlement.DueAt = dueAt

	if err := i.settlementRepo.Update(ctx, settlement); err != nil {
		return nil, err
	}

	return settlement, nil
}
