package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"cloud.google.com/go/firestore"
)

// SeedData populates Firestore with sample data
func main() {
	ctx := context.Background()

	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		log.Fatal("GCP_PROJECT_ID environment variable is required")
	}

	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	defer client.Close()

	fmt.Println("🌱 Seeding data...")

	// Create default circle
	defaultCircleID := "dF7Y2Z91uGHQu3OtcRlr"
	defaultCircle := map[string]interface{}{
		"id":          defaultCircleID,
		"name":        "デモサークル",
		"description": "これはデモ用のサークルです。",
		"logoUrl":     "",
		"createdAt":   time.Now(),
	}
	_, err = client.Collection("circles").Doc(defaultCircleID).Set(ctx, defaultCircle)
	if err != nil {
		log.Printf("Failed to create default circle: %v", err)
	} else {
		fmt.Printf("✅ Created default circle: %s\n", defaultCircle["name"])
	}

	// Create users
	users := []map[string]interface{}{
		{"id": "demo-user-1", "name": "デモユーザー", "email": "demo@example.com", "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=demo"},
		{"id": "user1", "name": "山田太郎", "email": "yamada@example.com", "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=user1"},
		{"id": "user2", "name": "鈴木花子", "email": "suzuki@example.com", "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=user2"},
		{"id": "user3", "name": "佐藤次郎", "email": "sato@example.com", "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=user3"},
	}

	for _, u := range users {
		_, err := client.Collection("users").Doc(u["id"].(string)).Set(ctx, u)
		if err != nil {
			log.Printf("Failed to create user %s: %v", u["id"], err)
		} else {
			fmt.Printf("✅ Created user: %s\n", u["name"])
		}
	}

	// Create memberships
	for _, u := range users {
		membershipID := fmt.Sprintf("%s-%s", defaultCircleID, u["id"])
		membership := map[string]interface{}{
			"id":       membershipID,
			"circleId": defaultCircleID,
			"userId":   u["id"],
			"role":     "MEMBER",
			"joinedAt": time.Now(),
		}
		// Admin role for demo user
		if u["id"] == "demo-user-1" {
			membership["role"] = "ADMIN"
		}

		_, err := client.Collection("memberships").Doc(membershipID).Set(ctx, membership)
		if err != nil {
			log.Printf("Failed to create membership for %s: %v", u["name"], err)
		} else {
			fmt.Printf("✅ Created membership for: %s\n", u["name"])
		}
	}

	// Create announcements
	announcements := []map[string]interface{}{
		{
			"circleId":      defaultCircleID,
			"title":         "🎉 新歓パーティー開催！",
			"body":          "4月10日に新入生歓迎パーティーを開催します！\n\n【日時】4月10日（水）18:00〜21:00\n【場所】大学近くのカフェ「Circle Cafe」\n【参加費】1,500円（飲み物・軽食代込み）\n\n新入生の皆さんと在校生の交流を深める楽しいイベントです。\nゲームやクイズ大会も予定しています。\n\nみんなで楽しく過ごしましょう！🎊",
			"targetUserIds": []string{"user1", "user2", "user3"},
			"createdBy":     "demo-user-1",
			"createdAt":     time.Now().Add(-72 * time.Hour),
		},
		{
			"circleId":      defaultCircleID,
			"title":         "📚 勉強会のお知らせ",
			"body":          "今月の勉強会のお知らせです！\n\n【日時】4月15日（月）19:00〜21:00\n【場所】大学図書館 グループ学習室A\n【テーマ】最新のWeb技術入門\n\n今回はReactとNext.jsについて学びます。\n初心者の方も大歓迎！基礎から丁寧に説明します。\n\nノートPCを持参してください。",
			"targetUserIds": []string{"user1", "user2"},
			"createdBy":     "demo-user-1",
			"createdAt":     time.Now().Add(-48 * time.Hour),
		},
		{
			"circleId":      defaultCircleID,
			"title":         "🏃 春のハイキング企画",
			"body":          "春のハイキングを企画しました！\n\n【日時】4月20日（土）9:00〜17:00\n【集合】大学正門前 9:00集合\n【行き先】高尾山（初心者コース）\n【持ち物】\n- お弁当・飲み物\n- 動きやすい服装\n- 雨具\n\n参加費は交通費のみ実費負担です。\n天候により中止の場合は前日までに連絡します。",
			"targetUserIds": []string{"user1", "user3"},
			"createdBy":     "demo-user-1",
			"createdAt":     time.Now().Add(-24 * time.Hour),
		},
	}

	for _, a := range announcements {
		_, _, err := client.Collection("announcements").Add(ctx, a)
		if err != nil {
			log.Printf("Failed to create announcement: %v", err)
		} else {
			fmt.Printf("✅ Created announcement: %s\n", a["title"])
		}
	}

	// Payments creation skipped for now.

	fmt.Println("\n🎉 Seeding complete!")
}
