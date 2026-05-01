.PHONY: emulator backend frontend seed dev-setup help

# Firestore Emulator のホスト/ポート
EMULATOR_HOST := 127.0.0.1:8085
LOCAL_PROJECT_ID := boiled-app-local

help:
	@echo "ローカル開発のコマンド:"
	@echo "  make dev-setup      初回セットアップ（.env.localの作成）"
	@echo "  make emulator       Firestore Emulator を起動（ターミナル1）"
	@echo "  make backend        Go バックエンドを起動（ターミナル2）"
	@echo "  make frontend       Next.js フロントを起動（ターミナル3）"
	@echo "  make seed           ローカルEmulatorに初期メンバーを投入"

# 初回セットアップ：.env.local が無ければサンプルからコピー
dev-setup:
	@if [ ! -f be/.env.local ]; then cp be/.env.local.example be/.env.local; echo "created be/.env.local"; fi
	@if [ ! -f fe/.env.local ]; then cp fe/.env.local.example fe/.env.local; echo "created fe/.env.local"; fi
	@echo "セットアップ完了。次に make emulator → make seed → make backend / make frontend"

# Firestore Emulator を起動。終了させない限り 8085 で待ち受ける
emulator:
	firebase emulators:start --only firestore --project $(LOCAL_PROJECT_ID)

# Goバックエンドを起動。.env.local の値を export してから起動する
backend:
	@set -a; . ./be/.env.local; set +a; cd be && go run .

# Next.jsフロントを起動
frontend:
	cd fe && npm run dev

# シード投入。FIRESTORE_EMULATOR_HOST を直接渡してEmulatorに書き込む
seed:
	cd be && FIRESTORE_EMULATOR_HOST=$(EMULATOR_HOST) GCP_PROJECT_ID=$(LOCAL_PROJECT_ID) go run ./cmd/seed
