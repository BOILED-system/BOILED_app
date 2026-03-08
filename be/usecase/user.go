package usecase

import (
	"context"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase/port"
)

// UserInteractor implements user use cases.
type UserInteractor struct {
	repo port.UserRepository
}

// NewUserInteractor creates a new UserInteractor.
func NewUserInteractor(repo port.UserRepository) *UserInteractor {
	return &UserInteractor{repo: repo}
}

// CreateUser creates a new user.
func (i *UserInteractor) CreateUser(ctx context.Context, id, name, avatarURL string) (*domain.User, error) {
	u := &domain.User{
		ID:        id,
		Name:      name,
		AvatarURL: avatarURL,
	}
	if err := i.repo.Create(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

// GetUser returns a user by ID.
func (i *UserInteractor) GetUser(ctx context.Context, id string) (*domain.User, error) {
	return i.repo.GetByID(ctx, id)
}

// UpdateUser updates a user profile.
func (i *UserInteractor) UpdateUser(ctx context.Context, id, name, avatarURL string) (*domain.User, error) {
	u, err := i.repo.GetByID(ctx, id)
	if err != nil {
		// If user doesn't exist, create it (upsert-like behavior for profile edit)
		return i.CreateUser(ctx, id, name, avatarURL)
	}

	if name != "" {
		u.Name = name
	}
	if avatarURL != "" {
		u.AvatarURL = avatarURL
	}

	if err := i.repo.Update(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}
