API_BASE_URL ?= http://127.0.0.1:8006/
XCODE_DEVELOPER_DIR ?= /Applications/Xcode.app/Contents/Developer

.PHONY: help setup portal-setup portal-run portal-demo portal-build portal-start portal-check \
	student-setup student-ensure-android student-ensure-ios student-ensure-xcode student-run student-demo \
	student-build-android student-build-ios student-check

help:
	@echo "Available commands:"
	@echo "  make setup                  Install portal and student app dependencies"
	@echo "  make portal-run             Run the portal in development mode"
	@echo "  make portal-demo            Run the portal with demo data"
	@echo "  make portal-build           Create the portal production build"
	@echo "  make portal-start           Run the previously built portal"
	@echo "  make portal-check           Run portal lint and tests"
	@echo "  make student-run            Run the Flutter app"
	@echo "  make student-demo           Run the Flutter app with demo data enabled"
	@echo "  make student-build-android  Create the Android APK"
	@echo "  make student-build-ios      Create the iOS simulator app"
	@echo "  make student-check          Format, analyze, and test the Flutter app"
	@echo ""
	@echo "Set the portal and student API URL with API_BASE_URL, for example:"
	@echo "  make portal-run API_BASE_URL=https://api.example.com/"
	@echo "  make student-run API_BASE_URL=https://api.example.com/"
	@echo "Set a custom Xcode path with XCODE_DEVELOPER_DIR when needed."

setup: portal-setup student-setup

portal-setup:
	corepack enable
	yarn install
	@test -f apps/admin/.env.local || cp apps/admin/.env.example apps/admin/.env.local

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
