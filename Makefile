SHELL := /bin/bash
export PATH := /opt/homebrew/opt/openjdk@21/bin:/opt/homebrew/bin:$(PATH)

.PHONY: dev-setup emulator seed backend frontend

dev-setup:
	@[ -f be/.env.local ] || cp be/.env.local.example be/.env.local
	@[ -f fe/.env.local ] || cp fe/.env.local.example fe/.env.local
	@echo "✅ be/.env.local と fe/.env.local を作成しました。"

emulator:
	firebase emulators:start --only firestore

seed:
	@set -a && source be/.env.local && set +a && cd be && go run cmd/seed/main.go

backend:
	@set -a && source be/.env.local && set +a && cd be && go run main.go

frontend:
	cd fe && npm run dev
