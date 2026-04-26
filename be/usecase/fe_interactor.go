package usecase

import (
	"context"
	"time"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/infra/discord"
	"github.com/noa/circle-app/api/usecase/port"
)

// FEInteractor handles all FE-compatible operations.
type FEInteractor struct {
	userRepo        port.FEUserRepository
	sessionRepo     port.FEPracticeSessionRepository
	rsvpRepo        port.FEPracticeRSVPRepository
	rosterRepo      port.NumberRosterRepository
	eventRepo       port.FEEventRepository
	settlementRepo  port.FESettlementRepository
	paymentRepo     port.FEPaymentRepository
	lineMessageRepo port.FELineMessageRepository
}

func NewFEInteractor(
	userRepo port.FEUserRepository,
	sessionRepo port.FEPracticeSessionRepository,
	rsvpRepo port.FEPracticeRSVPRepository,
	rosterRepo port.NumberRosterRepository,
	eventRepo port.FEEventRepository,
	settlementRepo port.FESettlementRepository,
	paymentRepo port.FEPaymentRepository,
	lineMessageRepo port.FELineMessageRepository,
) *FEInteractor {
	return &FEInteractor{
		userRepo:        userRepo,
		sessionRepo:     sessionRepo,
		rsvpRepo:        rsvpRepo,
		rosterRepo:      rosterRepo,
		eventRepo:       eventRepo,
		settlementRepo:  settlementRepo,
		paymentRepo:     paymentRepo,
		lineMessageRepo: lineMessageRepo,
	}
}

// ===== Users =====

func (i *FEInteractor) Login(ctx context.Context, memberID string) (*domain.FEUser, error) {
	return i.userRepo.GetByMemberID(ctx, memberID)
}

func (i *FEInteractor) GetUser(ctx context.Context, memberID string) (*domain.FEUser, error) {
	return i.userRepo.GetByMemberID(ctx, memberID)
}

func (i *FEInteractor) GetAllUsers(ctx context.Context) ([]*domain.FEUser, error) {
	return i.userRepo.GetAll(ctx)
}

// ===== Practice Sessions =====

func (i *FEInteractor) GetPracticeSessions(ctx context.Context) ([]*domain.FEPracticeSession, error) {
	return i.sessionRepo.GetAll(ctx)
}

func (i *FEInteractor) GetPracticeSession(ctx context.Context, id string) (*domain.FEPracticeSession, error) {
	return i.sessionRepo.GetByID(ctx, id)
}

func (i *FEInteractor) CreatePracticeSession(ctx context.Context, s *domain.FEPracticeSession) error {
	return i.sessionRepo.Create(ctx, s)
}

func (i *FEInteractor) UpdatePracticeSession(ctx context.Context, id string, data map[string]interface{}) error {
	return i.sessionRepo.Update(ctx, id, data)
}

func (i *FEInteractor) DeletePracticeSession(ctx context.Context, id string) error {
	return i.sessionRepo.Delete(ctx, id)
}

