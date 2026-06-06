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

// DeleteByMember removes every RSVP belonging to a member across all sessions.
// Uses a collection group query so we read only this member's RSVPs, not every session.
func (r *fePracticeRSVPRepository) DeleteByMember(ctx context.Context, memberID string) error {
	docs, err := r.client.CollectionGroup("rsvps").Where("memberId", "==", memberID).Documents(ctx).GetAll()
	if err != nil {
		return err
	}
	batch := r.client.Batch()
	count := 0
	for _, d := range docs {
		batch.Delete(d.Ref)
		count++
		if count >= 400 {
			if _, err := batch.Commit(ctx); err != nil {
				return err
			}
			batch = r.client.Batch()
			count = 0
		}
	}
	if count > 0 {
		if _, err := batch.Commit(ctx); err != nil {
			return err
		}
	}
	return nil
}

// GetByMember returns all RSVPs for a member, keyed by session ID.
// Uses a Firestore collection group query on "rsvps" filtered by memberId,
// so reads scale with the number of RSVPs the member actually has — not
// with the total number of practice sessions.
func (r *fePracticeRSVPRepository) GetByMember(ctx context.Context, memberID string) (map[string]*domain.FEPracticeRSVP, error) {
	docs, err := r.client.CollectionGroup("rsvps").Where("memberId", "==", memberID).Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	result := make(map[string]*domain.FEPracticeRSVP, len(docs))
	for _, doc := range docs {
		// Parent of "rsvps/{memberID}" is the rsvps collection; its parent is the practice session document.
		parent := doc.Ref.Parent.Parent
		if parent == nil {
			continue
		}
		var rsvp domain.FEPracticeRSVP
		if err := doc.DataTo(&rsvp); err != nil {
			continue
		}
		result[parent.ID] = &rsvp
	}
	return result, nil
}
