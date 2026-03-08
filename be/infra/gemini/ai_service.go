// Package gemini provides Gemini AI service implementation.
package gemini

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"github.com/noa/circle-app/api/domain"
	"google.golang.org/api/option"
)

// AIService implements port.AIService using Gemini API.
type AIService struct {
	apiKey string
}

// NewAIService creates a new Gemini AI service.
func NewAIService(apiKey string) *AIService {
	return &AIService{apiKey: apiKey}
}

// GenerateResponse generates an AI response based on announcements and events.
func (s *AIService) GenerateResponse(ctx context.Context, message string, announcements []*domain.Announcement, events []*domain.Event) (*domain.ChatResponse, error) {
	if s.apiKey == "" {
		return &domain.ChatResponse{
			AssistantMessage: "AIサービスが設定されていません（GEMINI_API_KEY未設定）",
			References:       nil,
		}, nil
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(s.apiKey))
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-2.0-flash")

	// Build context from announcements
	var contextParts []string
	var references []domain.ChatReference

	// Announcements Context
	if len(announcements) > 0 {
		contextParts = append(contextParts, "### お知らせ一覧")
		for _, a := range announcements {
			contextParts = append(contextParts, fmt.Sprintf(
				"【お知らせ: %s】\n%s",
				a.Title,
				a.Body,
			))
			references = append(references, domain.ChatReference{
				Title:   "お知らせ: " + a.Title,
				EventID: a.EventID,
			})
		}
	}

	// Events Context
	if len(events) > 0 {
		contextParts = append(contextParts, "### イベント一覧")
		for _, e := range events {
			// Basic event info
			contextParts = append(contextParts, fmt.Sprintf(
				"【イベント: %s】\n日時: %s\n場所: %s",
				e.Title,
				e.StartAt.Format("2006/01/02 15:04"),
				e.Location,
			))
			references = append(references, domain.ChatReference{
				Title:   "イベント: " + e.Title,
				EventID: e.ID,
			})
		}
	}

	fullContext := strings.Join(contextParts, "\n\n---\n\n")

	prompt := fmt.Sprintf(`あなたはサークルのお知らせやイベント情報を参照して質問に回答するAIアシスタントです。
以下の情報のみを参照して回答してください。
重要: 個人情報、出欠情報、支払い情報は参照しないでください。提供された情報のみを参照してください。
情報に含まれないことについては「情報が見つかりませんでした」と答えてください。
回答には必ず参照した情報のタイトル（お知らせやイベント名）を明記してください。

## 参照情報
%s

## 質問
%s

## 回答`, fullContext, message)

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	var answer string
	for _, candidate := range resp.Candidates {
		if candidate.Content != nil {
			for _, part := range candidate.Content.Parts {
				if text, ok := part.(genai.Text); ok {
					answer += string(text)
				}
			}
		}
	}

	return &domain.ChatResponse{
		AssistantMessage: answer,
		References:       references,
	}, nil
}
