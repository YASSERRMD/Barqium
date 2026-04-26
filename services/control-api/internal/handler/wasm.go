package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yasserrmd/barqium/services/control-api/internal/sqlc/sqlcgen"
)

var validTriggers = map[string]bool{
	"on_request": true, "on_response": true, "both": true,
}

// WasmPlugins mounts CRUD for wasm_plugins under a tenant router.
func WasmPlugins(r chi.Router, q *sqlcgen.Queries) {
	r.Post("/", createWasmPlugin(q))
	r.Get("/", listWasmPlugins(q))
	r.Get("/{id}", getWasmPlugin(q))
	r.Patch("/{id}", updateWasmPlugin(q))
	r.Delete("/{id}", deleteWasmPlugin(q))
	// Download the raw wasm binary for a plugin.
	r.Get("/{id}/binary", downloadWasmBinary(q))
}

type createWasmPluginRequest struct {
	Name       string          `json:"name"`
	Version    string          `json:"version"`
	Trigger    string          `json:"trigger"`
	StorageURL *string         `json:"storage_url"`
	Config     json.RawMessage `json:"config"`
	Enabled    *bool           `json:"enabled"`
}

func createWasmPlugin(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}

		// Support both JSON metadata + optional multipart binary upload and
		// pure JSON with storage_url. We check Content-Type to decide.
		ct := r.Header.Get("Content-Type")
		var (
			name       string
			version    string
			trigger    string
			storageURL *string
			configJSON []byte
			wasmBytes  []byte
			enabled    = true
		)

		if len(ct) >= 19 && ct[:19] == "multipart/form-data" {
			if err := r.ParseMultipartForm(32 << 20); err != nil {
				writeError(w, http.StatusBadRequest, "failed to parse multipart form")
				return
			}
			name = r.FormValue("name")
			version = r.FormValue("version")
			trigger = r.FormValue("trigger")
			configJSON = []byte(r.FormValue("config"))
			if configJSON == nil {
				configJSON = []byte("{}")
			}
			if enabledStr := r.FormValue("enabled"); enabledStr == "false" {
				enabled = false
			}
			f, _, err := r.FormFile("wasm_binary")
			if err != nil {
				writeError(w, http.StatusBadRequest, "wasm_binary file is required for multipart upload")
				return
			}
			defer f.Close()
			wasmBytes, err = io.ReadAll(f)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to read wasm binary")
				return
			}
		} else {
			var req createWasmPluginRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeError(w, http.StatusBadRequest, "invalid request body")
				return
			}
			name = req.Name
			version = req.Version
			trigger = req.Trigger
			storageURL = req.StorageURL
			if req.Config != nil {
				configJSON = req.Config
			} else {
				configJSON = []byte("{}")
			}
			if req.Enabled != nil {
				enabled = *req.Enabled
			}
			if storageURL == nil {
				writeError(w, http.StatusUnprocessableEntity,
					"provide wasm_binary via multipart/form-data or storage_url via JSON")
				return
			}
		}

		if name == "" {
			writeError(w, http.StatusUnprocessableEntity, "name is required")
			return
		}
		if trigger == "" {
			trigger = "both"
		}
		if !validTriggers[trigger] {
			writeError(w, http.StatusUnprocessableEntity, "invalid trigger; must be on_request|on_response|both")
			return
		}
		if version == "" {
			version = "0.1.0"
		}

		// Compute SHA-256 of the binary (or a placeholder for storage_url-backed plugins).
		var sha256hex string
		if len(wasmBytes) > 0 {
			sum := sha256.Sum256(wasmBytes)
			sha256hex = hex.EncodeToString(sum[:])
		} else {
			sha256hex = "storage-backed"
		}

		plugin, err := q.CreateWasmPlugin(r.Context(), sqlcgen.CreateWasmPluginParams{
			TenantID:   tenantID,
			Name:       name,
			Version:    version,
			Trigger:    trigger,
			Sha256:     sha256hex,
			StorageURL: storageURL,
			WasmBinary: wasmBytes,
			Config:     configJSON,
			Enabled:    enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "plugin with same name and version already exists in tenant")
				return
			}
			slog.ErrorContext(r.Context(), "createWasmPlugin: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, plugin)
	}
}

