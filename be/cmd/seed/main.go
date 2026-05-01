// Package main provides a seed script for the local Firestore Emulator.
//
// Usage:
//
//	# 必ず Emulator に向けて実行する。誤って本番DBに書き込まないため、
//	# FIRESTORE_EMULATOR_HOST が未設定だと終了する。
//	FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 \
//	  GCP_PROJECT_ID=boiled-app-local \
//	  go run ./cmd/seed
//
// クリーンアーキテクチャに従い、infra 層のリポジトリを組み立てた上で
// usecase 層の FEInteractor を経由して書き込みを行う。
package main

import (
	"context"
	"log"
	"os"

	"cloud.google.com/go/firestore"

	"github.com/noa/circle-app/api/domain"
	cacheRepo "github.com/noa/circle-app/api/infra/cache"
	firestoreRepo "github.com/noa/circle-app/api/infra/firestore"
	"github.com/noa/circle-app/api/usecase"
)

func main() {
	if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
		log.Fatal("FIRESTORE_EMULATOR_HOST が未設定です。本番DBへの誤投入を防ぐため中止します。")
	}

	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		projectID = "boiled-app-local"
	}

	ctx := context.Background()
	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Firestore client init failed: %v", err)
	}
	defer client.Close()

	store := cacheRepo.NewStore()
	feUserRepo := cacheRepo.NewFEUserRepository(firestoreRepo.NewFEUserRepository(client), store)
	fePracticeSessionRepo := cacheRepo.NewFEPracticeSessionRepository(firestoreRepo.NewFEPracticeSessionRepository(client), store)
	fePracticeRSVPRepo := cacheRepo.NewFEPracticeRSVPRepository(firestoreRepo.NewFEPracticeRSVPRepository(client), store)
	feRosterRepo := cacheRepo.NewNumberRosterRepository(firestoreRepo.NewNumberRosterRepository(client), store)
	feEventRepo := cacheRepo.NewFEEventRepository(firestoreRepo.NewFEEventRepository(client), store)
	feSettlementRepo := cacheRepo.NewFESettlementRepository(firestoreRepo.NewFESettlementRepository(client), store)
	fePaymentRepo := cacheRepo.NewFEPaymentRepository(firestoreRepo.NewFEPaymentRepository(client), store)
	feLineMessageRepo := firestoreRepo.NewFELineMessageRepository(client)

	feInteractor := usecase.NewFEInteractor(
		feUserRepo, fePracticeSessionRepo, fePracticeRSVPRepo,
		feRosterRepo, feEventRepo, feSettlementRepo, fePaymentRepo,
		feLineMessageRepo,
	)

	users := []*domain.FEUser{
		{MemberID: "10001", Name: "管理者 太郎", Role: "admin", Genre: "Hiphop", Generation: 16},
		{MemberID: "10002", Name: "佐藤 花子", Role: "member", Genre: "House", Generation: 17},
		{MemberID: "10003", Name: "田中 次郎", Role: "member", Genre: "Break", Generation: 18},
	}

	for _, u := range users {
		if err := feInteractor.CreateUser(ctx, u); err != nil {
			if err == domain.ErrAlreadyExists {
				log.Printf("skip: %s (%s) は既に存在", u.Name, u.MemberID)
				continue
			}
			log.Printf("failed to create %s: %v", u.MemberID, err)
			continue
		}
		log.Printf("created: %s (%s) %s/%d代/%s", u.Name, u.MemberID, u.Genre, u.Generation, u.Role)
	}

	log.Println("seed done.")
}
