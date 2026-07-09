package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/noa/circle-app/api/domain"
)

// fakeSessionRepo is an in-memory FEPracticeSessionRepository for tests.
type fakeSessionRepo struct {
	sessions []*domain.FEPracticeSession
	created  []*domain.FEPracticeSession
	updated  map[string]map[string]interface{}
}

func (f *fakeSessionRepo) Create(ctx context.Context, s *domain.FEPracticeSession) error {
	f.created = append(f.created, s)
	return nil
}
func (f *fakeSessionRepo) GetAll(ctx context.Context) ([]*domain.FEPracticeSession, error) {
	return f.sessions, nil
}
func (f *fakeSessionRepo) GetByID(ctx context.Context, id string) (*domain.FEPracticeSession, error) {
	for _, s := range f.sessions {
		if s.ID == id {
			return s, nil
		}
	}
	return nil, nil
}
func (f *fakeSessionRepo) Update(ctx context.Context, id string, data map[string]interface{}) error {
	if f.updated == nil {
		f.updated = map[string]map[string]interface{}{}
	}
	f.updated[id] = data
	return nil
}
func (f *fakeSessionRepo) Delete(ctx context.Context, id string) error { return nil }

func newTestInteractor(repo *fakeSessionRepo) *FEInteractor {
	return &FEInteractor{sessionRepo: repo}
}

func tp(t time.Time) *time.Time { return &t }

