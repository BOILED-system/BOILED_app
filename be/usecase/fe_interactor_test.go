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
