package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
)

const feEventCollection = "events"

type feEventRepository struct {
	client *firestore.Client
}

func NewFEEventRepository(client *firestore.Client) *feEventRepository {
	return &feEventRepository{client: client}
}

func (r *feEventRepository) Create(ctx context.Context, e *domain.FEEvent) error {
	ref := r.client.Collection(feEventCollection).NewDoc()
	e.ID = ref.ID
	e.CreatedAt = time.Now()
	_, err := ref.Set(ctx, e)
	return err
}

func (r *feEventRepository) GetAll(ctx context.Context) ([]*domain.FEEvent, error) {
	docs, err := r.client.Collection(feEventCollection).Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	events := make([]*domain.FEEvent, 0, len(docs))
	for _, doc := range docs {
		var e domain.FEEvent
		if err := doc.DataTo(&e); err != nil {
			continue
		}
		events = append(events, &e)
	}
	return events, nil
}

func (r *feEventRepository) GetByID(ctx context.Context, id string) (*domain.FEEvent, error) {
	doc, err := r.client.Collection(feEventCollection).Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var e domain.FEEvent
	if err := doc.DataTo(&e); err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *feEventRepository) Update(ctx context.Context, id string, data map[string]interface{}) error {
	data["updatedAt"] = time.Now()
	_, err := r.client.Collection(feEventCollection).Doc(id).Set(ctx, data, firestore.MergeAll)
	return err
}

func (r *feEventRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.Collection(feEventCollection).Doc(id).Delete(ctx)
	return err
}
