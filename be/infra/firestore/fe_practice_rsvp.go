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

func (r *fePracticeRSVPRepository) DeleteByMember(ctx context.Context, memberID string) error {
	sessionDocs, err := r.client.Collection(fePracticeSessionCollection).Documents(ctx).GetAll()
	if err != nil {
		return err
	}
	batch := r.client.Batch()
	count := 0
	for _, sd := range sessionDocs {
		ref := r.client.Collection(fePracticeSessionCollection).Doc(sd.Ref.ID).Collection("rsvps").Doc(memberID)
		batch.Delete(ref)
		count++
		// Firestore batch limit is 500
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

func (r *fePracticeRSVPRepository) GetByMember(ctx context.Context, memberID string) (map[string]*domain.FEPracticeRSVP, error) {
	sessionDocs, err := r.client.Collection(fePracticeSessionCollection).Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	refs := make([]*firestore.DocumentRef, 0, len(sessionDocs))
	for _, sd := range sessionDocs {
		refs = append(refs, r.client.Collection(fePracticeSessionCollection).Doc(sd.Ref.ID).Collection("rsvps").Doc(memberID))
	}
	if len(refs) == 0 {
		return map[string]*domain.FEPracticeRSVP{}, nil
	}
	rsvpDocs, err := r.client.GetAll(ctx, refs)
	if err != nil {
		return nil, err
	}
	result := make(map[string]*domain.FEPracticeRSVP)
	for i, doc := range rsvpDocs {
		if !doc.Exists() {
			continue
		}
		var rsvp domain.FEPracticeRSVP
		if err := doc.DataTo(&rsvp); err != nil {
			continue
		}
		result[sessionDocs[i].Ref.ID] = &rsvp
	}
	return result, nil
}
