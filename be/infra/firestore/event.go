package firestore

import (
	"context"
	"sort"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/iterator"
)

// EventRepository implements port.EventRepository.
type EventRepository struct {
	client *firestore.Client
}

// NewEventRepository creates a new EventRepository.
func NewEventRepository(client *firestore.Client) *EventRepository {
	return &EventRepository{client: client}
}

// Create creates a new event.
func (r *EventRepository) Create(ctx context.Context, e *domain.Event) error {
	e.CreatedAt = time.Now()
	docRef, _, err := r.client.Collection("events").Add(ctx, e)
	if err != nil {
		return err
	}
	e.ID = docRef.ID
	return nil
}

// GetByID returns an event by ID.
func (r *EventRepository) GetByID(ctx context.Context, id string) (*domain.Event, error) {
	doc, err := r.client.Collection("events").Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var e domain.Event
	if err := doc.DataTo(&e); err != nil {
		return nil, err
	}
	e.ID = doc.Ref.ID
	return &e, nil
}

// GetByCircle returns all events for a circle.
func (r *EventRepository) GetByCircle(ctx context.Context, circleID string) ([]*domain.Event, error) {
	iter := r.client.Collection("events").
		Where("circleId", "==", circleID).
		Documents(ctx)
	defer iter.Stop()

	var events []*domain.Event
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var e domain.Event
		if err := doc.DataTo(&e); err != nil {
			return nil, err
		}
		e.ID = doc.Ref.ID
		events = append(events, &e)
	}

	// Sort by createdAt descending in-memory to avoid composite index requirement
	sort.Slice(events, func(i, j int) bool {
		return events[i].CreatedAt.After(events[j].CreatedAt)
	})

	return events, nil
}

// Update updates an event.
func (r *EventRepository) Update(ctx context.Context, e *domain.Event) error {
	_, err := r.client.Collection("events").Doc(e.ID).Set(ctx, e)
	return err
}

// Delete deletes an event.
func (r *EventRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.Collection("events").Doc(id).Delete(ctx)
	return err
}
