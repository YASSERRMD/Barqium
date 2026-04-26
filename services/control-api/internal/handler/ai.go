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

var validProviders = map[string]bool{
	"openai":    true,
	"anthropic": true,
	"groq":      true,
	"ollama":    true,
	"bedrock":   true,
}

// AiProviders mounts provider routes under a tenant-scoped router.
func AiProviders(r chi.Router, q *sqlcgen.Queries) {
	r.Post("/", createAiProvider(q))
	r.Get("/", listAiProviders(q))
	r.Get("/{id}", getAiProvider(q))
	r.Patch("/{id}", updateAiProvider(q))
	r.Delete("/{id}", deleteAiProvider(q))

	r.Route("/{providerId}/model-policies", func(r chi.Router) {
		r.Post("/", createAiModelPolicy(q))
		r.Get("/", listAiModelPolicies(q))
		r.Get("/{policyId}", getAiModelPolicy(q))
		r.Patch("/{policyId}", updateAiModelPolicy(q))
		r.Delete("/{policyId}", deleteAiModelPolicy(q))
	})
}

// ---------------------------------------------------------------------------
// AI provider handlers
// ---------------------------------------------------------------------------

type createAiProviderRequest struct {
	Name      string  `json:"name"`
	Provider  string  `json:"provider"`
	BaseURL   *string `json:"base_url"`
	ApiKeyEnv *string `json:"api_key_env"`
	Enabled   *bool   `json:"enabled"`
}

func createAiProvider(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		var req createAiProviderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Name == "" {
			writeError(w, http.StatusUnprocessableEntity, "name is required")
			return
		}
		if !validProviders[req.Provider] {
			writeError(w, http.StatusUnprocessableEntity, "provider must be one of: openai, anthropic, groq, ollama, bedrock")
			return
		}
		enabled := true
		if req.Enabled != nil {
			enabled = *req.Enabled
		}
		p, err := q.CreateAiProvider(r.Context(), sqlcgen.CreateAiProviderParams{
			TenantID:  tenantID,
			Name:      req.Name,
			Provider:  req.Provider,
			BaseURL:   req.BaseURL,
			ApiKeyEnv: req.ApiKeyEnv,
			Enabled:   enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "provider name already exists in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "createAiProvider: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, p)
	}
}

func listAiProviders(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		limit, offset := parsePagination(r)
		items, err := q.ListAiProvidersByTenant(r.Context(), sqlcgen.ListAiProvidersByTenantParams{
			TenantID: tenantID,
			Limit:    limit,
			Offset:   offset,
		})
		if err != nil {
			slog.ErrorContext(r.Context(), "listAiProviders: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if items == nil {
			items = []sqlcgen.AiProvider{}
		}
		writeJSON(w, http.StatusOK, items)
	}
}

func getAiProvider(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid provider id")
			return
		}
		p, err := q.GetAiProvider(r.Context(), sqlcgen.GetAiProviderParams{ID: id, TenantID: tenantID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "provider not found")
				return
			}
			slog.ErrorContext(r.Context(), "getAiProvider: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, p)
	}
}

type updateAiProviderRequest struct {
	Name      string  `json:"name"`
	Provider  string  `json:"provider"`
	BaseURL   *string `json:"base_url"`
	ApiKeyEnv *string `json:"api_key_env"`
	Enabled   *bool   `json:"enabled"`
}

func updateAiProvider(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid provider id")
			return
		}
		existing, err := q.GetAiProvider(r.Context(), sqlcgen.GetAiProviderParams{ID: id, TenantID: tenantID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "provider not found")
				return
			}
			slog.ErrorContext(r.Context(), "updateAiProvider: get error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		var req updateAiProviderRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		name := existing.Name
		if req.Name != "" {
			name = req.Name
		}
		provider := existing.Provider
		if req.Provider != "" {
			if !validProviders[req.Provider] {
				writeError(w, http.StatusUnprocessableEntity, "provider must be one of: openai, anthropic, groq, ollama, bedrock")
				return
			}
			provider = req.Provider
		}
		baseURL := existing.BaseURL
		if req.BaseURL != nil {
			baseURL = req.BaseURL
		}
		apiKeyEnv := existing.ApiKeyEnv
		if req.ApiKeyEnv != nil {
			apiKeyEnv = req.ApiKeyEnv
		}
		enabled := existing.Enabled
		if req.Enabled != nil {
			enabled = *req.Enabled
		}
		updated, err := q.UpdateAiProvider(r.Context(), sqlcgen.UpdateAiProviderParams{
			ID: id, TenantID: tenantID,
			Name: name, Provider: provider,
			BaseURL: baseURL, ApiKeyEnv: apiKeyEnv,
			Enabled: enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "provider name already exists in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "updateAiProvider: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}
}

func deleteAiProvider(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid provider id")
			return
		}
		if err := q.DeleteAiProvider(r.Context(), sqlcgen.DeleteAiProviderParams{ID: id, TenantID: tenantID}); err != nil {
			slog.ErrorContext(r.Context(), "deleteAiProvider: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// ---------------------------------------------------------------------------
// AI model policy handlers
// ---------------------------------------------------------------------------

func parseProviderID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "providerId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid provider id")
		return uuid.UUID{}, false
	}
	return id, true
}

