package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yasserrmd/barqium/services/control-api/internal/sqlc/sqlcgen"
)

var slugRe = regexp.MustCompile(`^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$`)

// Tenants mounts all tenant routes on the given router.
func Tenants(r chi.Router, q *sqlcgen.Queries) {
	r.Post("/", createTenant(q))
	r.Get("/", listTenants(q))
	r.Get("/{id}", getTenant(q))
	r.Patch("/{id}", updateTenant(q))
	r.Delete("/{id}", deleteTenant(q))
}

type createTenantRequest struct {
	Name    string `json:"name"`
	Slug    string `json:"slug"`
	Enabled *bool  `json:"enabled"`
}

func createTenant(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createTenantRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Name == "" {
			writeError(w, http.StatusUnprocessableEntity, "name is required")
			return
		}
		if !slugRe.MatchString(req.Slug) {
			writeError(w, http.StatusUnprocessableEntity,
				"slug must be lowercase alphanumeric with hyphens, 2-63 chars")
			return
		}

		enabled := true
		if req.Enabled != nil {
			enabled = *req.Enabled
		}

		tenant, err := q.CreateTenant(r.Context(), sqlcgen.CreateTenantParams{
			Name:    req.Name,
			Slug:    req.Slug,
			Enabled: enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "slug already exists")
				return
			}
			slog.ErrorContext(r.Context(), "createTenant: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		writeJSON(w, http.StatusCreated, tenant)
	}
}

func listTenants(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit := int32(50)
		offset := int32(0)

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

		tenants, err := q.ListTenants(r.Context(), sqlcgen.ListTenantsParams{
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			slog.ErrorContext(r.Context(), "listTenants: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if tenants == nil {
			tenants = []sqlcgen.Tenant{}
		}
		writeJSON(w, http.StatusOK, tenants)
	}
}

func getTenant(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid tenant id")
			return
		}

		tenant, err := q.GetTenant(r.Context(), id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "tenant not found")
				return
			}
			slog.ErrorContext(r.Context(), "getTenant: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, tenant)
	}
}

type updateTenantRequest struct {
	Name    string `json:"name"`
	Slug    string `json:"slug"`
	Enabled *bool  `json:"enabled"`
}

func updateTenant(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid tenant id")
			return
		}

		existing, err := q.GetTenant(r.Context(), id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "tenant not found")
				return
			}
			slog.ErrorContext(r.Context(), "updateTenant: get error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		var req updateTenantRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		// Patch: only override fields that are provided.
		name := existing.Name
		if req.Name != "" {
			name = req.Name
		}
		slug := existing.Slug
		if req.Slug != "" {
			if !slugRe.MatchString(req.Slug) {
				writeError(w, http.StatusUnprocessableEntity,
					"slug must be lowercase alphanumeric with hyphens, 2-63 chars")
				return
			}
			slug = req.Slug
		}
		enabled := existing.Enabled
		if req.Enabled != nil {
			enabled = *req.Enabled
		}

		updated, err := q.UpdateTenant(r.Context(), sqlcgen.UpdateTenantParams{
			ID:      id,
			Name:    name,
			Slug:    slug,
			Enabled: enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "slug already exists")
				return
			}
			slog.ErrorContext(r.Context(), "updateTenant: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}
}

func deleteTenant(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid tenant id")
			return
		}

		if err := q.DeleteTenant(r.Context(), id); err != nil {
			slog.ErrorContext(r.Context(), "deleteTenant: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
