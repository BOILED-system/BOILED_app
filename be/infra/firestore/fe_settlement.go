package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
)

const feSettlementCollection = "settlements"

type feSettlementRepository struct {
	client *firestore.Client
}

func NewFESettlementRepository(client *firestore.Client) *feSettlementRepository {
	return &feSettlementRepository{client: client}
}

func (r *feSettlementRepository) Create(ctx context.Context, s *domain.FESettlement) error {
	ref := r.client.Collection(feSettlementCollection).NewDoc()
	s.ID = ref.ID
	s.CreatedAt = time.Now()
	_, err := ref.Set(ctx, s)
	return err
}

func (r *feSettlementRepository) GetAll(ctx context.Context) ([]*domain.FESettlement, error) {
	docs, err := r.client.Collection(feSettlementCollection).Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	settlements := make([]*domain.FESettlement, 0, len(docs))
	for _, doc := range docs {
		var s domain.FESettlement
		if err := doc.DataTo(&s); err != nil {
			continue
		}
		settlements = append(settlements, &s)
	}
	return settlements, nil
}

func (r *feSettlementRepository) GetByID(ctx context.Context, id string) (*domain.FESettlement, error) {
	doc, err := r.client.Collection(feSettlementCollection).Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var s domain.FESettlement
	if err := doc.DataTo(&s); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *feSettlementRepository) Update(ctx context.Context, id string, data map[string]interface{}) error {
	data["updatedAt"] = time.Now()
	_, err := r.client.Collection(feSettlementCollection).Doc(id).Set(ctx, data, firestore.MergeAll)
	return err
}

func (r *feSettlementRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.Collection(feSettlementCollection).Doc(id).Delete(ctx)
	return err
}
