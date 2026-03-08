package domain

import "errors"

// Domain errors.
var (
	ErrNotFound      = errors.New("not found")
	ErrNotAuthorized = errors.New("not authorized")
	ErrForbidden     = errors.New("forbidden: not a target user")
	ErrInvalidInput  = errors.New("invalid input")
)
