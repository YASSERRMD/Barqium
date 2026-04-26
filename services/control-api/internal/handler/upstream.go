package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yasserrmd/barqium/services/control-api/internal/sqlc/sqlcgen"
)

// Upstreams mounts all upstream routes under a tenant-scoped router.
// Caller must ensure {tenantId} is available in the route context.
func Upstreams(r chi.Router, q *sqlcgen.Queries) {
	r.Post("/", createUpstream(q))
	r.Get("/", listUpstreams(q))
	r.Get("/{id}", getUpstream(q))
	r.Patch("/{id}", updateUpstream(q))
	r.Delete("/{id}", deleteUpstream(q))
}

type createUpstreamRequest struct {
	Name      string `json:"name"`
	URL       string `json:"url"`
	TimeoutMs *int32 `json:"timeout_ms"`
	Enabled   *bool  `json:"enabled"`
}

func createUpstream(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}

		var req createUpstreamRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Name == "" {
			writeError(w, http.StatusUnprocessableEntity, "name is required")
			return
		}
		if _, err := url.ParseRequestURI(req.URL); err != nil || req.URL == "" {
			writeError(w, http.StatusUnprocessableEntity, "url must be a valid URL")
			return
		}

		timeoutMs := int32(5000)
		if req.TimeoutMs != nil && *req.TimeoutMs > 0 {
			timeoutMs = *req.TimeoutMs
		}
		enabled := true
		if req.Enabled != nil {
			enabled = *req.Enabled
		}

		upstream, err := q.CreateUpstream(r.Context(), sqlcgen.CreateUpstreamParams{
			TenantID:  tenantID,
			Name:      req.Name,
			Url:       req.URL,
			TimeoutMs: timeoutMs,
			Enabled:   enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "upstream name already exists in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "createUpstream: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, upstream)
	}
}

func listUpstreams(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}

		limit, offset := parsePagination(r)
		upstreams, err := q.ListUpstreamsByTenant(r.Context(), sqlcgen.ListUpstreamsByTenantParams{
			TenantID: tenantID,
			Limit:    limit,
			Offset:   offset,
		})
		if err != nil {
			slog.ErrorContext(r.Context(), "listUpstreams: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if upstreams == nil {
			upstreams = []sqlcgen.Upstream{}
		}
		writeJSON(w, http.StatusOK, upstreams)
	}
}

func getUpstream(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid upstream id")
			return
		}

		upstream, err := q.GetUpstream(r.Context(), sqlcgen.GetUpstreamParams{ID: id, TenantID: tenantID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "upstream not found")
				return
			}
			slog.ErrorContext(r.Context(), "getUpstream: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, upstream)
	}
}

type updateUpstreamRequest struct {
	Name      string `json:"name"`
	URL       string `json:"url"`
	TimeoutMs *int32 `json:"timeout_ms"`
	Enabled   *bool  `json:"enabled"`
}

func updateUpstream(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid upstream id")
			return
		}

		existing, err := q.GetUpstream(r.Context(), sqlcgen.GetUpstreamParams{ID: id, TenantID: tenantID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "upstream not found")
				return
			}
			slog.ErrorContext(r.Context(), "updateUpstream: get error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		var req updateUpstreamRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		name := existing.Name
		if req.Name != "" {
			name = req.Name
		}
		rawURL := existing.Url
		if req.URL != "" {
			if _, err := url.ParseRequestURI(req.URL); err != nil {
				writeError(w, http.StatusUnprocessableEntity, "url must be a valid URL")
				return
			}
			rawURL = req.URL
		}
		timeoutMs := existing.TimeoutMs
		if req.TimeoutMs != nil && *req.TimeoutMs > 0 {
			timeoutMs = *req.TimeoutMs
		}
		enabled := existing.Enabled
		if req.Enabled != nil {
			enabled = *req.Enabled
		}

		updated, err := q.UpdateUpstream(r.Context(), sqlcgen.UpdateUpstreamParams{
			ID:        id,
			TenantID:  tenantID,
			Name:      name,
			Url:       rawURL,
			TimeoutMs: timeoutMs,
			Enabled:   enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "upstream name already exists in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "updateUpstream: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}
}

func deleteUpstream(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid upstream id")
			return
		}

		if err := q.DeleteUpstream(r.Context(), sqlcgen.DeleteUpstreamParams{ID: id, TenantID: tenantID}); err != nil {
			slog.ErrorContext(r.Context(), "deleteUpstream: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func parseTenantID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "tenantId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tenant id")
		return uuid.UUID{}, false
	}
	return id, true
}

func parsePagination(r *http.Request) (limit, offset int32) {
	limit = 50
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
			limit = int32(n)
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = int32(n)
		}
	}
	return
}
