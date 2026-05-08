package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

func main() {
	if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
		log.Fatal("FIRESTORE_EMULATOR_HOST が設定されていません。本番DBへの誤書き込みを防ぐため終了します。\n'make seed' で起動してください。")
	}

	ctx := context.Background()
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		projectID = "boiled-local"
	}

	client, err := firestore.NewClient(ctx, projectID, option.WithoutAuthentication())
	if err != nil {
		log.Fatalf("Firestore クライアント作成失敗: %v", err)
	}
	defer client.Close()

	fmt.Println("🌱 シードデータを投入します...")

	// ── Users ────────────────────────────────────────────────────────────────
	users := []map[string]interface{}{
		{"memberId": "10001", "name": "管理者 太郎", "role": "admin", "genre": "Hiphop", "generation": 10},
		{"memberId": "10002", "name": "佐藤 花子", "role": "member", "genre": "Locking", "generation": 11},
		{"memberId": "10003", "name": "田中 次郎", "role": "member", "genre": "Breaking", "generation": 12},
	}
	for _, u := range users {
		_, err := client.Collection("users").Doc(u["memberId"].(string)).Set(ctx, u)
		if err != nil {
			log.Printf("❌ user %s: %v", u["memberId"], err)
		} else {
			fmt.Printf("✅ user %s (%s)\n", u["memberId"], u["name"])
		}
	}

	// ── Practice Sessions ─────────────────────────────────────────────────────
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	nextWeek := time.Now().AddDate(0, 0, 7).Format("2006-01-02")

	sessions := []struct {
		id   string
		data map[string]interface{}
	}{
		{
			id: "session-past-001",
			data: map[string]interface{}{
				"id":                 "session-past-001",
				"name":               "正規練 5月",
				"date":               yesterday,
				"startTime":          "19:00",
				"endTime":            "21:00",
				"location":           "サークル練習室A",
				"note":               "",
				"type":               "regular",
				"targetType":         "individual",
				"targetGenres":       []string{},
				"targetGenerations":  []int{},
				"targetNumberId":     "",
				"targetMemberIds":    []string{"10001", "10002", "10003"},
				"additionalMemberIds": []string{},
				"excludedMemberIds":  []string{},
				"createdBy":          "10001",
				"createdByName":      "管理者 太郎",
				"createdAt":          time.Now().AddDate(0, 0, -7),
			},
		},
		{
			id: "session-upcoming-001",
			data: map[string]interface{}{
				"id":                 "session-upcoming-001",
				"name":               "正規練 5月後半",
				"date":               nextWeek,
				"startTime":          "19:00",
				"endTime":            "21:00",
				"location":           "サークル練習室B",
				"note":               "振り付け確認あり",
				"type":               "regular",
				"targetType":         "individual",
				"targetGenres":       []string{},
				"targetGenerations":  []int{},
				"targetNumberId":     "",
				"targetMemberIds":    []string{"10001", "10002", "10003"},
				"additionalMemberIds": []string{},
				"excludedMemberIds":  []string{},
				"createdBy":          "10001",
				"createdByName":      "管理者 太郎",
				"createdAt":          time.Now(),
			},
		},
	}

	for _, s := range sessions {
		_, err := client.Collection("practiceSessions").Doc(s.id).Set(ctx, s.data)
		if err != nil {
			log.Printf("❌ session %s: %v", s.id, err)
		} else {
			fmt.Printf("✅ session %s (%s)\n", s.id, s.data["name"])
		}
	}

	// ── RSVPs for past session ────────────────────────────────────────────────
	rsvps := []struct {
		memberId string
		data     map[string]interface{}
	}{
		{
			memberId: "10001",
			data: map[string]interface{}{
				"memberId":   "10001",
				"name":       "管理者 太郎",
				"genre":      "Hiphop",
				"generation": 10,
				"status":     "GO",
				"note":       "",
				"updatedAt":  time.Now().AddDate(0, 0, -2),
			},
		},
		{
			memberId: "10002",
			data: map[string]interface{}{
				"memberId":   "10002",
				"name":       "佐藤 花子",
				"genre":      "Locking",
				"generation": 11,
				"status":     "NO",
				"note":       "体調不良のため欠席します。次回は必ず参加しますのでよろしくお願いします。",
				"updatedAt":  time.Now().AddDate(0, 0, -2),
			},
		},
		{
			memberId: "10003",
			data: map[string]interface{}{
				"memberId":   "10003",
				"name":       "田中 次郎",
				"genre":      "Breaking",
				"generation": 12,
				"status":     "LATE",
				"note":       "バイトが長引いてしまいました。30分ほど遅れて参加します。",
				"updatedAt":  time.Now().AddDate(0, 0, -2),
			},
		},
	}

	for _, r := range rsvps {
		_, err := client.Collection("practiceSessions").Doc("session-past-001").
			Collection("rsvps").Doc(r.memberId).Set(ctx, r.data)
		if err != nil {
			log.Printf("❌ rsvp %s: %v", r.memberId, err)
		} else {
			fmt.Printf("✅ rsvp session-past-001 / %s (%s)\n", r.memberId, r.data["status"])
		}
	}

	fmt.Println("\n🎉 完了！ http://localhost:4000 でEmulator UIを確認できます。")
	fmt.Println("   ログイン会員番号: 10001 (admin) / 10002 / 10003")
}
