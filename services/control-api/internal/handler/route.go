package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yasserrmd/barqium/services/control-api/internal/sqlc/sqlcgen"
)

// Routes mounts all route resources under a tenant-scoped router.
func Routes(r chi.Router, q *sqlcgen.Queries) {
	r.Post("/", createRoute(q))
	r.Get("/", listRoutes(q))
	r.Get("/{id}", getRoute(q))
	r.Patch("/{id}", updateRoute(q))
	r.Delete("/{id}", deleteRoute(q))
}

type createRouteRequest struct {
	Method     string    `json:"method"`
	PathPrefix string    `json:"path_prefix"`
	Host       string    `json:"host"`
	UpstreamID uuid.UUID `json:"upstream_id"`
	Enabled    *bool     `json:"enabled"`
}

func createRoute(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}

		var req createRouteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.PathPrefix == "" {
			writeError(w, http.StatusUnprocessableEntity, "path_prefix is required")
			return
		}
		if req.UpstreamID == uuid.Nil {
			writeError(w, http.StatusUnprocessableEntity, "upstream_id is required")
			return
		}

		method := strings.ToUpper(req.Method)
		if method == "" {
			method = "*"
		}

		// FK validation: ensure upstream belongs to same tenant.
		if _, err := q.GetUpstream(r.Context(), sqlcgen.GetUpstreamParams{
			ID:       req.UpstreamID,
			TenantID: tenantID,
		}); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusUnprocessableEntity, "upstream_id not found in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "createRoute: upstream lookup error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		enabled := true
		if req.Enabled != nil {
			enabled = *req.Enabled
		}

		route, err := q.CreateRoute(r.Context(), sqlcgen.CreateRouteParams{
			TenantID:   tenantID,
			Method:     method,
			PathPrefix: req.PathPrefix,
			Host:       req.Host,
			UpstreamID: req.UpstreamID,
			Enabled:    enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict,
					"route with same method, path_prefix, and host already exists in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "createRoute: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, route)
	}
}

func listRoutes(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}

		limit, offset := parsePagination(r)
		routes, err := q.ListRoutesByTenant(r.Context(), sqlcgen.ListRoutesByTenantParams{
			TenantID: tenantID,
			Limit:    limit,
			Offset:   offset,
		})
		if err != nil {
			slog.ErrorContext(r.Context(), "listRoutes: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if routes == nil {
			routes = []sqlcgen.Route{}
		}
		writeJSON(w, http.StatusOK, routes)
	}
}

func getRoute(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid route id")
			return
		}

		route, err := q.GetRoute(r.Context(), sqlcgen.GetRouteParams{ID: id, TenantID: tenantID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "route not found")
				return
			}
			slog.ErrorContext(r.Context(), "getRoute: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, route)
	}
}

type updateRouteRequest struct {
	Method     string     `json:"method"`
	PathPrefix string     `json:"path_prefix"`
	Host       string     `json:"host"`
	UpstreamID *uuid.UUID `json:"upstream_id"`
	Enabled    *bool      `json:"enabled"`
}

func updateRoute(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid route id")
			return
		}

		existing, err := q.GetRoute(r.Context(), sqlcgen.GetRouteParams{ID: id, TenantID: tenantID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "route not found")
				return
			}
			slog.ErrorContext(r.Context(), "updateRoute: get error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		var req updateRouteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		method := existing.Method
		if req.Method != "" {
			method = strings.ToUpper(req.Method)
		}
		pathPrefix := existing.PathPrefix
		if req.PathPrefix != "" {
			pathPrefix = req.PathPrefix
		}
		host := existing.Host
		if req.Host != "" {
			host = req.Host
		}
		upstreamID := existing.UpstreamID
		if req.UpstreamID != nil {
			// Validate the new upstream belongs to the same tenant.
			if _, err := q.GetUpstream(r.Context(), sqlcgen.GetUpstreamParams{
				ID:       *req.UpstreamID,
				TenantID: tenantID,
			}); err != nil {
				if errors.Is(err, pgx.ErrNoRows) {
					writeError(w, http.StatusUnprocessableEntity, "upstream_id not found in tenant")
					return
				}
				slog.ErrorContext(r.Context(), "updateRoute: upstream lookup error", "error", err)
				writeError(w, http.StatusInternalServerError, "internal error")
				return
			}
			upstreamID = *req.UpstreamID
		}
		enabled := existing.Enabled
		if req.Enabled != nil {
			enabled = *req.Enabled
		}

		updated, err := q.UpdateRoute(r.Context(), sqlcgen.UpdateRouteParams{
			ID:         id,
			TenantID:   tenantID,
			Method:     method,
			PathPrefix: pathPrefix,
			Host:       host,
			UpstreamID: upstreamID,
			Enabled:    enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict,
					"route with same method, path_prefix, and host already exists in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "updateRoute: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}
}

func deleteRoute(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid route id")
			return
		}

		if err := q.DeleteRoute(r.Context(), sqlcgen.DeleteRouteParams{ID: id, TenantID: tenantID}); err != nil {
			slog.ErrorContext(r.Context(), "deleteRoute: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
