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

var validScopes = map[string]bool{
	"tenant": true, "consumer": true, "route": true, "ip": true,
}

var validAlgorithms = map[string]bool{
	"token_bucket": true, "sliding_window": true, "fixed_window": true,
}

// RateLimitPolicies mounts CRUD for rate_limit_policies under a tenant router.
func RateLimitPolicies(r chi.Router, q *sqlcgen.Queries) {
	r.Post("/", createRateLimitPolicy(q))
	r.Get("/", listRateLimitPolicies(q))
	r.Get("/{id}", getRateLimitPolicy(q))
	r.Patch("/{id}", updateRateLimitPolicy(q))
	r.Delete("/{id}", deleteRateLimitPolicy(q))
}

type rateLimitPolicyRequest struct {
	Name       string `json:"name"`
	Scope      string `json:"scope"`
	Algorithm  string `json:"algorithm"`
	RateLimit  int32  `json:"rate_limit"`
	WindowSecs int32  `json:"window_secs"`
	BurstLimit *int32 `json:"burst_limit"`
	Enabled    *bool  `json:"enabled"`
}

func validateRateLimitRequest(w http.ResponseWriter, req rateLimitPolicyRequest) bool {
	if req.Name == "" {
		writeError(w, http.StatusUnprocessableEntity, "name is required")
		return false
	}
	if req.Scope != "" && !validScopes[req.Scope] {
		writeError(w, http.StatusUnprocessableEntity, "invalid scope; must be tenant|consumer|route|ip")
		return false
	}
	if req.Algorithm != "" && !validAlgorithms[req.Algorithm] {
		writeError(w, http.StatusUnprocessableEntity, "invalid algorithm; must be token_bucket|sliding_window|fixed_window")
		return false
	}
	if req.RateLimit <= 0 {
		writeError(w, http.StatusUnprocessableEntity, "rate_limit must be > 0")
		return false
	}
	if req.WindowSecs <= 0 {
		writeError(w, http.StatusUnprocessableEntity, "window_secs must be > 0")
		return false
	}
	return true
}

func createRateLimitPolicy(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		var req rateLimitPolicyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if !validateRateLimitRequest(w, req) {
			return
		}

		scope := req.Scope
		if scope == "" {
			scope = "tenant"
		}
		algorithm := req.Algorithm
		if algorithm == "" {
			algorithm = "sliding_window"
		}
		enabled := true
		if req.Enabled != nil {
			enabled = *req.Enabled
		}

		policy, err := q.CreateRateLimitPolicy(r.Context(), sqlcgen.CreateRateLimitPolicyParams{
			TenantID:   tenantID,
			Name:       req.Name,
			Scope:      scope,
			Algorithm:  algorithm,
			RateLimit:  req.RateLimit,
			WindowSecs: req.WindowSecs,
			BurstLimit: req.BurstLimit,
			Enabled:    enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "rate limit policy with this name already exists in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "createRateLimitPolicy: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, policy)
	}
}

func listRateLimitPolicies(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		limit, offset := parsePagination(r)
		policies, err := q.ListRateLimitPolicies(r.Context(), sqlcgen.ListRateLimitPoliciesParams{
			TenantID: tenantID,
			Limit:    limit,
			Offset:   offset,
		})
		if err != nil {
			slog.ErrorContext(r.Context(), "listRateLimitPolicies: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if policies == nil {
			policies = []sqlcgen.RateLimitPolicy{}
		}
		writeJSON(w, http.StatusOK, policies)
	}
}

func getRateLimitPolicy(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid policy id")
			return
		}
		policy, err := q.GetRateLimitPolicy(r.Context(), sqlcgen.GetRateLimitPolicyParams{
			ID:       id,
			TenantID: tenantID,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "rate limit policy not found")
				return
			}
			slog.ErrorContext(r.Context(), "getRateLimitPolicy: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, policy)
	}
}

func updateRateLimitPolicy(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid policy id")
			return
		}
		existing, err := q.GetRateLimitPolicy(r.Context(), sqlcgen.GetRateLimitPolicyParams{
			ID:       id,
			TenantID: tenantID,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "rate limit policy not found")
				return
			}
			slog.ErrorContext(r.Context(), "updateRateLimitPolicy: get error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		var req rateLimitPolicyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		name := existing.Name
		if req.Name != "" {
			name = req.Name
		}
		scope := existing.Scope
		if req.Scope != "" {
			if !validScopes[req.Scope] {
				writeError(w, http.StatusUnprocessableEntity, "invalid scope")
				return
			}
			scope = req.Scope
		}
		algorithm := existing.Algorithm
		if req.Algorithm != "" {
			if !validAlgorithms[req.Algorithm] {
				writeError(w, http.StatusUnprocessableEntity, "invalid algorithm")
				return
			}
			algorithm = req.Algorithm
		}
		rateLimit := existing.RateLimit
		if req.RateLimit > 0 {
			rateLimit = req.RateLimit
		}
		windowSecs := existing.WindowSecs
		if req.WindowSecs > 0 {
			windowSecs = req.WindowSecs
		}
		burstLimit := existing.BurstLimit
		if req.BurstLimit != nil {
			burstLimit = req.BurstLimit
		}
		enabled := existing.Enabled
		if req.Enabled != nil {
			enabled = *req.Enabled
		}

		updated, err := q.UpdateRateLimitPolicy(r.Context(), sqlcgen.UpdateRateLimitPolicyParams{
			ID:         id,
			TenantID:   tenantID,
			Name:       name,
			Scope:      scope,
			Algorithm:  algorithm,
			RateLimit:  rateLimit,
			WindowSecs: windowSecs,
			BurstLimit: burstLimit,
			Enabled:    enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "rate limit policy with this name already exists in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "updateRateLimitPolicy: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}
}

func deleteRateLimitPolicy(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid policy id")
			return
		}
		if err := q.DeleteRateLimitPolicy(r.Context(), sqlcgen.DeleteRateLimitPolicyParams{
			ID:       id,
			TenantID: tenantID,
		}); err != nil {
			slog.ErrorContext(r.Context(), "deleteRateLimitPolicy: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
