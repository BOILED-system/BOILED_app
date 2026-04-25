package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/firestore"
	"github.com/rs/cors"

	"github.com/noa/circle-app/api/adapter/http/handler"
	"github.com/noa/circle-app/api/adapter/http/router"
	cacheRepo "github.com/noa/circle-app/api/infra/cache"
	firestoreRepo "github.com/noa/circle-app/api/infra/firestore"
	"github.com/noa/circle-app/api/infra/gemini"
	"github.com/noa/circle-app/api/usecase"
)

func main() {
	ctx := context.Background()

	// Environment variables
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		projectID = os.Getenv("GCP_PROJECT")
	}
	if projectID == "" {
		// Cloud Run 等のGCP環境では自動取得させる
		projectID = firestore.DetectProjectID
	}

	geminiAPIKey := os.Getenv("GEMINI_API_KEY")
	if geminiAPIKey == "" {
		log.Println("Warning: GEMINI_API_KEY not set, AI chat will not work")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize Firestore client
	firestoreClient, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Printf("Failed to create Firestore client: %v", err)
		// エラー時にはポートを専有してエラーメッセージを出力する死にサーバーを立て、Cloud Runのデプロイ失敗を防ぐ
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Firestore Initialization Error: " + err.Error()))
		})
		log.Printf("Starting debug server on port %s", port)
		if err := http.ListenAndServe(":"+port, nil); err != nil {
			log.Fatalf("Failed to start debug server: %v", err)
		}
		return
	}
	defer firestoreClient.Close()

	// Initialize repositories (infra layer) — existing
	circleRepo := firestoreRepo.NewCircleRepository(firestoreClient)
	membershipRepo := firestoreRepo.NewMembershipRepository(firestoreClient)
	eventRepo := firestoreRepo.NewEventRepository(firestoreClient)
	announcementRepo := firestoreRepo.NewAnnouncementRepository(firestoreClient)
	rsvpRepo := firestoreRepo.NewRSVPRepository(firestoreClient)
	settlementRepo := firestoreRepo.NewSettlementRepository(firestoreClient)
	paymentRepo := firestoreRepo.NewPaymentRepository(firestoreClient)
	userRepo := firestoreRepo.NewUserRepository(firestoreClient)
	practiceCategoryRepo := firestoreRepo.NewPracticeCategoryRepository(firestoreClient)
	practiceSeriesRepo := firestoreRepo.NewPracticeSeriesRepository(firestoreClient)
	practiceSessionRepo := firestoreRepo.NewPracticeSessionRepository(firestoreClient)
	practiceRSVPRepo := firestoreRepo.NewPracticeRSVPRepository(firestoreClient)

	// Initialize FE-compatible repositories (infra layer)
	cacheStore := cacheRepo.NewStore()
	feUserRepo := cacheRepo.NewFEUserRepository(firestoreRepo.NewFEUserRepository(firestoreClient), cacheStore)
	fePracticeSessionRepo := cacheRepo.NewFEPracticeSessionRepository(firestoreRepo.NewFEPracticeSessionRepository(firestoreClient), cacheStore)
	fePracticeRSVPRepo := cacheRepo.NewFEPracticeRSVPRepository(firestoreRepo.NewFEPracticeRSVPRepository(firestoreClient), cacheStore)
	feRosterRepo := cacheRepo.NewNumberRosterRepository(firestoreRepo.NewNumberRosterRepository(firestoreClient), cacheStore)
	feEventRepo := cacheRepo.NewFEEventRepository(firestoreRepo.NewFEEventRepository(firestoreClient), cacheStore)
	feSettlementRepo := cacheRepo.NewFESettlementRepository(firestoreRepo.NewFESettlementRepository(firestoreClient), cacheStore)
	fePaymentRepo := cacheRepo.NewFEPaymentRepository(firestoreRepo.NewFEPaymentRepository(firestoreClient), cacheStore)
	feLineMessageRepo := firestoreRepo.NewFELineMessageRepository(firestoreClient)

	// Initialize AI service (infra layer)
	aiService := gemini.NewAIService(geminiAPIKey)

	// Initialize interactors (usecase layer) — existing
	circleInteractor := usecase.NewCircleInteractor(circleRepo, membershipRepo, userRepo)
	eventInteractor := usecase.NewEventInteractor(eventRepo)
	announcementInteractor := usecase.NewAnnouncementInteractor(announcementRepo)
	rsvpInteractor := usecase.NewRSVPInteractor(rsvpRepo, eventRepo, settlementRepo, paymentRepo)
	settlementInteractor := usecase.NewSettlementInteractor(settlementRepo, paymentRepo)
	chatInteractor := usecase.NewChatInteractor(announcementRepo, eventRepo, aiService)
	userInteractor := usecase.NewUserInteractor(userRepo)
	practiceUseCase := usecase.NewPracticeUseCase(practiceCategoryRepo, practiceSeriesRepo, practiceSessionRepo, practiceRSVPRepo, settlementRepo)

	// Initialize FE-compatible interactor (usecase layer)
	feInteractor := usecase.NewFEInteractor(
		feUserRepo, fePracticeSessionRepo, fePracticeRSVPRepo,
		feRosterRepo, feEventRepo, feSettlementRepo, fePaymentRepo,
		feLineMessageRepo,
	)

	// Initialize handlers (adapter layer) — existing
	circleHandler := handler.NewCircleHandler(circleInteractor)
	eventHandler := handler.NewEventHandler(eventInteractor)
	announcementHandler := handler.NewAnnouncementHandler(announcementInteractor)
	rsvpHandler := handler.NewRSVPHandler(rsvpInteractor)
	settlementHandler := handler.NewSettlementHandler(settlementInteractor)
	chatHandler := handler.NewChatHandler(chatInteractor)
	userHandler := handler.NewUserHandler(userInteractor)
	practiceHandler := handler.NewPracticeHandler(practiceUseCase)

	// Initialize FE-compatible handler (adapter layer)
	feHandler := handler.NewFEHandler(feInteractor)
	calendarHandler := handler.NewCalendarHandler(feInteractor)
	lineWebhookHandler := handler.NewLineWebhookHandler(feInteractor)

	// Setup router — existing routes
	mux := router.Setup(
		circleHandler,
		eventHandler,
		announcementHandler,
		rsvpHandler,
		settlementHandler,
		chatHandler,
		userHandler,
		practiceHandler,
	)

	// Setup FE-compatible routes under /api prefix
	router.SetupFE(mux, feHandler)
	router.SetupFECalendar(mux, calendarHandler)
	router.SetupLINE(mux, lineWebhookHandler)

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	httpHandler := c.Handler(mux)

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, httpHandler); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
