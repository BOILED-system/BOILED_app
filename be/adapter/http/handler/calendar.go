package handler

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase"
)

type CalendarHandler struct {
	interactor *usecase.FEInteractor
}

func NewCalendarHandler(i *usecase.FEInteractor) *CalendarHandler {
	return &CalendarHandler{interactor: i}
}

// PracticesICal handles GET /api/calendar/practices.ics?memberId=xxx
// Returns iCal feed of practices the given member is targeted in.
func (h *CalendarHandler) PracticesICal(w http.ResponseWriter, r *http.Request) {
	memberID := r.URL.Query().Get("memberId")
	if memberID == "" {
		http.Error(w, "memberId is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	user, err := h.interactor.GetUser(ctx, memberID)
	if err != nil || user == nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}
	sessions, err := h.interactor.GetPracticeSessions(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	rosters, err := h.interactor.GetNumberRosters(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jst := jstLocation()
	now := time.Now().UTC().Format("20060102T150405Z")

	var b strings.Builder
	writeICalHeader(&b, "BOILED 練習")

	for _, s := range sessions {
		if !isSessionForMember(s, memberID, user, rosters) {
			continue
		}
		startUTC, endUTC, ok := parseSessionRange(s.Date, s.StartTime, s.EndTime, jst)
		if !ok {
			continue
		}
		summary := s.Name
		if s.Location != "" {
			summary = s.Name + " / " + s.Location
		}
		writeVEvent(&b, "practice-"+s.ID, now, startUTC, endUTC, summary, s.Location)
	}

	b.WriteString("END:VCALENDAR\r\n")
	writeICalResponse(w, "boiled-practices.ics", b.String())
}

// EventsICal handles GET /api/calendar/events.ics
// Returns iCal feed of all events (events are not member-specific).
func (h *CalendarHandler) EventsICal(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	events, err := h.interactor.GetEvents(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jst := jstLocation()
	now := time.Now().UTC().Format("20060102T150405Z")

	var b strings.Builder
	writeICalHeader(&b, "BOILED イベント")

	for _, e := range events {
		if e.Date == "" {
			continue
		}
		summary := e.Title
		loc := e.Location
		if loc == "" {
			loc = e.MeetingLocation
		}
		if loc != "" {
			summary = e.Title + " / " + loc
		}
		writeAllDayVEvent(&b, "event-"+e.ID, now, e.Date, e.EndDate, summary, loc)
	}
	_ = jst

	b.WriteString("END:VCALENDAR\r\n")
	writeICalResponse(w, "boiled-events.ics", b.String())
}

// ===== iCal helpers =====

func writeICalHeader(b *strings.Builder, calName string) {
	b.WriteString("BEGIN:VCALENDAR\r\n")
	b.WriteString("VERSION:2.0\r\n")
	b.WriteString("PRODID:-//BOILED//Calendar//JA\r\n")
	b.WriteString("CALSCALE:GREGORIAN\r\n")
	b.WriteString("METHOD:PUBLISH\r\n")
	b.WriteString("X-WR-CALNAME:" + calName + "\r\n")
	b.WriteString("X-WR-TIMEZONE:Asia/Tokyo\r\n")
}

func writeAllDayVEvent(b *strings.Builder, uid, dtstamp, date, endDate, summary, location string) {
	d := strings.ReplaceAll(date, "-", "")
	// DTEND is exclusive: use endDate+1 day for multi-day, or date+1 day for single-day
	var nextDay string
	if endDate != "" {
		ed := strings.ReplaceAll(endDate, "-", "")
		t, err := time.Parse("20060102", ed)
		if err == nil {
			nextDay = t.AddDate(0, 0, 1).Format("20060102")
		} else {
			nextDay = ed
		}
	} else {
		t, err := time.Parse("20060102", d)
		nextDay = d
		if err == nil {
			nextDay = t.AddDate(0, 0, 1).Format("20060102")
		}
	}
	b.WriteString("BEGIN:VEVENT\r\n")
	b.WriteString("UID:" + uid + "@boiled\r\n")
	b.WriteString("DTSTAMP:" + dtstamp + "\r\n")
	b.WriteString("DTSTART;VALUE=DATE:" + d + "\r\n")
	b.WriteString("DTEND;VALUE=DATE:" + nextDay + "\r\n")
	b.WriteString("SUMMARY:" + escapeICalText(summary) + "\r\n")
	if location != "" {
		b.WriteString("LOCATION:" + escapeICalText(location) + "\r\n")
	}
	b.WriteString("END:VEVENT\r\n")
}

func writeVEvent(b *strings.Builder, uid, dtstamp, dtstart, dtend, summary, location string) {
	b.WriteString("BEGIN:VEVENT\r\n")
	b.WriteString("UID:" + uid + "@boiled\r\n")
	b.WriteString("DTSTAMP:" + dtstamp + "\r\n")
	b.WriteString("DTSTART:" + dtstart + "\r\n")
	b.WriteString("DTEND:" + dtend + "\r\n")
	b.WriteString("SUMMARY:" + escapeICalText(summary) + "\r\n")
	if location != "" {
		b.WriteString("LOCATION:" + escapeICalText(location) + "\r\n")
	}
	b.WriteString("END:VEVENT\r\n")
}

func writeICalResponse(w http.ResponseWriter, filename, body string) {
	w.Header().Set("Content-Type", "text/calendar; charset=utf-8")
	w.Header().Set("Content-Disposition", "inline; filename="+filename)
	w.Header().Set("Cache-Control", "public, max-age=300")
	_, _ = w.Write([]byte(body))
}

// jstLocation returns Asia/Tokyo, falling back to a fixed UTC+9 offset when
// the container image lacks tzdata.
func jstLocation() *time.Location {
	if loc, err := time.LoadLocation("Asia/Tokyo"); err == nil && loc != nil {
		return loc
	}
	return time.FixedZone("JST", 9*60*60)
}

// parseSessionRange parses date + start/end times (HH:MM) in JST and returns
// UTC-formatted strings ("YYYYMMDDTHHMMSSZ"). If endTime is empty, defaults to
// startTime + 2h.
func parseSessionRange(date, startTime, endTime string, loc *time.Location) (string, string, bool) {
	startStr := fmt.Sprintf("%sT%s:00", date, startTime)
	start, err := time.ParseInLocation("2006-01-02T15:04:05", startStr, loc)
	if err != nil {
		return "", "", false
	}
	var end time.Time
	if endTime == "" {
		end = start.Add(2 * time.Hour)
	} else {
		endStr := fmt.Sprintf("%sT%s:00", date, endTime)
		end, err = time.ParseInLocation("2006-01-02T15:04:05", endStr, loc)
		if err != nil {
			end = start.Add(2 * time.Hour)
		}
	}
	return start.UTC().Format("20060102T150405Z"), end.UTC().Format("20060102T150405Z"), true
}

func escapeICalText(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, ";", "\\;")
	s = strings.ReplaceAll(s, ",", "\\,")
	s = strings.ReplaceAll(s, "\n", "\\n")
	return s
}

// isSessionForMember mirrors fe/src/lib/api.ts isSessionForMember.
func isSessionForMember(s *domain.FEPracticeSession, memberID string, user *domain.FEUser, rosters []*domain.NumberRoster) bool {
	for _, ex := range s.ExcludedMemberIDs {
		if ex == memberID {
			return false
		}
	}
	for _, ad := range s.AdditionalMemberIDs {
		if ad == memberID {
			return true
		}
	}
	tt := s.TargetType
	if tt == "" {
		tt = string(domain.TargetGenreGeneration)
	}
	switch tt {
	case string(domain.TargetGenreGeneration):
		if len(s.TargetGenres) == 0 && len(s.TargetGenerations) == 0 {
			return false
		}
		genreOk := len(s.TargetGenres) == 0 || contains(s.TargetGenres, user.Genre)
		genOk := len(s.TargetGenerations) == 0 || containsInt(s.TargetGenerations, user.Generation)
		return genreOk && genOk
	case string(domain.TargetNumber):
		for _, r := range rosters {
			if r.ID == s.TargetNumberID {
				return contains(r.MemberIDs, memberID)
			}
		}
		return false
	case string(domain.TargetIndividual):
		return contains(s.TargetMemberIDs, memberID)
	}
	return false
}

func contains(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}
func containsInt(xs []int, x int) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}

