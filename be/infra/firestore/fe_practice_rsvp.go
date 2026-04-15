package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
)

type fePracticeRSVPRepository struct {
	client *firestore.Client
}

func NewFEPracticeRSVPRepository(client *firestore.Client) *fePracticeRSVPRepository {
	return &fePracticeRSVPRepository{client: client}
}

func (r *fePracticeRSVPRepository) Upsert(ctx context.Context, sessionID string, rsvp *domain.FEPracticeRSVP) error {
	rsvp.UpdatedAt = time.Now()
	ref := r.client.Collection(fePracticeSessionCollection).Doc(sessionID).Collection("rsvps").Doc(rsvp.MemberID)
	_, err := ref.Set(ctx, rsvp)
	return err
}

func (r *fePracticeRSVPRepository) GetBySessionAndMember(ctx context.Context, sessionID, memberID string) (*domain.FEPracticeRSVP, error) {
	doc, err := r.client.Collection(fePracticeSessionCollection).Doc(sessionID).Collection("rsvps").Doc(memberID).Get(ctx)
	if err != nil {
		return nil, err
	}
	var rsvp domain.FEPracticeRSVP
	if err := doc.DataTo(&rsvp); err != nil {
		return nil, err
	}
	return &rsvp, nil
}

func (r *fePracticeRSVPRepository) GetBySession(ctx context.Context, sessionID string) ([]*domain.FEPracticeRSVP, error) {
	docs, err := r.client.Collection(fePracticeSessionCollection).Doc(sessionID).Collection("rsvps").Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	rsvps := make([]*domain.FEPracticeRSVP, 0, len(docs))
	for _, doc := range docs {
		var rsvp domain.FEPracticeRSVP
		if err := doc.DataTo(&rsvp); err != nil {
			continue
		}
		rsvps = append(rsvps, &rsvp)
	}
	return rsvps, nil
}
