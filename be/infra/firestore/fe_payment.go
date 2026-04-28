package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
)

type fePaymentRepository struct {
	client *firestore.Client
}

func NewFEPaymentRepository(client *firestore.Client) *fePaymentRepository {
	return &fePaymentRepository{client: client}
}

func (r *fePaymentRepository) Create(ctx context.Context, settlementID string, p *domain.FEPaymentRecord) error {
	ref := r.client.Collection(feSettlementCollection).Doc(settlementID).Collection("payments").Doc(p.MemberID)
	_, err := ref.Set(ctx, p)
	return err
}

func (r *fePaymentRepository) GetBySettlement(ctx context.Context, settlementID string) ([]*domain.FEPaymentRecord, error) {
	docs, err := r.client.Collection(feSettlementCollection).Doc(settlementID).Collection("payments").Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	records := make([]*domain.FEPaymentRecord, 0, len(docs))
	for _, doc := range docs {
		var p domain.FEPaymentRecord
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		records = append(records, &p)
	}
	return records, nil
}

func (r *fePaymentRepository) Update(ctx context.Context, settlementID, memberID string, data map[string]interface{}) error {
	data["updatedAt"] = time.Now()
	ref := r.client.Collection(feSettlementCollection).Doc(settlementID).Collection("payments").Doc(memberID)
	_, err := ref.Set(ctx, data, firestore.MergeAll)
	return err
}

func (r *fePaymentRepository) DeleteByMember(ctx context.Context, memberID string) error {
	settlementDocs, err := r.client.Collection(feSettlementCollection).Documents(ctx).GetAll()
	if err != nil {
		return err
	}
	batch := r.client.Batch()
	count := 0
	for _, sd := range settlementDocs {
		ref := r.client.Collection(feSettlementCollection).Doc(sd.Ref.ID).Collection("payments").Doc(memberID)
		batch.Delete(ref)
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
