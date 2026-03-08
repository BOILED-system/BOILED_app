package usecase

import (
	"context"
	"time"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase/port"
)

// AnnouncementInteractor handles announcement-related business logic.
type AnnouncementInteractor struct {
	announcementRepo port.AnnouncementRepository
}

// NewAnnouncementInteractor creates a new AnnouncementInteractor.
func NewAnnouncementInteractor(announcementRepo port.AnnouncementRepository) *AnnouncementInteractor {
	return &AnnouncementInteractor{announcementRepo: announcementRepo}
}

// CreateAnnouncement creates a new announcement.
func (i *AnnouncementInteractor) CreateAnnouncement(ctx context.Context, circleID, eventID, title, body, createdBy string) (*domain.Announcement, error) {
	announcement := &domain.Announcement{
		CircleID:  circleID,
		EventID:   eventID,
		Title:     title,
		Body:      body,
		CreatedBy: createdBy,
		CreatedAt: time.Now(),
	}
	if err := i.announcementRepo.Create(ctx, announcement); err != nil {
		return nil, err
	}
	return announcement, nil
}

// GetByEvent returns announcements for an event.
func (i *AnnouncementInteractor) GetByEvent(ctx context.Context, eventID string) ([]*domain.Announcement, error) {
	return i.announcementRepo.GetByEvent(ctx, eventID)
}

// GetByCircle returns latest announcements for a circle.
func (i *AnnouncementInteractor) GetByCircle(ctx context.Context, circleID string, limit int) ([]*domain.Announcement, error) {
	if limit <= 0 {
		limit = 10
	}
	return i.announcementRepo.GetByCircle(ctx, circleID, limit)
}

// GetAnnouncement returns an announcement by ID.
func (i *AnnouncementInteractor) GetAnnouncement(ctx context.Context, id string) (*domain.Announcement, error) {
	return i.announcementRepo.GetByID(ctx, id)
}

// UpdateAnnouncement updates an announcement.
func (i *AnnouncementInteractor) UpdateAnnouncement(ctx context.Context, id, title, body string) (*domain.Announcement, error) {
	announcement, err := i.announcementRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	announcement.Title = title
	announcement.Body = body
	if err := i.announcementRepo.Update(ctx, announcement); err != nil {
		return nil, err
	}
	return announcement, nil
}

// DeleteAnnouncement deletes an announcement.
func (i *AnnouncementInteractor) DeleteAnnouncement(ctx context.Context, id string) error {
	return i.announcementRepo.Delete(ctx, id)
}
