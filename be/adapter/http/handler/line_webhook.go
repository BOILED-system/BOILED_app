package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/noa/circle-app/api/domain"
	"github.com/noa/circle-app/api/usecase"
)

type LineWebhookHandler struct {
	interactor    *usecase.FEInteractor
	channelSecret string
}

func NewLineWebhookHandler(i *usecase.FEInteractor) *LineWebhookHandler {
	return &LineWebhookHandler{
		interactor:    i,
		channelSecret: os.Getenv("LINE_CHANNEL_SECRET"),
	}
}

// lineWebhookPayload はLINE Webhookのリクエストボディ
type lineWebhookPayload struct {
	Destination string       `json:"destination"`
	Events      []lineEvent  `json:"events"`
}

type lineEvent struct {
	Type      string      `json:"type"`
	Message   lineMessage `json:"message"`
	Source    lineSource  `json:"source"`
	Timestamp int64       `json:"timestamp"`
}

type lineMessage struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Text string `json:"text"`
}

type lineSource struct {
	Type    string `json:"type"`
	GroupID string `json:"groupId"`
	UserID  string `json:"userId"`
}

// Webhook handles POST /api/line/webhook
func (h *LineWebhookHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	// 署名検証（Channel Secretが設定されている場合のみ）
	if h.channelSecret != "" {
		sig := r.Header.Get("X-Line-Signature")
		if !h.verifySignature(body, sig) {
			http.Error(w, "invalid signature", http.StatusUnauthorized)
			return
		}
	}

	var payload lineWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	for _, ev := range payload.Events {
		// テキストメッセージのみ保存
		if ev.Type != "message" || ev.Message.Type != "text" {
			continue
		}
		if ev.Message.Text == "" {
			continue
		}

		// 重複防止
		exists, err := h.interactor.LineMessageExists(ctx, ev.Message.ID)
		if err != nil {
			log.Printf("line webhook: duplicate check error: %v", err)
			continue
		}
		if exists {
			continue
		}

		msg := &domain.FELineMessage{
			LineMessageID: ev.Message.ID,
			UserID:        ev.Source.UserID,
			GroupID:       ev.Source.GroupID,
			Text:          ev.Message.Text,
		}
		if err := h.interactor.SaveLineMessage(ctx, msg); err != nil {
			log.Printf("line webhook: save error: %v", err)
		}
	}

	// LINEはレスポンスに200を要求する
	w.WriteHeader(http.StatusOK)
}

// GetMessages handles GET /api/line/messages
func (h *LineWebhookHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	eventID := r.URL.Query().Get("eventId")
	var msgs interface{}
	var err error
	if eventID != "" {
		msgs, err = h.interactor.GetLineMessagesByEvent(ctx, eventID)
	} else {
		msgs, err = h.interactor.GetLineMessages(ctx)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

// LinkMessage handles PUT /api/line/messages/{id}/link
func (h *LineWebhookHandler) LinkMessage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		EventID string `json:"eventId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.EventID == "" {
		http.Error(w, "eventId is required", http.StatusBadRequest)
		return
	}
	if err := h.interactor.LinkLineMessageToEvent(r.Context(), id, body.EventID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// verifySignature はHMAC-SHA256でLINEの署名を検証する
func (h *LineWebhookHandler) verifySignature(body []byte, signature string) bool {
	mac := hmac.New(sha256.New, []byte(h.channelSecret))
	mac.Write(body)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
