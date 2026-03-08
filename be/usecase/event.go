package usecase

import (
	"context"
	"time"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase/port"
)

// EventInteractor handles event-related business logic.
type EventInteractor struct {
	eventRepo port.EventRepository
}

// NewEventInteractor creates a new EventInteractor.
func NewEventInteractor(eventRepo port.EventRepository) *EventInteractor {
	return &EventInteractor{eventRepo: eventRepo}
}

// CreateEvent creates a new event.
func (i *EventInteractor) CreateEvent(ctx context.Context, circleID, title string, startAt time.Time, location, coverImageURL string, rsvpTargetUserIDs []string, createdBy string) (*domain.Event, error) {
	event := &domain.Event{
		CircleID:          circleID,
		Title:             title,
		StartAt:           startAt,
		Location:          location,
		CoverImageURL:     coverImageURL,
		RSVPTargetUserIDs: rsvpTargetUserIDs,
		CreatedBy:         createdBy,
		CreatedAt:         time.Now(),
	}
	if err := i.eventRepo.Create(ctx, event); err != nil {
		return nil, err
	}
	return event, nil
}

// GetEvent returns an event by ID.
func (i *EventInteractor) GetEvent(ctx context.Context, id string) (*domain.Event, error) {
	return i.eventRepo.GetByID(ctx, id)
}

// GetEventsByCircle returns all events for a circle.
func (i *EventInteractor) GetEventsByCircle(ctx context.Context, circleID string) ([]*domain.Event, error) {
	return i.eventRepo.GetByCircle(ctx, circleID)
}

// UpdateEvent updates an event.
func (i *EventInteractor) UpdateEvent(ctx context.Context, eventID, title string, startAt time.Time, location, coverImageURL string, rsvpTargetUserIDs []string) (*domain.Event, error) {
	event, err := i.eventRepo.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}

	event.Title = title
	event.StartAt = startAt
	event.Location = location
	event.CoverImageURL = coverImageURL
	event.RSVPTargetUserIDs = rsvpTargetUserIDs

	if err := i.eventRepo.Update(ctx, event); err != nil {
		return nil, err
	}
	return event, nil
}

// DeleteEvent deletes an event.
func (i *EventInteractor) DeleteEvent(ctx context.Context, eventID string) error {
	return i.eventRepo.Delete(ctx, eventID)
}
