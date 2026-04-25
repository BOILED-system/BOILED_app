package firestore

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/noa/circle-app/api/domain"
)

const lineMessageCollection = "lineMessages"

type feLineMessageRepository struct {
	client *firestore.Client
}

func NewFELineMessageRepository(client *firestore.Client) *feLineMessageRepository {
	return &feLineMessageRepository{client: client}
}

func (r *feLineMessageRepository) Save(ctx context.Context, m *domain.FELineMessage) error {
	ref := r.client.Collection(lineMessageCollection).NewDoc()
	m.ID = ref.ID
	m.CreatedAt = time.Now()
	_, err := ref.Set(ctx, m)
	return err
}

func (r *feLineMessageRepository) GetAll(ctx context.Context) ([]*domain.FELineMessage, error) {
	docs, err := r.client.Collection(lineMessageCollection).
		OrderBy("createdAt", firestore.Desc).
		Limit(200).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	return toLineMessages(docs), nil
}

func (r *feLineMessageRepository) GetByEventID(ctx context.Context, eventID string) ([]*domain.FELineMessage, error) {
	docs, err := r.client.Collection(lineMessageCollection).
		Where("linkedEventId", "==", eventID).
		OrderBy("createdAt", firestore.Desc).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, err
	}
	return toLineMessages(docs), nil
}

func (r *feLineMessageRepository) LinkToEvent(ctx context.Context, id, eventID string) error {
	_, err := r.client.Collection(lineMessageCollection).Doc(id).Update(ctx, []firestore.Update{
		{Path: "linkedEventId", Value: eventID},
	})
	return err
}

// ExistsByLineMessageID は LINEのメッセージIDで重複チェックする
func (r *feLineMessageRepository) ExistsByLineMessageID(ctx context.Context, lineMessageID string) (bool, error) {
	docs, err := r.client.Collection(lineMessageCollection).
		Where("lineMessageId", "==", lineMessageID).
		Limit(1).
		Documents(ctx).GetAll()
	if err != nil {
		return false, err
	}
	return len(docs) > 0, nil
}

func toLineMessages(docs []*firestore.DocumentSnapshot) []*domain.FELineMessage {
	msgs := make([]*domain.FELineMessage, 0, len(docs))
	for _, doc := range docs {
		var m domain.FELineMessage
		if err := doc.DataTo(&m); err != nil {
			continue
		}
		msgs = append(msgs, &m)
	}
	return msgs
}
