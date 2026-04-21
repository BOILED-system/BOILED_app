package discord

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/noa/circle-app/api/domain"
)

// NotifyRSVP sends a notification to configured Discord channels using webhooks
func NotifyRSVP(ctx context.Context, session *domain.FEPracticeSession, rsvp *domain.FEPracticeRSVP) {
	// Skip notifications for voluntary team practices to avoid spamming main channels
	if session.Type == "team" {
		return
	}

	// Determine target genres
	genres := session.TargetGenres
	if len(genres) == 0 && rsvp.Genre != "" {
		// If project has no specific genre, use the member's genre
		genres = []string{rsvp.Genre}
	}

	// Format Japanese status
	statusJp := "出席"
	switch rsvp.Status {
	case "NO":
		statusJp = "欠席"
	case "LATE":
		statusJp = "遅刻"
	case "EARLY":
		statusJp = "早退"
	}

	// Prepend type indicator
	typePrefix := "🔵 正規練"
	if session.Type == "event" {
		typePrefix = "🟠 イベント練"
	} else if session.Type == "team" {
		typePrefix = "🟣 チーム練"
	}

	// Compose message
	message := fmt.Sprintf("📝 **[出欠更新]** %s: %s (%s)\n**%s** さんが 「**%s**」 を入力しました。", typePrefix, session.Name, session.Date, rsvp.Name, statusJp)
	if rsvp.Note != "" {
		message += fmt.Sprintf("\n> 理由・メモ: %s", rsvp.Note)
	}

	payload := map[string]string{"content": message}
	payloadBytes, _ := json.Marshal(payload)

	webhooks := getWebhookURLs(genres)

	// Send concurrently to all necessary webhooks
	for _, webhookURL := range webhooks {
		go func(url string) {
			req, err := http.NewRequestWithContext(context.Background(), "POST", url, bytes.NewBuffer(payloadBytes))
			if err != nil {
				return
			}
			req.Header.Set("Content-Type", "application/json")

			client := &http.Client{}
			resp, err := client.Do(req)
			if err == nil {
				resp.Body.Close()
			}
		}(webhookURL)
	}
}

// getWebhookURLs determines which URLs to send to based on genres and environment variables
func getWebhookURLs(genres []string) []string {
	urlsMap := make(map[string]bool)
	var urls []string

	// All-inclusive webhook (e.g. general notification channel)
	if generalWebhook := os.Getenv("DISCORD_WEBHOOK_ALL"); generalWebhook != "" {
		urlsMap[generalWebhook] = true
		urls = append(urls, generalWebhook)
	}

	// Genre-specific webhooks
	for _, g := range genres {
		envKey := fmt.Sprintf("DISCORD_WEBHOOK_%s", strings.ToUpper(g))
		if u := os.Getenv(envKey); u != "" {
			if !urlsMap[u] {
				urlsMap[u] = true
				urls = append(urls, u)
			}
		}
	}

	return urls
}
