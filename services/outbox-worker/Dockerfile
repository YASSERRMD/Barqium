FROM golang:1.22-bookworm AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /outbox-worker ./...

FROM gcr.io/distroless/static-debian12
COPY --from=builder /outbox-worker /outbox-worker
ENTRYPOINT ["/outbox-worker"]
