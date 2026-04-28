package cache

import (
	"context"
	"fmt"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase/port"
)

// ===== FEUserRepository =====

type cachedFEUserRepo struct {
	inner port.FEUserRepository
	store *Store
}

func NewFEUserRepository(inner port.FEUserRepository, store *Store) port.FEUserRepository {
	return &cachedFEUserRepo{inner: inner, store: store}
}

func (r *cachedFEUserRepo) GetByMemberID(ctx context.Context, memberID string) (*domain.FEUser, error) {
	key := fmt.Sprintf("users:id:%s", memberID)
	if v, ok := r.store.Get(key); ok {
		return v.(*domain.FEUser), nil
	}
	u, err := r.inner.GetByMemberID(ctx, memberID)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, u, DefaultTTL)
	return u, nil
}

func (r *cachedFEUserRepo) GetAll(ctx context.Context) ([]*domain.FEUser, error) {
	const key = "users:all"
	if v, ok := r.store.Get(key); ok {
		return v.([]*domain.FEUser), nil
	}
	users, err := r.inner.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, users, DefaultTTL)
	return users, nil
}

func (r *cachedFEUserRepo) Save(ctx context.Context, u *domain.FEUser) error {
	if err := r.inner.Save(ctx, u); err != nil {
		return err
	}
	r.store.Delete("users:all", fmt.Sprintf("users:id:%s", u.MemberID))
	return nil
}

func (r *cachedFEUserRepo) Delete(ctx context.Context, memberID string) error {
	if err := r.inner.Delete(ctx, memberID); err != nil {
		return err
	}
	r.store.Delete("users:all", fmt.Sprintf("users:id:%s", memberID))
	return nil
}

// ===== FEPracticeSessionRepository =====

type cachedFEPracticeSessionRepo struct {
	inner port.FEPracticeSessionRepository
	store *Store
}

func NewFEPracticeSessionRepository(inner port.FEPracticeSessionRepository, store *Store) port.FEPracticeSessionRepository {
	return &cachedFEPracticeSessionRepo{inner: inner, store: store}
}

func (r *cachedFEPracticeSessionRepo) GetAll(ctx context.Context) ([]*domain.FEPracticeSession, error) {
	const key = "practice_sessions:all"
	if v, ok := r.store.Get(key); ok {
		return v.([]*domain.FEPracticeSession), nil
	}
	sessions, err := r.inner.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, sessions, DefaultTTL)
	return sessions, nil
}

func (r *cachedFEPracticeSessionRepo) GetByID(ctx context.Context, id string) (*domain.FEPracticeSession, error) {
	key := fmt.Sprintf("practice_sessions:id:%s", id)
	if v, ok := r.store.Get(key); ok {
		return v.(*domain.FEPracticeSession), nil
	}
	s, err := r.inner.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, s, DefaultTTL)
	return s, nil
}

func (r *cachedFEPracticeSessionRepo) Create(ctx context.Context, s *domain.FEPracticeSession) error {
	if err := r.inner.Create(ctx, s); err != nil {
		return err
	}
	r.store.Delete("practice_sessions:all")
	return nil
}

func (r *cachedFEPracticeSessionRepo) Update(ctx context.Context, id string, data map[string]interface{}) error {
	if err := r.inner.Update(ctx, id, data); err != nil {
		return err
	}
	r.store.Delete("practice_sessions:all", fmt.Sprintf("practice_sessions:id:%s", id))
	return nil
}

func (r *cachedFEPracticeSessionRepo) Delete(ctx context.Context, id string) error {
	if err := r.inner.Delete(ctx, id); err != nil {
		return err
	}
	r.store.Delete("practice_sessions:all", fmt.Sprintf("practice_sessions:id:%s", id))
	return nil
}

// ===== FEPracticeRSVPRepository =====

type cachedFEPracticeRSVPRepo struct {
	inner port.FEPracticeRSVPRepository
	store *Store
}

func NewFEPracticeRSVPRepository(inner port.FEPracticeRSVPRepository, store *Store) port.FEPracticeRSVPRepository {
	return &cachedFEPracticeRSVPRepo{inner: inner, store: store}
}

func (r *cachedFEPracticeRSVPRepo) GetBySession(ctx context.Context, sessionID string) ([]*domain.FEPracticeRSVP, error) {
	key := fmt.Sprintf("rsvps:session:%s", sessionID)
	if v, ok := r.store.Get(key); ok {
		return v.([]*domain.FEPracticeRSVP), nil
	}
	rsvps, err := r.inner.GetBySession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, rsvps, DefaultTTL)
	return rsvps, nil
}

