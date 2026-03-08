package usecase

import (
	"context"
	"log"
	"time"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase/port"
)

// RSVPInteractor handles RSVP-related business logic.
type RSVPInteractor struct {
	rsvpRepo       port.RSVPRepository
	eventRepo      port.EventRepository
	settlementRepo port.SettlementRepository
	paymentRepo    port.PaymentRepository
}

// NewRSVPInteractor creates a new RSVPInteractor.
func NewRSVPInteractor(rsvpRepo port.RSVPRepository, eventRepo port.EventRepository, settlementRepo port.SettlementRepository, paymentRepo port.PaymentRepository) *RSVPInteractor {
	return &RSVPInteractor{
		rsvpRepo:       rsvpRepo,
		eventRepo:      eventRepo,
		settlementRepo: settlementRepo,
		paymentRepo:    paymentRepo,
	}
}

// isTargetUser checks if user is in target list.
func isTargetUser(userID string, targetUserIDs []string) bool {
	for _, id := range targetUserIDs {
		if id == userID {
			return true
		}
	}
	return false
}

// SubmitRSVP submits or updates RSVP.
func (i *RSVPInteractor) SubmitRSVP(ctx context.Context, eventID, userID string, status domain.RSVPStatus, note string) (*domain.RSVP, error) {
	// Verify event exists
	_, err := i.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}

	rsvp := &domain.RSVP{
		EventID:   eventID,
		UserID:    userID,
		Status:    status,
		Note:      note,
		UpdatedAt: time.Now(),
	}

	if err := i.rsvpRepo.Upsert(ctx, rsvp); err != nil {
		return nil, err
	}

	// If user is now attending (GO/LATE/EARLY), auto-create payment records
	// for any existing settlements on this event
	if status == domain.RSVPGo || status == domain.RSVPLate || status == domain.RSVPEarly {
		go i.ensurePaymentRecords(context.Background(), eventID, userID)
	} else if status == domain.RSVPNo {
		// Remove unpaid payment records when user declines
		go i.removePaymentRecords(context.Background(), eventID, userID)
	}

	return rsvp, nil
}

// ensurePaymentRecords creates payment records for existing settlements if missing.
func (i *RSVPInteractor) ensurePaymentRecords(ctx context.Context, eventID, userID string) {
	settlements, err := i.settlementRepo.GetByEvent(ctx, eventID)
	if err != nil {
		log.Printf("Failed to get settlements for event %s: %v", eventID, err)
		return
	}

	for _, settlement := range settlements {
		// Check if payment already exists
		existing, err := i.paymentRepo.GetBySettlementAndUser(ctx, settlement.ID, userID)
		if err != nil {
			log.Printf("Failed to check payment for settlement %s, user %s: %v", settlement.ID, userID, err)
			continue
		}
		if existing != nil {
			continue // Already has a payment record
		}

		// Create payment record
		payment := &domain.Payment{
			SettlementID: settlement.ID,
			UserID:       userID,
			Status:       domain.PaymentUnpaid,
		}
		if err := i.paymentRepo.Create(ctx, payment); err != nil {
			log.Printf("Failed to create payment for settlement %s, user %s: %v", settlement.ID, userID, err)
		}
	}
}

// removePaymentRecords removes payment records when user declines attending.
func (i *RSVPInteractor) removePaymentRecords(ctx context.Context, eventID, userID string) {
	settlements, err := i.settlementRepo.GetByEvent(ctx, eventID)
	if err != nil {
		log.Printf("Failed to get settlements for event %s: %v", eventID, err)
		return
	}

	for _, settlement := range settlements {
		if err := i.paymentRepo.DeleteBySettlementAndUser(ctx, settlement.ID, userID); err != nil {
			log.Printf("Failed to delete payment for settlement %s, user %s: %v", settlement.ID, userID, err)
		}
	}
}

// GetMyRSVP returns user's RSVP for an event.
func (i *RSVPInteractor) GetMyRSVP(ctx context.Context, eventID, userID string) (*domain.RSVP, error) {
	return i.rsvpRepo.GetByEventAndUser(ctx, eventID, userID)
}

// GetEventRSVPs returns all RSVPs for an event.
func (i *RSVPInteractor) GetEventRSVPs(ctx context.Context, eventID string) ([]*domain.RSVP, error) {
	return i.rsvpRepo.GetByEvent(ctx, eventID)
}
