API_BASE_URL ?= http://127.0.0.1:8006/
XCODE_DEVELOPER_DIR ?= /Applications/Xcode.app/Contents/Developer

.PHONY: help setup portal-setup portal-run portal-demo portal-build portal-start portal-check \
	portal-saas-run portal-saas-build portal-saas-start portal-saas-check \
	saas-run saas-build saas-start saas-check \
	student-setup student-ensure-android student-ensure-ios student-ensure-xcode student-run student-demo \
	student-build-android student-build-ios student-check

help:
	@echo "Available commands:"
	@echo "  make setup                  Install web and student app dependencies"
	@echo "  make portal-run             Run the gym dashboard on :3000"
	@echo "  make portal-demo            Run the gym dashboard with demo data"
	@echo "  make portal-build           Create the gym dashboard production build"
	@echo "  make portal-start           Run the previously built gym dashboard"
	@echo "  make portal-check           Run gym dashboard lint and tests"
	@echo "  make portal-saas-run        Run the commercial portal on :3001"
	@echo "  make portal-saas-build      Create the commercial portal production build"
	@echo "  make portal-saas-start      Run the previously built commercial portal"
	@echo "  make portal-saas-check      Run commercial portal lint and tests"
	@echo "  make saas-run               Run the platform operator console on :3002"
	@echo "  make saas-build             Create the platform console production build"
	@echo "  make saas-start             Run the previously built platform console"
	@echo "  make saas-check             Run platform console lint and tests"
	@echo "  make student-run            Run the Flutter app"
	@echo "  make student-demo           Run the Flutter app with demo data enabled"
	@echo "  make student-build-android  Create the Android APK"
	@echo "  make student-build-ios      Create the iOS simulator app"
	@echo "  make student-check          Format, analyze, and test the Flutter app"
	@echo ""
	@echo "Set the API URL with API_BASE_URL, for example:"
	@echo "  make portal-run API_BASE_URL=https://api.example.com/"
	@echo "  make portal-saas-run API_BASE_URL=https://api.example.com/"
	@echo "  make saas-run API_BASE_URL=https://api.example.com/"
	@echo "  make student-run API_BASE_URL=https://api.example.com/"
	@echo "Set a custom Xcode path with XCODE_DEVELOPER_DIR when needed."

setup: portal-setup student-setup

portal-setup:
	corepack enable
	yarn install
	@test -f apps/gym_admin/.env.local || cp apps/gym_admin/.env.example apps/gym_admin/.env.local

portal-run:
	API_BASE_URL="$(API_BASE_URL)" yarn dev

portal-demo:
	API_BASE_URL="$(API_BASE_URL)" NEXT_PUBLIC_DATA_MODE=demo yarn dev

portal-build:
	API_BASE_URL="$(API_BASE_URL)" yarn build

portal-start:
	API_BASE_URL="$(API_BASE_URL)" yarn start

portal-check:
	yarn lint
	yarn test

portal-saas-run:
	API_BASE_URL="$(API_BASE_URL)" yarn portal:dev

portal-saas-build:
	API_BASE_URL="$(API_BASE_URL)" yarn workspace @bota-o-shape/portal build

portal-saas-start:
	API_BASE_URL="$(API_BASE_URL)" yarn workspace @bota-o-shape/portal start

portal-saas-check:
	yarn workspace @bota-o-shape/portal lint
	yarn workspace @bota-o-shape/portal test

saas-run:
	API_BASE_URL="$(API_BASE_URL)" yarn saas:dev

saas-build:
	API_BASE_URL="$(API_BASE_URL)" yarn saas:build

saas-start:
	API_BASE_URL="$(API_BASE_URL)" yarn workspace @bota-o-shape/saas-admin start

saas-check:
	yarn saas:lint
	yarn saas:test

student-setup: student-ensure-android student-ensure-ios
	cd apps/student && flutter pub get

student-ensure-android:
	@if [ ! -f apps/student/android/app/build.gradle.kts ]; then \
		cd apps/student && flutter create --platforms=android --project-name bota_o_shape_student .; \
	fi

student-ensure-ios:
	@if [ ! -f apps/student/ios/Runner.xcodeproj/project.pbxproj ]; then \
		cd apps/student && flutter create --platforms=ios --project-name bota_o_shape_student .; \
	fi

student-ensure-xcode:
	@if [ "$$(xcode-select -p 2>/dev/null)" != "$(XCODE_DEVELOPER_DIR)" ]; then \
		echo "Xcode is not the active developer directory."; \
		echo "Run: sudo xcode-select --switch $(XCODE_DEVELOPER_DIR)"; \
		exit 1; \
	fi

student-run:
	cd apps/student && flutter run --dart-define="API_BASE_URL=$(API_BASE_URL)" --dart-define=ALLOW_INSECURE_LOCAL_API=true

student-demo:
	cd apps/student && flutter run --dart-define=STUDENT_DEMO=true

student-build-android: student-ensure-android
	cd apps/student && flutter build apk --dart-define="API_BASE_URL=$(API_BASE_URL)" --dart-define=ALLOW_INSECURE_LOCAL_API=true

student-build-ios: student-ensure-ios student-ensure-xcode
	cd apps/student && DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" flutter build ios --simulator --dart-define="API_BASE_URL=$(API_BASE_URL)" --dart-define=ALLOW_INSECURE_LOCAL_API=true

student-check:
	cd apps/student && dart format lib test
	cd apps/student && flutter analyze
	cd apps/student && flutter test