// SyncPracticesFromSheet は既存と重複しないセッションのみ登録する。
// 重複判定は date + name の組み合わせ。登録件数を返す。
func (i *FEInteractor) SyncPracticesFromSheet(ctx context.Context, sessions []*domain.FEPracticeSession) (int, error) {
	existing, err := i.sessionRepo.GetAll(ctx)
	if err != nil {
		return 0, err
	}
	existingKeys := make(map[string]struct{}, len(existing))
	for _, s := range existing {
		existingKeys[s.Date+"_"+s.Name] = struct{}{}
	}

	count := 0
	for _, s := range sessions {
		if _, dup := existingKeys[s.Date+"_"+s.Name]; dup {
			continue
		}
		if err := i.sessionRepo.Create(ctx, s); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

// ===== Practice RSVPs =====

func (i *FEInteractor) SubmitRSVP(ctx context.Context, sessionID string, rsvp *domain.FEPracticeRSVP) error {
	// Calculate if there was any actual change
	oldRSVP, _ := i.rsvpRepo.GetBySessionAndMember(ctx, sessionID, rsvp.MemberID)
	changed := true
	if oldRSVP != nil {
		if oldRSVP.Status == rsvp.Status && oldRSVP.Note == rsvp.Note {
			changed = false
		}
	}

	// Skip Firestore Upsert locally if there's no meaning in updating
	if !changed {
		return nil
	}

	err := i.rsvpRepo.Upsert(ctx, sessionID, rsvp)
	if err != nil {
		return err
	}

	// Trigger Discord webhook only for event practices submitted on the practice day (JST)
	session, err := i.sessionRepo.GetByID(ctx, sessionID)
	if err == nil && session != nil && session.Type == "event" {
		today := time.Now().In(time.FixedZone("JST", 9*60*60)).Format("2006-01-02")
		if session.Date == today {
			go discord.NotifyRSVP(context.Background(), session, oldRSVP, rsvp)
		}
	}

	return nil
}

func (i *FEInteractor) GetMyRSVP(ctx context.Context, sessionID, memberID string) (*domain.FEPracticeRSVP, error) {
	return i.rsvpRepo.GetBySessionAndMember(ctx, sessionID, memberID)
}

func (i *FEInteractor) GetMyRSVPs(ctx context.Context, memberID string) (map[string]*domain.FEPracticeRSVP, error) {
	return i.rsvpRepo.GetByMember(ctx, memberID)
}

func (i *FEInteractor) GetSessionRSVPs(ctx context.Context, sessionID string) ([]*domain.FEPracticeRSVP, error) {
	return i.rsvpRepo.GetBySession(ctx, sessionID)
}

// ===== Number Rosters =====

func (i *FEInteractor) GetNumberRosters(ctx context.Context) ([]*domain.NumberRoster, error) {
	return i.rosterRepo.GetAll(ctx)
}

func (i *FEInteractor) CreateNumberRoster(ctx context.Context, r *domain.NumberRoster) error {
	return i.rosterRepo.Create(ctx, r)
}

func (i *FEInteractor) UpdateNumberRoster(ctx context.Context, id string, data map[string]interface{}) error {
	return i.rosterRepo.Update(ctx, id, data)
}

func (i *FEInteractor) DeleteNumberRoster(ctx context.Context, id string) error {
	return i.rosterRepo.Delete(ctx, id)
}

// ===== Events =====

func (i *FEInteractor) GetEvents(ctx context.Context) ([]*domain.FEEvent, error) {
	return i.eventRepo.GetAll(ctx)
}

func (i *FEInteractor) GetEvent(ctx context.Context, id string) (*domain.FEEvent, error) {
	return i.eventRepo.GetByID(ctx, id)
}

func (i *FEInteractor) CreateEvent(ctx context.Context, e *domain.FEEvent) error {
	return i.eventRepo.Create(ctx, e)
}

func (i *FEInteractor) UpdateEvent(ctx context.Context, id string, data map[string]interface{}) error {
	return i.eventRepo.Update(ctx, id, data)
}

func (i *FEInteractor) DeleteEvent(ctx context.Context, id string) error {
	return i.eventRepo.Delete(ctx, id)
}

// ===== Settlements =====

func (i *FEInteractor) GetSettlements(ctx context.Context) ([]*domain.FESettlement, error) {
	return i.settlementRepo.GetAll(ctx)
}

func (i *FEInteractor) CreateSettlement(ctx context.Context, s *domain.FESettlement, payments []domain.FEPaymentRecord) error {
	if err := i.settlementRepo.Create(ctx, s); err != nil {
		return err
	}
	for _, p := range payments {
		if err := i.paymentRepo.Create(ctx, s.ID, &p); err != nil {
			return err
		}
	}
	return nil
}

func (i *FEInteractor) GetSettlementPayments(ctx context.Context, settlementID string) ([]*domain.FEPaymentRecord, error) {
	return i.paymentRepo.GetBySettlement(ctx, settlementID)
}

func (i *FEInteractor) ReportPayment(ctx context.Context, settlementID, memberID, method string, requiresConfirmation bool, cashCollectorID, cashCollectorName string) error {
	status := "confirmed"
	if requiresConfirmation {
		status = "reported"
	}
	data := map[string]interface{}{
		"status":         status,
		"reportedMethod": method,
		"reportedAt":     time.Now(),
	}
	if status == "confirmed" {
		data["confirmedAt"] = time.Now()
	} else {
		data["confirmedAt"] = nil
	}
	if cashCollectorID != "" {
		data["cashCollectorId"] = cashCollectorID
		data["cashCollectorName"] = cashCollectorName
	}
	return i.paymentRepo.Update(ctx, settlementID, memberID, data)
}

func (i *FEInteractor) UpdatePaymentStatus(ctx context.Context, settlementID, memberID, status string) error {
	data := map[string]interface{}{
		"status": status,
	}
	if status == "confirmed" {
		data["confirmedAt"] = time.Now()
	} else {
		data["confirmedAt"] = nil
	}
	return i.paymentRepo.Update(ctx, settlementID, memberID, data)
}

func (i *FEInteractor) UpdateSettlement(ctx context.Context, id string, data map[string]interface{}) error {
	return i.settlementRepo.Update(ctx, id, data)
}

func (i *FEInteractor) DeleteSettlement(ctx context.Context, id string) error {
	return i.settlementRepo.Delete(ctx, id)
}

func (i *FEInteractor) AddPaymentRecord(ctx context.Context, settlementID string, p *domain.FEPaymentRecord) error {
	s, err := i.settlementRepo.GetByID(ctx, settlementID)
	if err != nil {
		return err
	}
	for _, id := range s.ResolvedMemberIDs {
		if id == p.MemberID {
			return nil // already in settlement
		}
	}
	if err := i.paymentRepo.Create(ctx, settlementID, p); err != nil {
		return err
	}
	newResolved := append(s.ResolvedMemberIDs, p.MemberID)
	return i.settlementRepo.Update(ctx, settlementID, map[string]interface{}{
		"resolvedMemberIds": newResolved,
	})
}

// ===== LINE Messages =====

func (i *FEInteractor) SaveLineMessage(ctx context.Context, m *domain.FELineMessage) error {
	return i.lineMessageRepo.Save(ctx, m)
}

func (i *FEInteractor) GetLineMessages(ctx context.Context) ([]*domain.FELineMessage, error) {
	return i.lineMessageRepo.GetAll(ctx)
}

func (i *FEInteractor) GetLineMessagesByEvent(ctx context.Context, eventID string) ([]*domain.FELineMessage, error) {
	return i.lineMessageRepo.GetByEventID(ctx, eventID)
}

func (i *FEInteractor) LinkLineMessageToEvent(ctx context.Context, id, eventID string) error {
	return i.lineMessageRepo.LinkToEvent(ctx, id, eventID)
}

func (i *FEInteractor) LineMessageExists(ctx context.Context, lineMessageID string) (bool, error) {
	return i.lineMessageRepo.ExistsByLineMessageID(ctx, lineMessageID)
}
