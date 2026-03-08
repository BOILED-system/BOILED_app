package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase/port"
)

// PracticeUseCase handles practice-related business logic.
type PracticeUseCase struct {
	categoryRepo   port.PracticeCategoryRepository
	seriesRepo     port.PracticeSeriesRepository
	sessionRepo    port.PracticeSessionRepository
	rsvpRepo       port.PracticeRSVPRepository
	settlementRepo port.SettlementRepository // Added
}

// NewPracticeUseCase creates a new PracticeUseCase.
func NewPracticeUseCase(
	categoryRepo port.PracticeCategoryRepository,
	seriesRepo port.PracticeSeriesRepository,
	sessionRepo port.PracticeSessionRepository,
	rsvpRepo port.PracticeRSVPRepository,
	settlementRepo port.SettlementRepository, // Added param
) *PracticeUseCase {
	return &PracticeUseCase{
		categoryRepo:   categoryRepo,
		seriesRepo:     seriesRepo,
		sessionRepo:    sessionRepo,
		rsvpRepo:       rsvpRepo,
		settlementRepo: settlementRepo,
	}
}

// ... existing methods ...

// CreateSettlements generates settlements for unpaid practice sessions in a given month.
func (uc *PracticeUseCase) CreateSettlements(ctx context.Context, seriesID string, month string) error { // month: "2024-04"
	// 1. Get Series
	series, err := uc.seriesRepo.GetByID(ctx, seriesID)
	if err != nil {
		return err
	}
	if series.Fee == 0 {
		return nil // No fee, no settlement needed
	}

	// 2. Get Sessions for the Series
	sessions, err := uc.sessionRepo.GetBySeries(ctx, seriesID)
	if err != nil {
		return err
	}

	// Filter sessions by month
	var targetSessions []*domain.PracticeSession
	for _, s := range sessions {
		if s.Cancelled {
			continue
		}
		// Format "YYYY-MM"
		sMonth := s.Date.Format("2006-01")
		if sMonth == month {
			targetSessions = append(targetSessions, s)
		}
	}
	if len(targetSessions) == 0 {
		return nil
	}

	// 3. Get RSVPs for these sessions and aggregate by User
	userCounts := make(map[string]int)
	for _, s := range targetSessions {
		rsvps, err := uc.rsvpRepo.GetBySession(ctx, s.ID)
		if err != nil {
			return err
		}
		for _, r := range rsvps {
			if r.Status == domain.PracticeRSVPStatus(domain.PracticeRSVPGo) {
				userCounts[r.UserID]++
			}
		}
	}

	// 4. Create Settlement for each user
	now := time.Now()
	// simple due date: end of next month? or +2 weeks? Let's say +2 weeks
	dueAt := now.AddDate(0, 0, 14)

	for userID, count := range userCounts {
		if count == 0 {
			continue
		}
		amount := count * series.Fee
		title := fmt.Sprintf("%s 参加費 (%s月度 %d回分)", series.Name, month, count)

		settlement := &domain.Settlement{
			CircleID:      series.CircleID,
			Title:         title,
			Amount:        amount,
			DueAt:         dueAt,
			TargetUserIDs: []string{userID},
			BankInfo:      "", // TODO: Get from Circle settings? Or empty is fine
			PayPayInfo:    "",
			CreatedAt:     now,
		}
		if err := uc.settlementRepo.Create(ctx, settlement); err != nil {
			return err
		}
	}

	return nil
}

// --- Category ---

func (uc *PracticeUseCase) CreateCategory(ctx context.Context, c *domain.PracticeCategory) error {
	return uc.categoryRepo.Create(ctx, c)
}

func (uc *PracticeUseCase) GetCategories(ctx context.Context, circleID string) ([]*domain.PracticeCategory, error) {
	return uc.categoryRepo.GetByCircle(ctx, circleID)
}

func (uc *PracticeUseCase) UpdateCategory(ctx context.Context, c *domain.PracticeCategory) error {
	return uc.categoryRepo.Update(ctx, c)
}

