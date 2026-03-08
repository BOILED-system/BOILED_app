// Package firestore provides Firestore implementations of repositories.
package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/iterator"
)

// CircleRepository implements port.CircleRepository.
type CircleRepository struct {
	client *firestore.Client
}

// NewCircleRepository creates a new CircleRepository.
func NewCircleRepository(client *firestore.Client) *CircleRepository {
	return &CircleRepository{client: client}
}

// Create creates a new circle.
func (r *CircleRepository) Create(ctx context.Context, c *domain.Circle) error {
	c.CreatedAt = time.Now()
	docRef, _, err := r.client.Collection("circles").Add(ctx, c)
	if err != nil {
		return err
	}
	c.ID = docRef.ID
	return nil
}

// GetByID returns a circle by ID.
func (r *CircleRepository) GetByID(ctx context.Context, id string) (*domain.Circle, error) {
	doc, err := r.client.Collection("circles").Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var c domain.Circle
	if err := doc.DataTo(&c); err != nil {
		return nil, err
	}
	c.ID = doc.Ref.ID
	return &c, nil
}

// MembershipRepository implements port.MembershipRepository.
type MembershipRepository struct {
	client *firestore.Client
}

// NewMembershipRepository creates a new MembershipRepository.
func NewMembershipRepository(client *firestore.Client) *MembershipRepository {
	return &MembershipRepository{client: client}
}

// Create creates a new membership.
func (r *MembershipRepository) Create(ctx context.Context, m *domain.Membership) error {
	m.JoinedAt = time.Now()
	docRef, _, err := r.client.Collection("memberships").Add(ctx, m)
	if err != nil {
		return err
	}
	m.ID = docRef.ID
	return nil
}

// GetByCircle returns all memberships for a circle.
func (r *MembershipRepository) GetByCircle(ctx context.Context, circleID string) ([]*domain.Membership, error) {
	iter := r.client.Collection("memberships").Where("circleId", "==", circleID).Documents(ctx)
	defer iter.Stop()

	var memberships []*domain.Membership
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var m domain.Membership
		if err := doc.DataTo(&m); err != nil {
			return nil, err
		}
		m.ID = doc.Ref.ID
		memberships = append(memberships, &m)
	}
	return memberships, nil
}

// GetByCircleAndUser returns membership for a specific user in a circle.
func (r *MembershipRepository) GetByCircleAndUser(ctx context.Context, circleID, userID string) (*domain.Membership, error) {
	iter := r.client.Collection("memberships").
		Where("circleId", "==", circleID).
		Where("userId", "==", userID).
		Limit(1).
		Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == iterator.Done {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var m domain.Membership
	if err := doc.DataTo(&m); err != nil {
		return nil, err
	}
	m.ID = doc.Ref.ID
	return &m, nil
}
