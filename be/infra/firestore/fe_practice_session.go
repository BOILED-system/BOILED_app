package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
)

const fePracticeSessionCollection = "practiceSessions"

type fePracticeSessionRepository struct {
	client *firestore.Client
}

func NewFEPracticeSessionRepository(client *firestore.Client) *fePracticeSessionRepository {
	return &fePracticeSessionRepository{client: client}
}

func (r *fePracticeSessionRepository) Create(ctx context.Context, s *domain.FEPracticeSession) error {
	ref := r.client.Collection(fePracticeSessionCollection).NewDoc()
	s.ID = ref.ID
	s.CreatedAt = time.Now()
	_, err := ref.Set(ctx, s)
	return err
}

func (r *fePracticeSessionRepository) GetAll(ctx context.Context) ([]*domain.FEPracticeSession, error) {
	docs, err := r.client.Collection(fePracticeSessionCollection).Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	sessions := make([]*domain.FEPracticeSession, 0, len(docs))
	for _, doc := range docs {
		var s domain.FEPracticeSession
		if err := doc.DataTo(&s); err != nil {
			continue
		}
		sessions = append(sessions, &s)
	}
	return sessions, nil
}

func (r *fePracticeSessionRepository) GetByID(ctx context.Context, id string) (*domain.FEPracticeSession, error) {
	doc, err := r.client.Collection(fePracticeSessionCollection).Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var s domain.FEPracticeSession
	if err := doc.DataTo(&s); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *fePracticeSessionRepository) Update(ctx context.Context, id string, data map[string]interface{}) error {
	data["updatedAt"] = time.Now()
	_, err := r.client.Collection(fePracticeSessionCollection).Doc(id).Set(ctx, data, firestore.MergeAll)
	return err
}

func (r *fePracticeSessionRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.Collection(fePracticeSessionCollection).Doc(id).Delete(ctx)
	return err
}
