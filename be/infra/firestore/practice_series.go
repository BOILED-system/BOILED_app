package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/iterator"
)

type PracticeSeriesRepository struct {
	client *firestore.Client
}

func NewPracticeSeriesRepository(client *firestore.Client) *PracticeSeriesRepository {
	return &PracticeSeriesRepository{client: client}
}

func (r *PracticeSeriesRepository) Create(ctx context.Context, s *domain.PracticeSeries) error {
	s.CreatedAt = time.Now()
	docRef, _, err := r.client.Collection("practice_series").Add(ctx, s)
	if err != nil {
		return err
	}
	s.ID = docRef.ID
	return nil
}

func (r *PracticeSeriesRepository) GetByID(ctx context.Context, id string) (*domain.PracticeSeries, error) {
	doc, err := r.client.Collection("practice_series").Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var s domain.PracticeSeries
	if err := doc.DataTo(&s); err != nil {
		return nil, err
	}
	s.ID = doc.Ref.ID
	return &s, nil
}

func (r *PracticeSeriesRepository) GetByCircle(ctx context.Context, circleID string) ([]*domain.PracticeSeries, error) {
	iter := r.client.Collection("practice_series").
		Where("circleId", "==", circleID).
		Documents(ctx)
	defer iter.Stop()

	var series []*domain.PracticeSeries
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var s domain.PracticeSeries
		if err := doc.DataTo(&s); err != nil {
			return nil, err
		}
		s.ID = doc.Ref.ID
		series = append(series, &s)
	}
	return series, nil
}

// GetByCategory returns practice series by category.
func (r *PracticeSeriesRepository) GetByCategory(ctx context.Context, categoryID string) ([]*domain.PracticeSeries, error) {
	iter := r.client.Collection("practice_series").
		Where("categoryId", "==", categoryID).
		Documents(ctx)
	defer iter.Stop()

	var series []*domain.PracticeSeries
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var s domain.PracticeSeries
		if err := doc.DataTo(&s); err != nil {
			return nil, err
		}
		s.ID = doc.Ref.ID
		series = append(series, &s)
	}
	return series, nil
}

func (r *PracticeSeriesRepository) Update(ctx context.Context, s *domain.PracticeSeries) error {
	s.UpdatedAt = time.Now()
	_, err := r.client.Collection("practice_series").Doc(s.ID).Set(ctx, s)
	return err
}

func (r *PracticeSeriesRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.Collection("practice_series").Doc(id).Delete(ctx)
	return err
}
