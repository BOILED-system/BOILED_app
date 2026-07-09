package discord

import (
	"fmt"
	"strings"
	"testing"
	"unicode/utf8"
)

func TestChunkMessages_SingleMessageWhenSmall(t *testing.T) {
	got := chunkMessages("ヘッダー\n", []string{"• 行1\n", "• 行2\n"}, 1900)
	if len(got) != 1 {
		t.Fatalf("want 1 message, got %d", len(got))
	}
	if !strings.HasPrefix(got[0], "ヘッダー\n") || !strings.Contains(got[0], "行1") || !strings.Contains(got[0], "行2") {
		t.Errorf("unexpected message: %q", got[0])
	}
}

func TestChunkMessages_SplitsAndKeepsAllLines(t *testing.T) {
	// 27件の食い違い通知を模した行（1行 約70文字）
	var lines []string
	for i := 1; i <= 27; i++ {
		lines = append(lines, fmt.Sprintf("• 夏イベ期Waack 2026-07-%02d — 場所: アプリ「studio worcle 代々木 601」⇔ スプシ「ワークル代々木601」(%d)\n", i, i))
	}
	got := chunkMessages("ヘッダー\n", lines, 500)

	if len(got) < 2 {
		t.Fatalf("want multiple messages, got %d", len(got))
	}
	joined := strings.Join(got, "")
	for i := 1; i <= 27; i++ {
		if !strings.Contains(joined, fmt.Sprintf("(%d)\n", i)) {
			t.Errorf("line %d missing from chunked output", i)
		}
	}
	for i, m := range got {
		if utf8.RuneCountInString(m) > 500+utf8.RuneCountInString("（続き）\n") {
			t.Errorf("message %d exceeds limit: %d runes", i, utf8.RuneCountInString(m))
		}
		if i > 0 && !strings.HasPrefix(m, "（続き）\n") {
			t.Errorf("continuation message %d should start with 続き: %q", i, m[:20])
		}
	}
}
