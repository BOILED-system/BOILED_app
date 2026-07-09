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
func NotifyRSVP(ctx context.Context, session *domain.FEPracticeSession, oldRSVP, rsvp *domain.FEPracticeRSVP) {
	// Determine target genres
	genres := session.TargetGenres
	if len(genres) == 0 && rsvp.Genre != "" {
		// If project has no specific genre, use the member's genre
		genres = []string{rsvp.Genre}
	}

	// Format Japanese status
	statusMap := map[string]string{
		"GO":    "出席",
		"NO":    "欠席",
		"LATE":  "遅刻",
		"EARLY": "早退",
	}

	statusJp := statusMap[rsvp.Status]
	if statusJp == "" {
		statusJp = rsvp.Status
	}

	// Prepend type indicator
	typePrefix := "🔵 正規練"
	if session.Type == "event" {
		typePrefix = "🟠 イベント練"
	} else if session.Type == "team" {
		typePrefix = "🟣 チーム練"
	}

	// Compose message
	var message string
	if oldRSVP == nil {
		message = fmt.Sprintf("📝 **[新規登録]** %s: %s (%s)\n**%s** さんが 「**%s**」 を入力しました。", typePrefix, session.Name, session.Date, rsvp.Name, statusJp)
	} else {
		oldStatusJp := statusMap[oldRSVP.Status]
		if oldStatusJp == "" {
			oldStatusJp = "未登録"
		}
		// If only the note changed but status is the same
		if oldRSVP.Status == rsvp.Status {
			message = fmt.Sprintf("📝 **[メモ更新]** %s: %s (%s)\n**%s** さんがメモ・理由を更新しました。（%s）", typePrefix, session.Name, session.Date, rsvp.Name, statusJp)
		} else {
			message = fmt.Sprintf("📝 **[出欠変更]** %s: %s (%s)\n**%s** さんが出欠を変更しました。（%s ➔ **%s**）", typePrefix, session.Name, session.Date, rsvp.Name, oldStatusJp, statusJp)
		}
	}
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

// NotifySyncConflicts はシート同期がアプリ編集済み保護で反映できなかった
// スケジュール項目の食い違いを1通のダイジェストとしてDiscordに送る。
// 宛先は DISCORD_WEBHOOK_SYNC、未設定なら DISCORD_WEBHOOK_ALL にフォールバック。
func NotifySyncConflicts(ctx context.Context, conflicts []domain.SheetSyncConflict) {
	if len(conflicts) == 0 {
		return
	}
	webhookURL := os.Getenv("DISCORD_WEBHOOK_SYNC")
	if webhookURL == "" {
		webhookURL = os.Getenv("DISCORD_WEBHOOK_ALL")
	}
	if webhookURL == "" {
		return
	}

	// Discordのメッセージ上限(2000文字)に収まるよう件数を制限
	const maxLines = 15
	orEmpty := func(v string) string {
		if strings.TrimSpace(v) == "" {
			return "（未設定）"
		}
		return v
	}

	var b strings.Builder
	fmt.Fprintf(&b, "⚠️ **[シート同期] アプリ編集済みのため反映できない変更が %d 件あります**\n", len(conflicts))
	b.WriteString("アプリで編集済みのセッションはスプシから上書きされません。スプシの内容が正しい場合はアプリ側を手動で修正してください。\n")
	for i, c := range conflicts {
		if i >= maxLines {
			fmt.Fprintf(&b, "…他 %d 件\n", len(conflicts)-maxLines)
			break
		}
		night := ""
		if c.IsOvernight {
			night = " 深夜"
		}
		fmt.Fprintf(&b, "• %s %s%s — %s: アプリ「%s」⇔ スプシ「%s」\n",
			c.SessionName, c.Date, night, c.Field, orEmpty(c.AppValue), orEmpty(c.SheetValue))
	}

	payload := map[string]string{"content": b.String()}
	payloadBytes, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := (&http.Client{}).Do(req)
	if err == nil {
		resp.Body.Close()
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
