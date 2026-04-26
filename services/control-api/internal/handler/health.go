package handler

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
)

// Pinger is implemented by *pgxpool.Pool.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Health returns 200 {"status":"ok"} when all dependencies are reachable,
// or 503 {"status":"degraded","error":"..."} otherwise.
func Health(db Pinger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if err := db.Ping(r.Context()); err != nil {
			slog.ErrorContext(r.Context(), "health check: postgres unreachable", "error", err)
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status": "degraded",
				"error":  err.Error(),
			})
			return
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}
}
