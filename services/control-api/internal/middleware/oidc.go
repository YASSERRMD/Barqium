package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

type contextKey string

const claimsKey contextKey = "oidc_claims"

// OIDCConfig holds the parameters needed to validate Bearer tokens.
type OIDCConfig struct {
	// JWKSURL is the endpoint serving the provider's public keys.
	JWKSURL string
	// Audience that must appear in the aud claim.
	Audience string
	// Issuer that must appear in the iss claim. Empty = skip check.
	Issuer string
	// RefreshInterval controls how often the JWKS cache is refreshed.
	RefreshInterval time.Duration
}

// OIDC returns a chi-compatible middleware that validates Bearer JWTs issued
// by an OIDC provider. The JWKS is cached and refreshed in the background.
// When JWKSURL is empty, the middleware is a no-op (OIDC disabled).
func OIDC(cfg OIDCConfig) func(http.Handler) http.Handler {
	if cfg.JWKSURL == "" {
		return func(next http.Handler) http.Handler { return next }
	}

	if cfg.RefreshInterval == 0 {
		cfg.RefreshInterval = 15 * time.Minute
	}

	cache := jwk.NewCache(context.Background())
	if err := cache.Register(cfg.JWKSURL, jwk.WithRefreshInterval(cfg.RefreshInterval)); err != nil {
		slog.Error("oidc: failed to register JWKS URL", "err", err)
		return func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, "oidc: JWKS registration failed", http.StatusServiceUnavailable)
			})
		}
	}

	// Eagerly fetch; failures are non-fatal since Refresh retries on each request.
	if _, err := cache.Refresh(context.Background(), cfg.JWKSURL); err != nil {
		slog.Warn("oidc: initial JWKS fetch failed; will retry on first request", "err", err)
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := extractBearer(r)
			if raw == "" {
				http.Error(w, "missing or malformed Authorization header", http.StatusUnauthorized)
				return
			}

			keySet, err := cache.Get(r.Context(), cfg.JWKSURL)
			if err != nil {
				slog.Error("oidc: JWKS fetch error", "err", err)
				http.Error(w, "oidc: key store unavailable", http.StatusServiceUnavailable)
				return
			}

			opts := []jwt.ParseOption{
				jwt.WithKeySet(keySet),
				jwt.WithValidate(true),
			}
			if cfg.Audience != "" {
				opts = append(opts, jwt.WithAudience(cfg.Audience))
			}
			if cfg.Issuer != "" {
				opts = append(opts, jwt.WithIssuer(cfg.Issuer))
			}

			token, err := jwt.ParseString(raw, opts...)
			if err != nil {
				http.Error(w, "invalid or expired token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey, token)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsFromContext returns the validated JWT token stored by the OIDC middleware.
func ClaimsFromContext(ctx context.Context) (jwt.Token, bool) {
	t, ok := ctx.Value(claimsKey).(jwt.Token)
	return t, ok
}

func extractBearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(h, "Bearer ")
}
