package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/iterator"
)

type PracticeRSVPRepository struct {
	client *firestore.Client
}

func NewPracticeRSVPRepository(client *firestore.Client) *PracticeRSVPRepository {
	return &PracticeRSVPRepository{client: client}
}

func (r *PracticeRSVPRepository) Upsert(ctx context.Context, rsvp *domain.PracticeRSVP) error {
	rsvp.UpdatedAt = time.Now()

	// Check existing
	iter := r.client.Collection("practice_rsvps").
		Where("sessionId", "==", rsvp.SessionID).
		Where("userId", "==", rsvp.UserID).
		Limit(1).
		Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		// Create new
		docRef, _, err := r.client.Collection("practice_rsvps").Add(ctx, rsvp)
		if err != nil {
			return err
		}
		rsvp.ID = docRef.ID
		return nil
	}
	if err != nil {
		return err
	}

	// Update existing
	rsvp.ID = doc.Ref.ID
	_, err = r.client.Collection("practice_rsvps").Doc(rsvp.ID).Set(ctx, rsvp)
	return err
}

func (r *PracticeRSVPRepository) GetBySessionAndUser(ctx context.Context, sessionID, userID string) (*domain.PracticeRSVP, error) {
	iter := r.client.Collection("practice_rsvps").
		Where("sessionId", "==", sessionID).
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
	var rsvp domain.PracticeRSVP
	if err := doc.DataTo(&rsvp); err != nil {
		return nil, err
	}
	rsvp.ID = doc.Ref.ID
	return &rsvp, nil
}

func (r *PracticeRSVPRepository) GetBySession(ctx context.Context, sessionID string) ([]*domain.PracticeRSVP, error) {
	iter := r.client.Collection("practice_rsvps").
		Where("sessionId", "==", sessionID).
		Documents(ctx)
	defer iter.Stop()

	var rsvps []*domain.PracticeRSVP
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var rsvp domain.PracticeRSVP
		if err := doc.DataTo(&rsvp); err != nil {
			return nil, err
		}
		rsvp.ID = doc.Ref.ID
		rsvps = append(rsvps, &rsvp)
	}
	return rsvps, nil
}

func (r *PracticeRSVPRepository) GetBySeriesAndUser(ctx context.Context, seriesID, userID string) ([]*domain.PracticeRSVP, error) {
	// First get all sessions for the series
	sessionIter := r.client.Collection("practice_sessions").
		Where("seriesId", "==", seriesID).
		Documents(ctx)
	defer sessionIter.Stop()

	var sessionIDs []string
	for {
		doc, err := sessionIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		sessionIDs = append(sessionIDs, doc.Ref.ID)
	}

	if len(sessionIDs) == 0 {
		return nil, nil
	}

	// Query RSVPs for each session (Firestore doesn't support IN queries with compound filters well)
	var rsvps []*domain.PracticeRSVP
	for _, sid := range sessionIDs {
		iter := r.client.Collection("practice_rsvps").
			Where("sessionId", "==", sid).
			Where("userId", "==", userID).
			Limit(1).
			Documents(ctx)

		doc, err := iter.Next()
		iter.Stop()
		if err == iterator.Done {
			continue
		}
		if err != nil {
			return nil, err
		}
		var rsvp domain.PracticeRSVP
		if err := doc.DataTo(&rsvp); err != nil {
			return nil, err
		}
		rsvp.ID = doc.Ref.ID
		rsvps = append(rsvps, &rsvp)
	}
	return rsvps, nil
}
