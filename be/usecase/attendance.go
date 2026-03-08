// AttendanceUsecase は未実装のためコメントアウト。
// domain.Attendance / AttendanceRepository 等が定義されたら有効化すること。
package usecase

/*
import (
	"context"

	"github.com/noa/circle-app/api/domain"
)

// AttendanceUsecase handles attendance-related business logic.
type AttendanceUsecase struct {
	attendanceRepo   domain.AttendanceRepository
	announcementRepo domain.AnnouncementRepository
}

// NewAttendanceUsecase creates a new AttendanceUsecase.
func NewAttendanceUsecase(
	attendanceRepo domain.AttendanceRepository,
	announcementRepo domain.AnnouncementRepository,
) *AttendanceUsecase {
	return &AttendanceUsecase{
		attendanceRepo:   attendanceRepo,
		announcementRepo: announcementRepo,
	}
}

// Update updates attendance. Only allows updating own attendance.
func (u *AttendanceUsecase) Update(ctx context.Context, attendance *domain.Attendance) error {
	// Verify user is target of announcement
	announcement, err := u.announcementRepo.GetByID(ctx, attendance.AnnouncementID)
	if err != nil {
		return err
	}

	isTarget := false
	for _, targetID := range announcement.TargetUserIDs {
		if targetID == attendance.UserID {
			isTarget = true
			break
		}
	}

	if !isTarget {
		return ErrNotAuthorized
	}

	return u.attendanceRepo.Upsert(ctx, attendance)
}

// GetByAnnouncement returns all attendances for an announcement.
func (u *AttendanceUsecase) GetByAnnouncement(ctx context.Context, announcementID string) ([]*domain.Attendance, error) {
	return u.attendanceRepo.GetByAnnouncement(ctx, announcementID)
}
*/
