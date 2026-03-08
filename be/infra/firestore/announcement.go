package firestore

import (
	"context"
	"sort"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/iterator"
)

// AnnouncementRepository implements port.AnnouncementRepository.
type AnnouncementRepository struct {
	client *firestore.Client
}

// NewAnnouncementRepository creates a new AnnouncementRepository.
func NewAnnouncementRepository(client *firestore.Client) *AnnouncementRepository {
	return &AnnouncementRepository{client: client}
}

// Create creates a new announcement.
func (r *AnnouncementRepository) Create(ctx context.Context, a *domain.Announcement) error {
	a.CreatedAt = time.Now()
	docRef, _, err := r.client.Collection("announcements").Add(ctx, a)
	if err != nil {
		return err
	}
	a.ID = docRef.ID
	return nil
}

// GetByID returns an announcement by ID.
func (r *AnnouncementRepository) GetByID(ctx context.Context, id string) (*domain.Announcement, error) {
	doc, err := r.client.Collection("announcements").Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}
	var a domain.Announcement
	if err := doc.DataTo(&a); err != nil {
		return nil, err
	}
	a.ID = doc.Ref.ID
	return &a, nil
}

// GetByEvent returns announcements for an event.
func (r *AnnouncementRepository) GetByEvent(ctx context.Context, eventID string) ([]*domain.Announcement, error) {
	iter := r.client.Collection("announcements").
		Where("eventId", "==", eventID).
		Documents(ctx)
	defer iter.Stop()

	var announcements []*domain.Announcement
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var a domain.Announcement
		if err := doc.DataTo(&a); err != nil {
			return nil, err
		}
		a.ID = doc.Ref.ID
		announcements = append(announcements, &a)
	}
	sort.Slice(announcements, func(i, j int) bool {
		return announcements[i].CreatedAt.After(announcements[j].CreatedAt)
	})
	return announcements, nil
}

// GetByCircle returns latest announcements for a circle.
func (r *AnnouncementRepository) GetByCircle(ctx context.Context, circleID string, limit int) ([]*domain.Announcement, error) {
	iter := r.client.Collection("announcements").
		Where("circleId", "==", circleID).
		Documents(ctx)
	defer iter.Stop()

	var announcements []*domain.Announcement
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var a domain.Announcement
		if err := doc.DataTo(&a); err != nil {
			return nil, err
		}
		a.ID = doc.Ref.ID
		announcements = append(announcements, &a)
	}
	sort.Slice(announcements, func(i, j int) bool {
		return announcements[i].CreatedAt.After(announcements[j].CreatedAt)
	})
	if limit > 0 && len(announcements) > limit {
		announcements = announcements[:limit]
	}
	return announcements, nil
}

// Update updates an announcement.
func (r *AnnouncementRepository) Update(ctx context.Context, a *domain.Announcement) error {
	a.UpdatedAt = time.Now()
	_, err := r.client.Collection("announcements").Doc(a.ID).Set(ctx, a)
	return err
}

// Delete deletes an announcement.
func (r *AnnouncementRepository) Delete(ctx context.Context, id string) error {
	_, err := r.client.Collection("announcements").Doc(id).Delete(ctx)
	return err
}