func TestSyncPracticesFromSheet_InheritsTargetFromSameNameSession(t *testing.T) {
	old := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	newer := time.Date(2026, 7, 2, 0, 0, 0, 0, time.UTC)
	repo := &fakeSessionRepo{
		sessions: []*domain.FEPracticeSession{
			{
				ID: "s1", Name: "夏イベ期Waack", Date: "2026-08-02",
				TargetType: "genre_generation", TargetGenres: []string{"Waack"},
				UpdatedAt: tp(old),
			},
			{
				// 最後に更新されたセッションのターゲット設定が継承されること
				ID: "s2", Name: "夏イベ期Waack", Date: "2026-08-04",
				TargetType: "number", TargetNumberID: "roster-natsu-waack",
				TargetGenres: []string{"Waack"},
				UpdatedAt:    tp(newer),
			},
		},
	}
	i := newTestInteractor(repo)

	created, err := i.SyncPracticesFromSheet(context.Background(), []*domain.FEPracticeSession{
		{
			Name: "夏イベ期Waack", Date: "2026-08-06", EndDate: "2026-08-07", IsOvernight: true,
			TargetType: "genre_generation", TargetGenres: []string{"Waack"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created != 1 || len(repo.created) != 1 {
		t.Fatalf("created = %d, want 1", created)
	}
	got := repo.created[0]
	if got.TargetType != "number" {
		t.Errorf("TargetType = %q, want %q", got.TargetType, "number")
	}
	if got.TargetNumberID != "roster-natsu-waack" {
		t.Errorf("TargetNumberID = %q, want %q", got.TargetNumberID, "roster-natsu-waack")
	}
	if !got.IsOvernight || got.EndDate != "2026-08-07" {
		t.Errorf("schedule fields should be kept from sheet: %+v", got)
	}
}

func TestSyncPracticesFromSheet_KeepsSheetTargetForNewProject(t *testing.T) {
	repo := &fakeSessionRepo{}
	i := newTestInteractor(repo)

	_, err := i.SyncPracticesFromSheet(context.Background(), []*domain.FEPracticeSession{
		{Name: "新プロジェクト", Date: "2026-08-06", TargetType: "genre_generation", TargetGenres: []string{"Lock"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	got := repo.created[0]
	if got.TargetType != "genre_generation" || len(got.TargetGenres) != 1 || got.TargetGenres[0] != "Lock" {
		t.Errorf("sheet targeting should be kept for brand-new project: %+v", got)
	}
}

func TestSyncPracticesFromSheet_NoInheritFromEmptyTargetType(t *testing.T) {
	repo := &fakeSessionRepo{
		sessions: []*domain.FEPracticeSession{
			// targetType未設定のレガシーセッションからは継承しない
			{ID: "s1", Name: "夏イベ期Lock", Date: "2026-08-02", TargetType: "", UpdatedAt: tp(time.Now())},
		},
	}
	i := newTestInteractor(repo)

	_, err := i.SyncPracticesFromSheet(context.Background(), []*domain.FEPracticeSession{
		{Name: "夏イベ期Lock", Date: "2026-08-06", TargetType: "genre_generation", TargetGenres: []string{"Lock"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	got := repo.created[0]
	if got.TargetType != "genre_generation" || len(got.TargetGenres) != 1 || got.TargetGenres[0] != "Lock" {
		t.Errorf("should keep sheet targeting when sibling has empty targetType: %+v", got)
	}
}

func TestSyncPracticesFromSheet_OvernightCoexistsWithSameDaySession(t *testing.T) {
	synced := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	edited := synced.Add(time.Hour)
	repo := &fakeSessionRepo{
		sessions: []*domain.FEPracticeSession{
			// 同じ日に通常練（日曜練）が既に存在し、アプリで編集済み
			{
				ID: "s1", Name: "夏イベ期下級Hiphop2", Date: "2026-09-06",
				StartTime: "19:45", EndTime: "22:00", Location: "花伝舎B3",
				TargetType: "number", TargetNumberID: "roster-hip2",
				UpdatedAt: tp(edited), SheetSyncedAt: tp(synced),
			},
		},
	}
	i := newTestInteractor(repo)

	// 同日の深夜練は別セッションとして新規作成されること
	created, err := i.SyncPracticesFromSheet(context.Background(), []*domain.FEPracticeSession{
		{
			Name: "夏イベ期下級Hiphop2", Date: "2026-09-06", EndDate: "2026-09-07",
			IsOvernight: true, Location: "ワークル大久保201",
			TargetType: "genre_generation", TargetGenres: []string{"下級Hiphop2"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created != 1 || len(repo.created) != 1 {
		t.Fatalf("overnight session must be created alongside same-day session: created=%d", created)
	}
	got := repo.created[0]
	if !got.IsOvernight || got.EndDate != "2026-09-07" {
		t.Errorf("created session should be overnight: %+v", got)
	}
	// ターゲット設定は同名セッションから継承されること
	if got.TargetType != "number" || got.TargetNumberID != "roster-hip2" {
		t.Errorf("should inherit number targeting: type=%q numberId=%q", got.TargetType, got.TargetNumberID)
	}
	// 既存の通常練は触られないこと
	if len(repo.updated) != 0 {
		t.Errorf("existing same-day session must not be updated: %v", repo.updated)
	}
}

func TestScheduleConflicts(t *testing.T) {
	old := &domain.FEPracticeSession{
		Name: "夏イベ期Waack", Date: "2099-08-06", IsOvernight: true,
		StartTime: "9:00", EndTime: "11:00", Location: "桜丘レンタルスタジオ", Type: "event",
	}
	// 表記ゆれ("09:00" vs "9:00")は差分にしない
	same := &domain.FEPracticeSession{
		Name: "夏イベ期Waack", Date: "2099-08-06", IsOvernight: true,
		StartTime: "09:00", EndTime: "11:00", Location: " 桜丘レンタルスタジオ ", Type: "event",
	}
	if got := scheduleConflicts(old, same); len(got) != 0 {
		t.Errorf("normalized-equal sessions should have no conflicts: %+v", got)
	}

	diff := &domain.FEPracticeSession{
		Name: "夏イベ期Waack", Date: "2099-08-06", IsOvernight: true,
		StartTime: "10:00", EndTime: "11:00", Location: "ワークル大久保302", Type: "event",
	}
	got := scheduleConflicts(old, diff)
	if len(got) != 2 {
		t.Fatalf("want 2 conflicts (場所+開始時間), got %d: %+v", len(got), got)
	}
	if got[0].Field != "場所" || got[0].AppValue != "桜丘レンタルスタジオ" || got[0].SheetValue != "ワークル大久保302" {
		t.Errorf("unexpected location conflict: %+v", got[0])
	}
	if got[1].Field != "開始時間" || !got[1].IsOvernight {
		t.Errorf("unexpected start-time conflict: %+v", got[1])
	}
}

func TestNormalizeLocationStr(t *testing.T) {
	// 実際の通知に出ていた表記ゆれノイズ：正規化後は同一視されること
	same := [][2]string{
		{"マイスタ 5B", "マイスタ5B"},
		{"studio worcle 代々木 601", "ワークル代々木601"},
		{"スタジオよもだ B4", "よもだB4"},
		{"BUZZ渋谷TOWER 4-2st", "buzz渋谷TOWER 4-2st"},
		{"worcle大久保101", "ワークル大久保101"},
	}
	for _, p := range same {
		if normalizeLocationStr(p[0]) != normalizeLocationStr(p[1]) {
			t.Errorf("%q and %q should normalize to the same value: %q vs %q",
				p[0], p[1], normalizeLocationStr(p[0]), normalizeLocationStr(p[1]))
		}
	}
	// 本当に違う場所は区別されること
	diff := [][2]string{
		{"桜丘レンタルスタジオ", "ワークル大久保302"},
		{"ワークル大久保201", "ワークル大久保301"},
		{"マイスタ 5A", "マイスタ4A20-22"},
	}
	for _, p := range diff {
		if normalizeLocationStr(p[0]) == normalizeLocationStr(p[1]) {
			t.Errorf("%q and %q must remain different", p[0], p[1])
		}
	}
}

func TestScheduleConflicts_IgnoresLocationNotationNoise(t *testing.T) {
	old := &domain.FEPracticeSession{Name: "夏イベ期Waack", Date: "2099-08-09", Location: "studio worcle 代々木 601", StartTime: "20:00", EndTime: "22:00"}
	sheet := &domain.FEPracticeSession{Name: "夏イベ期Waack", Date: "2099-08-09", Location: "ワークル代々木601", StartTime: "20:00", EndTime: "22:00"}
	if got := scheduleConflicts(old, sheet); len(got) != 0 {
		t.Errorf("notation-only location difference should not be a conflict: %+v", got)
	}
}

func TestSyncPracticesFromSheet_CollectsConflictsForProtectedSessions(t *testing.T) {
	synced := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	edited := synced.Add(time.Hour)
	repo := &fakeSessionRepo{
		sessions: []*domain.FEPracticeSession{
			{ // 未来日・アプリ編集済み・シートと場所が食い違う → 通知対象
				ID: "s1", Name: "夏イベ期Waack", Date: "2099-08-06", IsOvernight: true,
				Location: "桜丘レンタルスタジオ",
				UpdatedAt: tp(edited), SheetSyncedAt: tp(synced),
			},
			{ // 過去日 → 食い違っていても通知しない
				ID: "s2", Name: "夏イベ期Waack", Date: "2000-01-01",
				Location: "旧スタジオ",
				UpdatedAt: tp(edited), SheetSyncedAt: tp(synced),
			},
		},
	}
	i := newTestInteractor(repo)

	_, conflicts, err := i.syncPracticesFromSheet(context.Background(), []*domain.FEPracticeSession{
		{Name: "夏イベ期Waack", Date: "2099-08-06", IsOvernight: true, Location: "ワークル大久保302"},
		{Name: "夏イベ期Waack", Date: "2000-01-01", Location: "別スタジオ"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(conflicts) != 1 {
		t.Fatalf("want 1 conflict, got %d: %+v", len(conflicts), conflicts)
	}
	c := conflicts[0]
	if c.SessionName != "夏イベ期Waack" || c.Date != "2099-08-06" || c.Field != "場所" ||
		c.AppValue != "桜丘レンタルスタジオ" || c.SheetValue != "ワークル大久保302" {
		t.Errorf("unexpected conflict: %+v", c)
	}
	// 保護されたセッションは上書きされないこと
	if len(repo.updated) != 0 {
		t.Errorf("protected sessions must not be updated: %v", repo.updated)
	}
}

func TestSyncPracticesFromSheet_NoConflictWhenSheetWins(t *testing.T) {
	synced := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	repo := &fakeSessionRepo{
		sessions: []*domain.FEPracticeSession{
			{ // 保護されていない（updatedAt == sheetSyncedAt）→ 普通に上書きされ通知なし
				ID: "s1", Name: "夏イベ期Waack", Date: "2099-08-06",
				Location:  "旧スタジオ",
				UpdatedAt: tp(synced), SheetSyncedAt: tp(synced),
			},
		},
	}
	i := newTestInteractor(repo)

	_, conflicts, err := i.syncPracticesFromSheet(context.Background(), []*domain.FEPracticeSession{
		{Name: "夏イベ期Waack", Date: "2099-08-06", Location: "新スタジオ"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(conflicts) != 0 {
		t.Errorf("overwritten session must not be reported as conflict: %+v", conflicts)
	}
	if len(repo.updated) != 1 {
		t.Errorf("unprotected session should be updated: %v", repo.updated)
	}
}

func TestSyncPracticesFromSheet_SkipsAppEditedSession(t *testing.T) {
	synced := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	edited := synced.Add(time.Hour)
	repo := &fakeSessionRepo{
		sessions: []*domain.FEPracticeSession{
			{
				ID: "s1", Name: "夏イベ期Waack", Date: "2026-08-06",
				UpdatedAt: tp(edited), SheetSyncedAt: tp(synced),
			},
		},
	}
	i := newTestInteractor(repo)

	created, err := i.SyncPracticesFromSheet(context.Background(), []*domain.FEPracticeSession{
		{Name: "夏イベ期Waack", Date: "2026-08-06", Location: "新しい場所"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created != 0 || len(repo.created) != 0 || len(repo.updated) != 0 {
		t.Errorf("app-edited session must be skipped: created=%d updated=%v", created, repo.updated)
	}
}
