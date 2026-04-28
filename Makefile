.PHONY: dev stop build check test fmt install

PID_FILE := .dev.pid

## Start the frontend dev server in the background (logs: .dev.log)
dev:
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then \
		echo "Dev server already running (pid $$(cat $(PID_FILE)))"; \
	else \
		nohup sh -c 'cd frontend && npm run dev' > .dev.log 2>&1 & echo $$! > $(PID_FILE); \
		sleep 2; \
		echo "Dev server started (pid $$(cat $(PID_FILE)))"; \
		grep -E "Local:|Network:" .dev.log || true; \
	fi

## Stop the background dev server
stop:
	@if [ -f $(PID_FILE) ]; then \
		kill $$(cat $(PID_FILE)) 2>/dev/null && echo "Dev server stopped" || echo "Process already gone"; \
		rm -f $(PID_FILE); \
	else \
		echo "No dev server pid file found"; \
	fi

## Run the frontend dev server in the foreground (ctrl-c to quit)
dev-fg:
	cd frontend && npm run dev

## Build the frontend for production
build:
	cd frontend && npm run build

## Type-check without emitting
check:
	cd frontend && npm run check

## Run unit tests
test:
	cd frontend && npm run test

## Run unit tests in watch mode
test-watch:
	cd frontend && npm run test:watch

## Lint and auto-fix with biome
fmt:
	npm run fmt

## Install all dependencies
install:
	npm install
