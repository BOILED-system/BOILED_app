package usecase

import (
	"context"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase/port"
)

// ChatInteractor handles AI chat business logic.
type ChatInteractor struct {
	announcementRepo port.AnnouncementRepository
	eventRepo        port.EventRepository
	aiService        port.AIService
}

// NewChatInteractor creates a new ChatInteractor.
func NewChatInteractor(announcementRepo port.AnnouncementRepository, eventRepo port.EventRepository, aiService port.AIService) *ChatInteractor {
	return &ChatInteractor{
		announcementRepo: announcementRepo,
		eventRepo:        eventRepo,
		aiService:        aiService,
	}
}

// Ask processes a user question using circle's announcements as context.
func (i *ChatInteractor) Ask(ctx context.Context, circleID, message string) (*domain.ChatResponse, error) {
	// Get latest announcements for context (max 10)
	announcements, err := i.announcementRepo.GetByCircle(ctx, circleID, 10)
	if err != nil {
		return nil, err
	}

	// Get latest events for context (max 10, or filtered by future)
	// For MVP, just get all events. In real app, filter by date.
	events, err := i.eventRepo.GetByCircle(ctx, circleID)
	if err != nil {
		// Log error but continue with announcements only?
		// For now, fail if events cannot be fetched
		return nil, err
	}

	// Generate AI response
	return i.aiService.GenerateResponse(ctx, message, announcements, events)
}
