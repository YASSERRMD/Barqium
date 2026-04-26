package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yasserrmd/barqium/services/control-api/internal/sqlc/sqlcgen"
)

// Regions mounts region routes at /api/v1/regions.
func Regions(r chi.Router, q *sqlcgen.Queries) {
	r.Post("/", createRegion(q))
	r.Get("/", listRegions(q))
	r.Get("/{id}", getRegion(q))
	r.Patch("/{id}", updateRegion(q))
	r.Delete("/{id}", deleteRegion(q))
}

type createRegionRequest struct {
	Name         string  `json:"name"`
	KafkaBrokers string  `json:"kafka_brokers"`
	IsPrimary    bool    `json:"is_primary"`
	Mm2GroupID   *string `json:"mm2_group_id"`
	Enabled      *bool   `json:"enabled"`
}

func createRegion(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createRegionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Name == "" {
			writeError(w, http.StatusUnprocessableEntity, "name is required")
			return
		}
		if req.KafkaBrokers == "" {
			writeError(w, http.StatusUnprocessableEntity, "kafka_brokers is required")
			return
		}
		enabled := true
		if req.Enabled != nil {
			enabled = *req.Enabled
		}
		region, err := q.CreateRegion(r.Context(), sqlcgen.CreateRegionParams{
			Name:         req.Name,
			KafkaBrokers: req.KafkaBrokers,
			IsPrimary:    req.IsPrimary,
			Mm2GroupID:   req.Mm2GroupID,
			Enabled:      enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "region name already exists")
				return
			}
			slog.ErrorContext(r.Context(), "createRegion: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, region)
	}
}

func listRegions(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, offset := parsePagination(r)
		items, err := q.ListRegions(r.Context(), sqlcgen.ListRegionsParams{
			Limit: limit, Offset: offset,
		})
		if err != nil {
			slog.ErrorContext(r.Context(), "listRegions: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if items == nil {
			items = []sqlcgen.Region{}
		}
		writeJSON(w, http.StatusOK, items)
	}
}

func getRegion(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid region id")
			return
		}
		region, err := q.GetRegion(r.Context(), id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "region not found")
				return
			}
			slog.ErrorContext(r.Context(), "getRegion: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, region)
	}
}

type updateRegionRequest struct {
	Name         string  `json:"name"`
	KafkaBrokers string  `json:"kafka_brokers"`
	IsPrimary    *bool   `json:"is_primary"`
	Mm2GroupID   *string `json:"mm2_group_id"`
	Enabled      *bool   `json:"enabled"`
}

func updateRegion(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid region id")
			return
		}
		existing, err := q.GetRegion(r.Context(), id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "region not found")
				return
			}
			slog.ErrorContext(r.Context(), "updateRegion: get error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		var req updateRegionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		name := existing.Name
		if req.Name != "" {
			name = req.Name
		}
		brokers := existing.KafkaBrokers
		if req.KafkaBrokers != "" {
			brokers = req.KafkaBrokers
		}
		isPrimary := existing.IsPrimary
		if req.IsPrimary != nil {
			isPrimary = *req.IsPrimary
		}
		mm2 := existing.Mm2GroupID
		if req.Mm2GroupID != nil {
			mm2 = req.Mm2GroupID
		}
		enabled := existing.Enabled
		if req.Enabled != nil {
			enabled = *req.Enabled
		}
		updated, err := q.UpdateRegion(r.Context(), sqlcgen.UpdateRegionParams{
			ID: id, Name: name, KafkaBrokers: brokers,
			IsPrimary: isPrimary, Mm2GroupID: mm2, Enabled: enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "region name already exists")
				return
			}
			slog.ErrorContext(r.Context(), "updateRegion: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}
}

func deleteRegion(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid region id")
			return
		}
		if err := q.DeleteRegion(r.Context(), id); err != nil {
			slog.ErrorContext(r.Context(), "deleteRegion: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
