package firestore

import (
	"context"
	"sort"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/iterator"
)

type PracticeSessionRepository struct {
	client *firestore.Client
}

func NewPracticeSessionRepository(client *firestore.Client) *PracticeSessionRepository {
	return &PracticeSessionRepository{client: client}
}

func (r *PracticeSessionRepository) Create(ctx context.Context, s *domain.PracticeSession) error {
	s.CreatedAt = time.Now()
	docRef, _, err := r.client.Collection("practice_sessions").Add(ctx, s)
	if err != nil {
		return err
	}
	s.ID = docRef.ID
	return nil
}

func (r *PracticeSessionRepository) GetByID(ctx context.Context, id string) (*domain.PracticeSession, error) {
	doc, err := r.client.Collection("practice_sessions").Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var s domain.PracticeSession
	if err := doc.DataTo(&s); err != nil {
		return nil, err
	}
	s.ID = doc.Ref.ID
	return &s, nil
}

func (r *PracticeSessionRepository) GetBySeries(ctx context.Context, seriesID string) ([]*domain.PracticeSession, error) {
	iter := r.client.Collection("practice_sessions").
		Where("seriesId", "==", seriesID).
		Documents(ctx)
	defer iter.Stop()

	var sessions []*domain.PracticeSession
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var s domain.PracticeSession
		if err := doc.DataTo(&s); err != nil {
			return nil, err
		}
		s.ID = doc.Ref.ID
		sessions = append(sessions, &s)
	}
	// Sort by date in Go instead of Firestore OrderBy (avoids needing composite index)
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].Date.Before(sessions[j].Date)
	})
	return sessions, nil
}

func (r *PracticeSessionRepository) Update(ctx context.Context, s *domain.PracticeSession) error {
	_, err := r.client.Collection("practice_sessions").Doc(s.ID).Set(ctx, s)
	return err
}
