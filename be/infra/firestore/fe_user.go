package firestore

import (
	"context"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
)

const feUserCollection = "users"

type feUserRepository struct {
	client *firestore.Client
}

// NewFEUserRepository creates a new FE user repository.
func NewFEUserRepository(client *firestore.Client) *feUserRepository {
	return &feUserRepository{client: client}
}

func (r *feUserRepository) GetByMemberID(ctx context.Context, memberID string) (*domain.FEUser, error) {
	doc, err := r.client.Collection(feUserCollection).Doc(memberID).Get(ctx)
	if err != nil {
		return nil, err
	}
	var u domain.FEUser
	if err := doc.DataTo(&u); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *feUserRepository) GetAll(ctx context.Context) ([]*domain.FEUser, error) {
	docs, err := r.client.Collection(feUserCollection).Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	users := make([]*domain.FEUser, 0, len(docs))
	for _, doc := range docs {
		var u domain.FEUser
		if err := doc.DataTo(&u); err != nil {
			continue
		}
		users = append(users, &u)
	}
	return users, nil
}

func (r *feUserRepository) Save(ctx context.Context, u *domain.FEUser) error {
	_, err := r.client.Collection(feUserCollection).Doc(u.MemberID).Set(ctx, u, firestore.MergeAll)
	return err
}
