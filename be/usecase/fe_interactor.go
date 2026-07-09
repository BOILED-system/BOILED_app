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

func (i *FEInteractor) CreateUser(ctx context.Context, u *domain.FEUser) error {
	existing, _ := i.userRepo.GetByMemberID(ctx, u.MemberID)
	if existing != nil {
		return domain.ErrAlreadyExists
	}
	u.UpdatedAt = time.Now()
	return i.userRepo.Save(ctx, u)
}

// UpdateUser overwrites an existing user's profile fields.
func (i *FEInteractor) UpdateUser(ctx context.Context, u *domain.FEUser) error {
	existing, err := i.userRepo.GetByMemberID(ctx, u.MemberID)
	if err != nil || existing == nil {
		return domain.ErrNotFound
	}
	u.UpdatedAt = time.Now()
	return i.userRepo.Save(ctx, u)
}

// DeleteUser removes a user and all related records (RSVPs, payments, roster memberships).
func (i *FEInteractor) DeleteUser(ctx context.Context, memberID string) error {
	if _, err := i.userRepo.GetByMemberID(ctx, memberID); err != nil {
		return domain.ErrNotFound
	}
	if err := i.rsvpRepo.DeleteByMember(ctx, memberID); err != nil {
		return err
	}
	if err := i.paymentRepo.DeleteByMember(ctx, memberID); err != nil {
		return err
	}
	if err := i.rosterRepo.RemoveMemberFromAll(ctx, memberID); err != nil {
		return err
	}
	return i.userRepo.Delete(ctx, memberID)
}

// ===== Practice Sessions =====

func (i *FEInteractor) GetPracticeSessions(ctx context.Context) ([]*domain.FEPracticeSession, error) {
	return i.sessionRepo.GetAll(ctx)
}

func (i *FEInteractor) GetPracticeSession(ctx context.Context, id string) (*domain.FEPracticeSession, error) {
	return i.sessionRepo.GetByID(ctx, id)
}

func (i *FEInteractor) CreatePracticeSession(ctx context.Context, s *domain.FEPracticeSession) error {
	now := time.Now()
	s.UpdatedAt = &now
	return i.sessionRepo.Create(ctx, s)
}

func (i *FEInteractor) UpdatePracticeSession(ctx context.Context, id string, data map[string]interface{}) error {
	data["updatedAt"] = time.Now()
	return i.sessionRepo.Update(ctx, id, data)
}

func (i *FEInteractor) DeletePracticeSession(ctx context.Context, id string) error {
	return i.sessionRepo.Delete(ctx, id)
}

// syncKey はシート同期の重複判定キー。
// 同じ日に通常練と深夜練が両方あるケース（例: 日曜練 + その夜の深夜練）を
// 別セッションとして扱えるよう、isOvernight を含める。
func syncKey(s *domain.FEPracticeSession) string {
	k := s.Date + "_" + s.Name
	if s.IsOvernight {
		k += "_night"
	}
	return k
}

// SyncPracticesFromSheet は date+name+isOvernight をキーに重複チェックし、last-write-wins でセッションを同期する。
//
// 判定ロジック:
//   - 新規（Firestoreに存在しない）→ 作成。同名の既存セッションがあればそのターゲット設定を継承する
//     （シート同期は genre_generation しか送れないため、アプリで名簿型等に変更済みの
//     プロジェクトへ追加された日程が対象者設定を引き継げるようにする）
//   - 既存で updatedAt > sheetSyncedAt → 最後のシート同期後にアプリで編集されている → スキップ
//   - 既存で updatedAt <= sheetSyncedAt（またはどちらも未設定）→ シートが最新 → スケジュール系フィールドを上書き
//
// 上書き対象フィールド: date/startTime/endTime/endDate/isOvernight/location/type/targetGenres
// 保護するフィールド: note/targetType/targetMemberIds/additionalMemberIds/excludedMemberIds など
// 戻り値は作成件数と更新件数。
func (i *FEInteractor) SyncPracticesFromSheet(ctx context.Context, sessions []*domain.FEPracticeSession) (int, error) {
	existing, err := i.sessionRepo.GetAll(ctx)
	if err != nil {
		return 0, err
	}
	existingMap := make(map[string]*domain.FEPracticeSession, len(existing))
	// 同名プロジェクトで最後に更新されたセッション（新規作成時のターゲット設定の継承元）
	latestByName := make(map[string]*domain.FEPracticeSession, len(existing))
	for _, s := range existing {
		existingMap[syncKey(s)] = s
		cur, ok := latestByName[s.Name]
		if !ok || (s.UpdatedAt != nil && (cur.UpdatedAt == nil || s.UpdatedAt.After(*cur.UpdatedAt))) {
			latestByName[s.Name] = s
		}
	}

	now := time.Now()
	created := 0
	for _, s := range sessions {
		old, dup := existingMap[syncKey(s)]
		if !dup {
			// 同名プロジェクトの既存セッションからターゲット設定を継承する。
			// additionalMemberIds/excludedMemberIds は日程ごとの個別調整なので継承しない。
			if sib, ok := latestByName[s.Name]; ok && sib.TargetType != "" {
				s.TargetType = sib.TargetType
				s.TargetGenres = sib.TargetGenres
				s.TargetGenerations = sib.TargetGenerations
				s.TargetNumberID = sib.TargetNumberID
				s.TargetMemberIDs = sib.TargetMemberIDs
			}
			s.UpdatedAt = &now
			s.SheetSyncedAt = &now
			if err := i.sessionRepo.Create(ctx, s); err != nil {
				return created, err
			}
			created++
			continue
		}

		// last-write-wins: アプリが最後のシート同期より後に編集していたらスキップ
		if old.UpdatedAt != nil && old.SheetSyncedAt != nil && old.UpdatedAt.After(*old.SheetSyncedAt) {
			continue
		}

		updates := map[string]interface{}{
			"date":          s.Date,
			"startTime":     s.StartTime,
			"endTime":       s.EndTime,
			"location":      s.Location,
			"type":          s.Type,
			"targetGenres":  s.TargetGenres,
			"isOvernight":   s.IsOvernight,
			"endDate":       s.EndDate,
			"updatedAt":     now,
			"sheetSyncedAt": now,
		}
		if err := i.sessionRepo.Update(ctx, old.ID, updates); err != nil {
			return created, err
		}
	}
	return created, nil
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

// GetMyPayments returns all payment records for the given member across every settlement,
// keyed by settlement ID. Backed by a Firestore collection group query.
func (i *FEInteractor) GetMyPayments(ctx context.Context, memberID string) (map[string]*domain.FEPaymentRecord, error) {
	return i.paymentRepo.GetByMember(ctx, memberID)
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