func (uc *PracticeUseCase) DeleteCategory(ctx context.Context, id string) error {
	return uc.categoryRepo.Delete(ctx, id)
}

// --- Series ---

func (uc *PracticeUseCase) CreateSeries(ctx context.Context, s *domain.PracticeSeries) error {
	return uc.seriesRepo.Create(ctx, s)
}

func (uc *PracticeUseCase) GetSeries(ctx context.Context, id string) (*domain.PracticeSeries, error) {
	return uc.seriesRepo.GetByID(ctx, id)
}

func (uc *PracticeUseCase) GetSeriesByCircle(ctx context.Context, circleID string) ([]*domain.PracticeSeries, error) {
	return uc.seriesRepo.GetByCircle(ctx, circleID)
}

func (uc *PracticeUseCase) UpdateSeries(ctx context.Context, id string, req *domain.PracticeSeries) (*domain.PracticeSeries, error) {
	series, err := uc.seriesRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	series.Name = req.Name
	series.DayOfWeek = req.DayOfWeek
	series.StartTime = req.StartTime
	series.Location = req.Location
	series.Fee = req.Fee
	// Do not update CircleID, CategoryID, CreatedBy?
	if err := uc.seriesRepo.Update(ctx, series); err != nil {
		return nil, err
	}
	return series, nil
}

func (uc *PracticeUseCase) DeleteSeries(ctx context.Context, id string) error {
	return uc.seriesRepo.Delete(ctx, id)
}

// --- Session ---

func (uc *PracticeUseCase) CreateSession(ctx context.Context, s *domain.PracticeSession) error {
	return uc.sessionRepo.Create(ctx, s)
}

func (uc *PracticeUseCase) GetSessionsBySeries(ctx context.Context, seriesID string) ([]*domain.PracticeSession, error) {
	return uc.sessionRepo.GetBySeries(ctx, seriesID)
}

func (uc *PracticeUseCase) UpdateSession(ctx context.Context, s *domain.PracticeSession) error {
	return uc.sessionRepo.Update(ctx, s)
}

// --- RSVP ---

func (uc *PracticeUseCase) SubmitRSVP(ctx context.Context, r *domain.PracticeRSVP) error {
	return uc.rsvpRepo.Upsert(ctx, r)
}

// BulkRSVP submits multiple RSVPs at once.
func (uc *PracticeUseCase) BulkRSVP(ctx context.Context, rsvps []*domain.PracticeRSVP) error {
	for _, r := range rsvps {
		if err := uc.rsvpRepo.Upsert(ctx, r); err != nil {
			return err
		}
	}
	return nil
}

func (uc *PracticeUseCase) GetMyRSVPs(ctx context.Context, seriesID, userID string) ([]*domain.PracticeRSVP, error) {
	return uc.rsvpRepo.GetBySeriesAndUser(ctx, seriesID, userID)
}

func (uc *PracticeUseCase) GetSessionRSVPs(ctx context.Context, sessionID string) ([]*domain.PracticeRSVP, error) {
	return uc.rsvpRepo.GetBySession(ctx, sessionID)
}

// GetSeriesDetail returns a series with sessions and user's RSVPs.
type SeriesDetail struct {
	Series   *domain.PracticeSeries    `json:"series"`
	Sessions []*domain.PracticeSession `json:"sessions"`
	MyRSVPs  []*domain.PracticeRSVP    `json:"myRsvps"`
}

func (uc *PracticeUseCase) GetSeriesDetail(ctx context.Context, seriesID, userID string) (*SeriesDetail, error) {
	series, err := uc.seriesRepo.GetByID(ctx, seriesID)
	if err != nil {
		return nil, err
	}
	sessions, err := uc.sessionRepo.GetBySeries(ctx, seriesID)
	if err != nil {
		return nil, err
	}
	myRSVPs, err := uc.rsvpRepo.GetBySeriesAndUser(ctx, seriesID, userID)
	if err != nil {
		return nil, err
	}
	return &SeriesDetail{
		Series:   series,
		Sessions: sessions,
		MyRSVPs:  myRSVPs,
	}, nil
}
