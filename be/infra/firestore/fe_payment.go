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

// GetByMember returns all payment records for a member, keyed by settlement ID.
// Uses a collection group query on "payments" filtered by memberId so reads scale
// with the number of payment records this member actually has.
func (r *fePaymentRepository) GetByMember(ctx context.Context, memberID string) (map[string]*domain.FEPaymentRecord, error) {
	docs, err := r.client.CollectionGroup("payments").Where("memberId", "==", memberID).Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	result := make(map[string]*domain.FEPaymentRecord, len(docs))
	for _, doc := range docs {
		parent := doc.Ref.Parent.Parent
		if parent == nil {
			continue
		}
		var p domain.FEPaymentRecord
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		result[parent.ID] = &p
	}
	return result, nil
}

// DeleteByMember removes every payment record belonging to a member across all settlements.
func (r *fePaymentRepository) DeleteByMember(ctx context.Context, memberID string) error {
	docs, err := r.client.CollectionGroup("payments").Where("memberId", "==", memberID).Documents(ctx).GetAll()
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
