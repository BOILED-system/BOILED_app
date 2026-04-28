package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
)

const numberRosterCollection = "numberRosters"

type numberRosterRepository struct {
	client *firestore.Client
}

func NewNumberRosterRepository(client *firestore.Client) *numberRosterRepository {
	return &numberRosterRepository{client: client}
}

func (r *numberRosterRepository) Create(ctx context.Context, nr *domain.NumberRoster) error {
	ref := r.client.Collection(numberRosterCollection).NewDoc()
	nr.ID = ref.ID
	nr.CreatedAt = time.Now()
	_, err := ref.Set(ctx, nr)
	return err
}

func (r *numberRosterRepository) GetAll(ctx context.Context) ([]*domain.NumberRoster, error) {
	docs, err := r.client.Collection(numberRosterCollection).Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	rosters := make([]*domain.NumberRoster, 0, len(docs))
	for _, doc := range docs {
		var nr domain.NumberRoster
		if err := doc.DataTo(&nr); err != nil {
			continue
		}
		rosters = append(rosters, &nr)
	}
	return rosters, nil
}

func (r *numberRosterRepository) Update(ctx context.Context, id string, data map[string]interface{}) error {
	data["updatedAt"] = time.Now()
	_, err := r.client.Collection(numberRosterCollection).Doc(id).Set(ctx, data, firestore.MergeAll)
	return err
}

func (r *numberRosterRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.Collection(numberRosterCollection).Doc(id).Delete(ctx)
	return err
}

func (r *numberRosterRepository) RemoveMemberFromAll(ctx context.Context, memberID string) error {
	docs, err := r.client.Collection(numberRosterCollection).Documents(ctx).GetAll()
	if err != nil {
		return err
	}
	for _, doc := range docs {
		var nr domain.NumberRoster
		if err := doc.DataTo(&nr); err != nil {
			continue
		}
		filtered := make([]string, 0, len(nr.MemberIDs))
		removed := false
		for _, id := range nr.MemberIDs {
			if id == memberID {
				removed = true
				continue
			}
			filtered = append(filtered, id)
		}
		if !removed {
			continue
		}
		if _, err := doc.Ref.Set(ctx, map[string]interface{}{
			"memberIds": filtered,
			"updatedAt": time.Now(),
		}, firestore.MergeAll); err != nil {
			return err
		}
	}
	return nil
}
