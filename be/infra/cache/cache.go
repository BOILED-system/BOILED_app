// Package cache provides a simple in-memory TTL cache for repository decorators.
package cache

import (
	"sync"
	"time"
)

const DefaultTTL = 5 * time.Minute

type entry struct {
	value     any
	expiresAt time.Time
}

// Store is a thread-safe in-memory key-value cache with TTL.
type Store struct {
	mu    sync.RWMutex
	items map[string]entry
}

func NewStore() *Store {
	s := &Store{items: make(map[string]entry)}
	go s.evictLoop()
	return s
}

func (s *Store) Get(key string) (any, bool) {
	s.mu.RLock()
	e, ok := s.items[key]
	s.mu.RUnlock()
	if !ok || time.Now().After(e.expiresAt) {
		return nil, false
	}
	return e.value, true
}

func (s *Store) Set(key string, value any, ttl time.Duration) {
	s.mu.Lock()
	s.items[key] = entry{value: value, expiresAt: time.Now().Add(ttl)}
	s.mu.Unlock()
}

// Delete removes one or more keys.
func (s *Store) Delete(keys ...string) {
	s.mu.Lock()
	for _, k := range keys {
		delete(s.items, k)
	}
	s.mu.Unlock()
}

// evictLoop cleans up expired entries every minute.
func (s *Store) evictLoop() {
	t := time.NewTicker(time.Minute)
	for range t.C {
		now := time.Now()
		s.mu.Lock()
		for k, e := range s.items {
			if now.After(e.expiresAt) {
				delete(s.items, k)
			}
		}
		s.mu.Unlock()
	}
}
