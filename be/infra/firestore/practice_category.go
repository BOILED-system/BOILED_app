package firestore

import (
	"context"
	"sort"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/iterator"
)

type PracticeCategoryRepository struct {
	client *firestore.Client
}

func NewPracticeCategoryRepository(client *firestore.Client) *PracticeCategoryRepository {
	return &PracticeCategoryRepository{client: client}
}

func (r *PracticeCategoryRepository) Create(ctx context.Context, c *domain.PracticeCategory) error {
	c.CreatedAt = time.Now()
	docRef, _, err := r.client.Collection("practice_categories").Add(ctx, c)
	if err != nil {
		return err
	}
	c.ID = docRef.ID
	return nil
}

func (r *PracticeCategoryRepository) GetByCircle(ctx context.Context, circleID string) ([]*domain.PracticeCategory, error) {
	iter := r.client.Collection("practice_categories").
		Where("circleId", "==", circleID).
		Documents(ctx)
	defer iter.Stop()

	var categories []*domain.PracticeCategory
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var c domain.PracticeCategory
		if err := doc.DataTo(&c); err != nil {
			return nil, err
		}
		c.ID = doc.Ref.ID
		categories = append(categories, &c)
	}

	// Sort by order in-memory to avoid composite index requirement
	sort.Slice(categories, func(i, j int) bool {
		return categories[i].Order < categories[j].Order
	})

	return categories, nil
}

func (r *PracticeCategoryRepository) Update(ctx context.Context, c *domain.PracticeCategory) error {
	_, err := r.client.Collection("practice_categories").Doc(c.ID).Set(ctx, c)
	return err
}

func (r *PracticeCategoryRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.Collection("practice_categories").Doc(id).Delete(ctx)
	return err
}