type createAiModelPolicyRequest struct {
	Model               string  `json:"model"`
	MaxTokensPerRequest *int32  `json:"max_tokens_per_request"`
	BudgetUsdPerDay     *string `json:"budget_usd_per_day"`
	FallbackModel       *string `json:"fallback_model"`
	Enabled             *bool   `json:"enabled"`
}

func createAiModelPolicy(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		providerID, ok := parseProviderID(w, r)
		if !ok {
			return
		}
		var req createAiModelPolicyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Model == "" {
			writeError(w, http.StatusUnprocessableEntity, "model is required")
			return
		}
		maxTokens := int32(4096)
		if req.MaxTokensPerRequest != nil && *req.MaxTokensPerRequest > 0 {
			maxTokens = *req.MaxTokensPerRequest
		}
		enabled := true
		if req.Enabled != nil {
			enabled = *req.Enabled
		}
		pol, err := q.CreateAiModelPolicy(r.Context(), sqlcgen.CreateAiModelPolicyParams{
			TenantID:            tenantID,
			ProviderID:          providerID,
			Model:               req.Model,
			MaxTokensPerRequest: maxTokens,
			BudgetUsdPerDay:     req.BudgetUsdPerDay,
			FallbackModel:       req.FallbackModel,
			Enabled:             enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "model policy already exists for this provider and model")
				return
			}
			slog.ErrorContext(r.Context(), "createAiModelPolicy: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, pol)
	}
}

func listAiModelPolicies(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		providerID, ok := parseProviderID(w, r)
		if !ok {
			return
		}
		limit, offset := parsePagination(r)
		items, err := q.ListAiModelPoliciesByProvider(r.Context(), sqlcgen.ListAiModelPoliciesByProviderParams{
			ProviderID: providerID,
			TenantID:   tenantID,
			Limit:      limit,
			Offset:     offset,
		})
		if err != nil {
			slog.ErrorContext(r.Context(), "listAiModelPolicies: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if items == nil {
			items = []sqlcgen.AiModelPolicy{}
		}
		writeJSON(w, http.StatusOK, items)
	}
}

func getAiModelPolicy(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		policyID, err := uuid.Parse(chi.URLParam(r, "policyId"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid policy id")
			return
		}
		pol, err := q.GetAiModelPolicy(r.Context(), sqlcgen.GetAiModelPolicyParams{ID: policyID, TenantID: tenantID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "model policy not found")
				return
			}
			slog.ErrorContext(r.Context(), "getAiModelPolicy: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, pol)
	}
}

type updateAiModelPolicyRequest struct {
	Model               string  `json:"model"`
	MaxTokensPerRequest *int32  `json:"max_tokens_per_request"`
	BudgetUsdPerDay     *string `json:"budget_usd_per_day"`
	FallbackModel       *string `json:"fallback_model"`
	Enabled             *bool   `json:"enabled"`
}

func updateAiModelPolicy(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		policyID, err := uuid.Parse(chi.URLParam(r, "policyId"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid policy id")
			return
		}
		existing, err := q.GetAiModelPolicy(r.Context(), sqlcgen.GetAiModelPolicyParams{ID: policyID, TenantID: tenantID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "model policy not found")
				return
			}
			slog.ErrorContext(r.Context(), "updateAiModelPolicy: get error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		var req updateAiModelPolicyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		model := existing.Model
		if req.Model != "" {
			model = req.Model
		}
		maxTokens := existing.MaxTokensPerRequest
		if req.MaxTokensPerRequest != nil && *req.MaxTokensPerRequest > 0 {
			maxTokens = *req.MaxTokensPerRequest
		}
		budget := existing.BudgetUsdPerDay
		if req.BudgetUsdPerDay != nil {
			budget = req.BudgetUsdPerDay
		}
		fallback := existing.FallbackModel
		if req.FallbackModel != nil {
			fallback = req.FallbackModel
		}
		enabled := existing.Enabled
		if req.Enabled != nil {
			enabled = *req.Enabled
		}
		updated, err := q.UpdateAiModelPolicy(r.Context(), sqlcgen.UpdateAiModelPolicyParams{
			ID: policyID, TenantID: tenantID,
			Model: model, MaxTokensPerRequest: maxTokens,
			BudgetUsdPerDay: budget, FallbackModel: fallback,
			Enabled: enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "model policy already exists for this provider and model")
				return
			}
			slog.ErrorContext(r.Context(), "updateAiModelPolicy: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}
}

func deleteAiModelPolicy(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		policyID, err := uuid.Parse(chi.URLParam(r, "policyId"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid policy id")
			return
		}
		if err := q.DeleteAiModelPolicy(r.Context(), sqlcgen.DeleteAiModelPolicyParams{ID: policyID, TenantID: tenantID}); err != nil {
			slog.ErrorContext(r.Context(), "deleteAiModelPolicy: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