func (r *cachedFEPracticeRSVPRepo) GetBySessionAndMember(ctx context.Context, sessionID, memberID string) (*domain.FEPracticeRSVP, error) {
	key := fmt.Sprintf("rsvps:session:%s:member:%s", sessionID, memberID)
	if v, ok := r.store.Get(key); ok {
		return v.(*domain.FEPracticeRSVP), nil
	}
	rsvp, err := r.inner.GetBySessionAndMember(ctx, sessionID, memberID)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, rsvp, DefaultTTL)
	return rsvp, nil
}

func (r *cachedFEPracticeRSVPRepo) GetByMember(ctx context.Context, memberID string) (map[string]*domain.FEPracticeRSVP, error) {
	key := fmt.Sprintf("rsvps:member:%s", memberID)
	if v, ok := r.store.Get(key); ok {
		return v.(map[string]*domain.FEPracticeRSVP), nil
	}
	rsvps, err := r.inner.GetByMember(ctx, memberID)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, rsvps, MemberRSVPTTL)
	return rsvps, nil
}

func (r *cachedFEPracticeRSVPRepo) Upsert(ctx context.Context, sessionID string, rsvp *domain.FEPracticeRSVP) error {
	if err := r.inner.Upsert(ctx, sessionID, rsvp); err != nil {
		return err
	}
	r.store.Delete(
		fmt.Sprintf("rsvps:session:%s", sessionID),
		fmt.Sprintf("rsvps:session:%s:member:%s", sessionID, rsvp.MemberID),
		fmt.Sprintf("rsvps:member:%s", rsvp.MemberID),
	)
	return nil
}

func (r *cachedFEPracticeRSVPRepo) DeleteByMember(ctx context.Context, memberID string) error {
	if err := r.inner.DeleteByMember(ctx, memberID); err != nil {
		return err
	}
	r.store.Clear()
	return nil
}

// ===== NumberRosterRepository =====

type cachedNumberRosterRepo struct {
	inner port.NumberRosterRepository
	store *Store
}

func NewNumberRosterRepository(inner port.NumberRosterRepository, store *Store) port.NumberRosterRepository {
	return &cachedNumberRosterRepo{inner: inner, store: store}
}

func (r *cachedNumberRosterRepo) GetAll(ctx context.Context) ([]*domain.NumberRoster, error) {
	const key = "rosters:all"
	if v, ok := r.store.Get(key); ok {
		return v.([]*domain.NumberRoster), nil
	}
	rosters, err := r.inner.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, rosters, DefaultTTL)
	return rosters, nil
}

func (r *cachedNumberRosterRepo) Create(ctx context.Context, roster *domain.NumberRoster) error {
	if err := r.inner.Create(ctx, roster); err != nil {
		return err
	}
	r.store.Delete("rosters:all")
	return nil
}

func (r *cachedNumberRosterRepo) Update(ctx context.Context, id string, data map[string]interface{}) error {
	if err := r.inner.Update(ctx, id, data); err != nil {
		return err
	}
	r.store.Delete("rosters:all")
	return nil
}

func (r *cachedNumberRosterRepo) Delete(ctx context.Context, id string) error {
	if err := r.inner.Delete(ctx, id); err != nil {
		return err
	}
	r.store.Delete("rosters:all")
	return nil
}

func (r *cachedNumberRosterRepo) RemoveMemberFromAll(ctx context.Context, memberID string) error {
	if err := r.inner.RemoveMemberFromAll(ctx, memberID); err != nil {
		return err
	}
	r.store.Delete("rosters:all")
	return nil
}

// ===== FEEventRepository =====

type cachedFEEventRepo struct {
	inner port.FEEventRepository
	store *Store
}

func NewFEEventRepository(inner port.FEEventRepository, store *Store) port.FEEventRepository {
	return &cachedFEEventRepo{inner: inner, store: store}
}

func (r *cachedFEEventRepo) GetAll(ctx context.Context) ([]*domain.FEEvent, error) {
	const key = "events:all"
	if v, ok := r.store.Get(key); ok {
		return v.([]*domain.FEEvent), nil
	}
	events, err := r.inner.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, events, DefaultTTL)
	return events, nil
}

func (r *cachedFEEventRepo) GetByID(ctx context.Context, id string) (*domain.FEEvent, error) {
	key := fmt.Sprintf("events:id:%s", id)
	if v, ok := r.store.Get(key); ok {
		return v.(*domain.FEEvent), nil
	}
	e, err := r.inner.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, e, DefaultTTL)
	return e, nil
}

