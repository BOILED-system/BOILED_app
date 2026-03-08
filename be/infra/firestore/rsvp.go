package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/iterator"
)

// RSVPRepository implements port.RSVPRepository.
type RSVPRepository struct {
	client *firestore.Client
}

// NewRSVPRepository creates a new RSVPRepository.
func NewRSVPRepository(client *firestore.Client) *RSVPRepository {
	return &RSVPRepository{client: client}
}

// Upsert creates or updates an RSVP.
func (r *RSVPRepository) Upsert(ctx context.Context, rsvp *domain.RSVP) error {
	// Check if exists
	existing, err := r.GetByEventAndUser(ctx, rsvp.EventID, rsvp.UserID)
	if err != nil {
		return err
	}

	rsvp.UpdatedAt = time.Now()

	if existing != nil {
		rsvp.ID = existing.ID
		_, err = r.client.Collection("rsvps").Doc(rsvp.ID).Set(ctx, rsvp)
		return err
	}

	docRef, _, err := r.client.Collection("rsvps").Add(ctx, rsvp)
	if err != nil {
		return err
	}
	rsvp.ID = docRef.ID
	return nil
}

// GetByEventAndUser returns RSVP for a specific event and user.
func (r *RSVPRepository) GetByEventAndUser(ctx context.Context, eventID, userID string) (*domain.RSVP, error) {
	iter := r.client.Collection("rsvps").
		Where("eventId", "==", eventID).
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

	var rsvp domain.RSVP
	if err := doc.DataTo(&rsvp); err != nil {
		return nil, err
	}
	rsvp.ID = doc.Ref.ID
	return &rsvp, nil
}

// GetByEvent returns all RSVPs for a specific event.
func (r *RSVPRepository) GetByEvent(ctx context.Context, eventID string) ([]*domain.RSVP, error) {
	iter := r.client.Collection("rsvps").
		Where("eventId", "==", eventID).
		Documents(ctx)
	defer iter.Stop()

	var rsvps []*domain.RSVP
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var rsvp domain.RSVP
		if err := doc.DataTo(&rsvp); err != nil {
			continue // Skip invalid data
		}
		rsvp.ID = doc.Ref.ID
		rsvps = append(rsvps, &rsvp)
	}

	return rsvps, nil
}
