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
		log.Fatal("GCP_PROJECT_ID or GCP_PROJECT environment variable is required")
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
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	defer firestoreClient.Close()

	// Initialize repositories (infra layer)
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

	// Initialize AI service (infra layer)
	aiService := gemini.NewAIService(geminiAPIKey)

	// Initialize interactors (usecase layer)
	circleInteractor := usecase.NewCircleInteractor(circleRepo, membershipRepo, userRepo)
	eventInteractor := usecase.NewEventInteractor(eventRepo)
	announcementInteractor := usecase.NewAnnouncementInteractor(announcementRepo)
	rsvpInteractor := usecase.NewRSVPInteractor(rsvpRepo, eventRepo, settlementRepo, paymentRepo)
	settlementInteractor := usecase.NewSettlementInteractor(settlementRepo, paymentRepo)
	chatInteractor := usecase.NewChatInteractor(announcementRepo, eventRepo, aiService)
	userInteractor := usecase.NewUserInteractor(userRepo)
	practiceUseCase := usecase.NewPracticeUseCase(practiceCategoryRepo, practiceSeriesRepo, practiceSessionRepo, practiceRSVPRepo, settlementRepo)

	// Initialize handlers (adapter layer)
	circleHandler := handler.NewCircleHandler(circleInteractor)
	eventHandler := handler.NewEventHandler(eventInteractor)
	announcementHandler := handler.NewAnnouncementHandler(announcementInteractor)
	rsvpHandler := handler.NewRSVPHandler(rsvpInteractor)
	settlementHandler := handler.NewSettlementHandler(settlementInteractor)
	chatHandler := handler.NewChatHandler(chatInteractor)
	userHandler := handler.NewUserHandler(userInteractor)
	practiceHandler := handler.NewPracticeHandler(practiceUseCase)

	// Setup router
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
