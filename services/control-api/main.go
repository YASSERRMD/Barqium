package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/yasserrmd/barqium/services/control-api/internal/config"
	"github.com/yasserrmd/barqium/services/control-api/internal/db"
	"github.com/yasserrmd/barqium/services/control-api/internal/handler"
	apimiddleware "github.com/yasserrmd/barqium/services/control-api/internal/middleware"
	"github.com/yasserrmd/barqium/services/control-api/internal/sqlc/sqlcgen"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	setupLogger(cfg.LogLevel, cfg.LogFormat)

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to postgres", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	slog.Info("postgres connected")

	q := sqlcgen.New(pool)

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	r.Get("/health", handler.Health(pool))
	r.Get("/api/openapi.yaml", handler.OpenAPI())

	oidcMiddleware := apimiddleware.OIDC(apimiddleware.OIDCConfig{
		JWKSURL:  cfg.OIDCJWKSURL,
		Audience: cfg.OIDCAudience,
		Issuer:   cfg.OIDCIssuer,
	})

	tenantScope := apimiddleware.TenantScope("admin")
	adminOnly := apimiddleware.RequireRole("admin")

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(oidcMiddleware)

		r.Route("/regions", func(r chi.Router) {
			r.Use(adminOnly)
			handler.Regions(r, q)
		})

		r.Route("/tenants", func(r chi.Router) {
			// Create and delete tenant are admin-only; reads are open to any valid token.
			r.With(adminOnly).Post("/", handler.CreateTenantHandler(q))
			r.With(adminOnly).Delete("/{id}", handler.DeleteTenantHandler(q))
			// GET /tenants and GET /tenants/{id} and PATCH /tenants/{id} use no extra guard.
			r.Get("/", handler.ListTenantsHandler(q))
			r.Get("/{id}", handler.GetTenantHandler(q))
			r.Patch("/{id}", handler.UpdateTenantHandler(q))

			r.Route("/{tenantId}/upstreams", func(r chi.Router) {
				r.Use(tenantScope)
				handler.Upstreams(r, q)
			})
			r.Route("/{tenantId}/routes", func(r chi.Router) {
				r.Use(tenantScope)
				handler.Routes(r, q)
			})
			r.Route("/{tenantId}/config/checkpoints", func(r chi.Router) {
				r.Use(tenantScope)
				handler.Checkpoints(r, q)
			})
			r.Route("/{tenantId}/ai/providers", func(r chi.Router) {
				r.Use(tenantScope)
				handler.AiProviders(r, q)
			})
			r.Route("/{tenantId}/rate-limit-policies", func(r chi.Router) {
				r.Use(tenantScope)
				handler.RateLimitPolicies(r, q)
			})
		})
	})

	srv := &http.Server{
		Addr:         cfg.ListenAddr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		slog.Info("control-api listening", "addr", cfg.ListenAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "error", err)
			cancel()
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down")

	shutCtx, shutCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutCancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}
}

func setupLogger(level, format string) {
	var lvl slog.Level
	_ = lvl.UnmarshalText([]byte(level))

	opts := &slog.HandlerOptions{Level: lvl}
	var h slog.Handler
	if format == "json" {
		h = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		h = slog.NewTextHandler(os.Stdout, opts)
	}
	slog.SetDefault(slog.New(h))
}
