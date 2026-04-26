FROM golang:1.22-bookworm AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /control-api ./...

FROM gcr.io/distroless/static-debian12
COPY --from=builder /control-api /control-api
ENTRYPOINT ["/control-api"]