func (r *cachedFEEventRepo) Create(ctx context.Context, e *domain.FEEvent) error {
	if err := r.inner.Create(ctx, e); err != nil {
		return err
	}
	r.store.Delete("events:all")
	return nil
}

func (r *cachedFEEventRepo) Update(ctx context.Context, id string, data map[string]interface{}) error {
	if err := r.inner.Update(ctx, id, data); err != nil {
		return err
	}
	r.store.Delete("events:all", fmt.Sprintf("events:id:%s", id))
	return nil
}

func (r *cachedFEEventRepo) Delete(ctx context.Context, id string) error {
	if err := r.inner.Delete(ctx, id); err != nil {
		return err
	}
	r.store.Delete("events:all", fmt.Sprintf("events:id:%s", id))
	return nil
}

// ===== FESettlementRepository =====

type cachedFESettlementRepo struct {
	inner port.FESettlementRepository
	store *Store
}

func NewFESettlementRepository(inner port.FESettlementRepository, store *Store) port.FESettlementRepository {
	return &cachedFESettlementRepo{inner: inner, store: store}
}

func (r *cachedFESettlementRepo) GetAll(ctx context.Context) ([]*domain.FESettlement, error) {
	const key = "settlements:all"
	if v, ok := r.store.Get(key); ok {
		return v.([]*domain.FESettlement), nil
	}
	settlements, err := r.inner.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, settlements, DefaultTTL)
	return settlements, nil
}

func (r *cachedFESettlementRepo) GetByID(ctx context.Context, id string) (*domain.FESettlement, error) {
	key := fmt.Sprintf("settlements:id:%s", id)
	if v, ok := r.store.Get(key); ok {
		return v.(*domain.FESettlement), nil
	}
	s, err := r.inner.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, s, DefaultTTL)
	return s, nil
}

func (r *cachedFESettlementRepo) Create(ctx context.Context, s *domain.FESettlement) error {
	if err := r.inner.Create(ctx, s); err != nil {
		return err
	}
	r.store.Delete("settlements:all")
	return nil
}

func (r *cachedFESettlementRepo) Update(ctx context.Context, id string, data map[string]interface{}) error {
	if err := r.inner.Update(ctx, id, data); err != nil {
		return err
	}
	r.store.Delete("settlements:all", fmt.Sprintf("settlements:id:%s", id))
	return nil
}

func (r *cachedFESettlementRepo) Delete(ctx context.Context, id string) error {
	if err := r.inner.Delete(ctx, id); err != nil {
		return err
	}
	r.store.Delete("settlements:all", fmt.Sprintf("settlements:id:%s", id))
	return nil
}

// ===== FEPaymentRepository =====

type cachedFEPaymentRepo struct {
	inner port.FEPaymentRepository
	store *Store
}

func NewFEPaymentRepository(inner port.FEPaymentRepository, store *Store) port.FEPaymentRepository {
	return &cachedFEPaymentRepo{inner: inner, store: store}
}

func (r *cachedFEPaymentRepo) GetBySettlement(ctx context.Context, settlementID string) ([]*domain.FEPaymentRecord, error) {
	key := fmt.Sprintf("payments:settlement:%s", settlementID)
	if v, ok := r.store.Get(key); ok {
		return v.([]*domain.FEPaymentRecord), nil
	}
	payments, err := r.inner.GetBySettlement(ctx, settlementID)
	if err != nil {
		return nil, err
	}
	r.store.Set(key, payments, DefaultTTL)
	return payments, nil
}

func (r *cachedFEPaymentRepo) Create(ctx context.Context, settlementID string, p *domain.FEPaymentRecord) error {
	if err := r.inner.Create(ctx, settlementID, p); err != nil {
		return err
	}
	r.store.Delete(fmt.Sprintf("payments:settlement:%s", settlementID))
	return nil
}

func (r *cachedFEPaymentRepo) Update(ctx context.Context, settlementID, memberID string, data map[string]interface{}) error {
	if err := r.inner.Update(ctx, settlementID, memberID, data); err != nil {
		return err
	}
	r.store.Delete(fmt.Sprintf("payments:settlement:%s", settlementID))
	return nil
}

func (r *cachedFEPaymentRepo) DeleteByMember(ctx context.Context, memberID string) error {
	if err := r.inner.DeleteByMember(ctx, memberID); err != nil {
		return err
	}
	r.store.Clear()
	return nil
}
