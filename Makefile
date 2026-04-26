.PHONY: bootstrap migrate seed dev-up dev-down test bench fmt lint proto

bootstrap:
	mise install

migrate:
	go run ./services/migrations/cmd/migrate/...

seed:
	go run ./services/migrations/cmd/seed/...

dev-up:
	docker compose -f deploy/docker-compose.dev.yml up -d

dev-down:
	docker compose -f deploy/docker-compose.dev.yml down

test:
	cargo test --workspace
	cd services/control-api && go test ./...
	cd services/outbox-worker && go test ./...
	cd ui/admin && npm test

bench:
	cargo bench --workspace

fmt:
	cargo fmt
	cd services/control-api && gofmt -w .
	cd services/outbox-worker && gofmt -w .

lint:
	cargo clippy --all-targets -- -D warnings
	cd services/control-api && go vet ./...
	cd services/outbox-worker && go vet ./...

proto:
	protoc \
	  --go_out=services/control-api/gen \
	  --go-grpc_out=services/control-api/gen \
	  --rust_out=crates/barqium-config/src/gen \
	  proto/*.proto