func listWasmPlugins(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		limit, offset := parsePagination(r)
		plugins, err := q.ListWasmPlugins(r.Context(), sqlcgen.ListWasmPluginsParams{
			TenantID: tenantID,
			Limit:    limit,
			Offset:   offset,
		})
		if err != nil {
			slog.ErrorContext(r.Context(), "listWasmPlugins: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if plugins == nil {
			plugins = []sqlcgen.WasmPlugin{}
		}
		writeJSON(w, http.StatusOK, plugins)
	}
}

func getWasmPlugin(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid plugin id")
			return
		}
		plugin, err := q.GetWasmPlugin(r.Context(), sqlcgen.GetWasmPluginParams{
			ID:       id,
			TenantID: tenantID,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "wasm plugin not found")
				return
			}
			slog.ErrorContext(r.Context(), "getWasmPlugin: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, plugin)
	}
}

func downloadWasmBinary(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid plugin id")
			return
		}
		plugin, err := q.GetWasmPlugin(r.Context(), sqlcgen.GetWasmPluginParams{
			ID:       id,
			TenantID: tenantID,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "wasm plugin not found")
				return
			}
			slog.ErrorContext(r.Context(), "downloadWasmBinary: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if len(plugin.WasmBinary) == 0 {
			if plugin.StorageURL != nil {
				http.Redirect(w, r, *plugin.StorageURL, http.StatusTemporaryRedirect)
				return
			}
			writeError(w, http.StatusNotFound, "no binary stored for this plugin")
			return
		}
		w.Header().Set("Content-Type", "application/wasm")
		w.Header().Set("Content-Disposition", `attachment; filename="`+plugin.Name+`.wasm"`)
		w.Header().Set("X-SHA256", plugin.Sha256)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(plugin.WasmBinary)
	}
}

func updateWasmPlugin(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid plugin id")
			return
		}
		existing, err := q.GetWasmPlugin(r.Context(), sqlcgen.GetWasmPluginParams{
			ID:       id,
			TenantID: tenantID,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "wasm plugin not found")
				return
			}
			slog.ErrorContext(r.Context(), "updateWasmPlugin: get error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		var req createWasmPluginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		name := existing.Name
		if req.Name != "" {
			name = req.Name
		}
		version := existing.Version
		if req.Version != "" {
			version = req.Version
		}
		trigger := existing.Trigger
		if req.Trigger != "" {
			if !validTriggers[req.Trigger] {
				writeError(w, http.StatusUnprocessableEntity, "invalid trigger")
				return
			}
			trigger = req.Trigger
		}
		storageURL := existing.StorageURL
		if req.StorageURL != nil {
			storageURL = req.StorageURL
		}
		configJSON := existing.Config
		if req.Config != nil {
			configJSON = req.Config
		}
		enabled := existing.Enabled
		if req.Enabled != nil {
			enabled = *req.Enabled
		}

		updated, err := q.UpdateWasmPlugin(r.Context(), sqlcgen.UpdateWasmPluginParams{
			ID:         id,
			TenantID:   tenantID,
			Name:       name,
			Version:    version,
			Trigger:    trigger,
			Sha256:     existing.Sha256,
			StorageURL: storageURL,
			WasmBinary: existing.WasmBinary,
			Config:     configJSON,
			Enabled:    enabled,
		})
		if err != nil {
			if isDuplicateKey(err) {
				writeError(w, http.StatusConflict, "plugin with same name and version already exists")
				return
			}
			slog.ErrorContext(r.Context(), "updateWasmPlugin: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, updated)
	}
}

func deleteWasmPlugin(q *sqlcgen.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, ok := parseTenantID(w, r)
		if !ok {
			return
		}
		id, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid plugin id")
			return
		}
		if err := q.DeleteWasmPlugin(r.Context(), sqlcgen.DeleteWasmPluginParams{
			ID:       id,
			TenantID: tenantID,
		}); err != nil {
			slog.ErrorContext(r.Context(), "deleteWasmPlugin: db error", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
