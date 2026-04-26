package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/yasserrmd/barqium/services/control-api/internal/sqlc/sqlcgen"
)

// Checkpoints mounts the config-version pinning endpoints under a tenant subrouter.
func Checkpoints(r chi.Router, q *sqlcgen.Queries) {
	r.Post("/", createCheckpoint(q))
	r.Get("/", listCheckpoints(q))
	// Rollback: marks intent; actual replay requires Kafka offset replay (Phase 4).
	r.Post("/rollback", rollbackCheckpoint(q))
}

type createCheckpointRequest struct {
	Sequence     int64   `json:"sequence"`
	OutboxLastID *int64  `json:"outbox_last_id"`
	Note         *string `json:"note"`
}

func createCheckpoint(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}

		var req createCheckpointRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Sequence <= 0 {
			writeError(w, http.StatusUnprocessableEntity, "sequence must be a positive integer")
			return
		}

		cp, err := q.CreateCheckpoint(r.Context(), sqlcgen.CreateCheckpointParams{
			TenantID:     tenantID,
			Sequence:     req.Sequence,
			OutboxLastID: req.OutboxLastID,
			Note:         req.Note,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "checkpoint for this sequence already exists")
				return
			}
			slog.ErrorContext(r.Context(), "createCheckpoint: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, cp)
	}
}

func listCheckpoints(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		limit, offset := parsePagination(r)
		cps, err := q.ListCheckpoints(r.Context(), sqlcgen.ListCheckpointsParams{
			TenantID: tenantID,
			Lim:      limit,
			Off:      offset,
		})
		if err != nil {
			slog.ErrorContext(r.Context(), "listCheckpoints: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if cps == nil {
			cps = []sqlcgen.ConfigCheckpoint{}
		}
		writeJSON(w, http.StatusOK, cps)
	}
}

type rollbackRequest struct {
	TargetSequence int64 `json:"target_sequence"`
}

func rollbackCheckpoint(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}

		var req rollbackRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		cp, err := q.GetCheckpointBySequence(r.Context(), sqlcgen.GetCheckpointBySequenceParams{
			TenantID: tenantID,
			Sequence: req.TargetSequence,
		})
		if err != nil {
			writeError(w, http.StatusNotFound, "checkpoint not found for the given sequence")
			return
		}

		// Full replay via Kafka offset is implemented in Phase 4.
		// Return the checkpoint metadata so operators know the target state
		// and can trigger the replay externally via the outbox worker.
		writeJSON(w, http.StatusAccepted, map[string]any{
			"status":     "accepted",
			"checkpoint": cp,
			"message":    "rollback accepted; use the outbox_last_id to replay from Kafka offset",
		})
	}
}
