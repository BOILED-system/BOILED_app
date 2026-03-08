package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
)

// UserRepository implements port.UserRepository.
type UserRepository struct {
	client *firestore.Client
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(client *firestore.Client) *UserRepository {
	return &UserRepository{client: client}
}

// Create creates a new user.
func (r *UserRepository) Create(ctx context.Context, u *domain.User) error {
	u.CreatedAt = time.Now()
	u.UpdatedAt = time.Now()
	_, err := r.client.Collection("users").Doc(u.ID).Set(ctx, u)
	return err
}

// GetByID returns a user by ID.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	doc, err := r.client.Collection("users").Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var u domain.User
	if err := doc.DataTo(&u); err != nil {
		return nil, err
	}
	u.ID = doc.Ref.ID
	return &u, nil
}

// Update updates a user.
func (r *UserRepository) Update(ctx context.Context, u *domain.User) error {
	u.UpdatedAt = time.Now()
	_, err := r.client.Collection("users").Doc(u.ID).Set(ctx, u, firestore.MergeAll)
	return err
}
