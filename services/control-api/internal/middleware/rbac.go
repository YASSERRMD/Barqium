package middleware

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// TenantScope enforces that the caller can only access the tenant identified
// by the {tenantId} URL parameter.
//
// When OIDC is disabled (no token in context) the middleware is a no-op so
// local development does not require tokens. When a token is present:
//   - Callers whose token contains role "admin" (or any of adminRoles) bypass
//     the check and can access any tenant.
//   - All other callers must have a "tenant_id" claim that equals {tenantId}.
func TenantScope(adminRoles ...string) func(http.Handler) http.Handler {
	adminSet := make(map[string]struct{}, len(adminRoles))
	for _, r := range adminRoles {
		adminSet[r] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, ok := ClaimsFromContext(r.Context())
			if !ok {
				// OIDC disabled; skip enforcement.
				next.ServeHTTP(w, r)
				return
			}

			// Admins bypass tenant scoping.
			if role, _ := token.Get("role"); role != nil {
				if _, isAdmin := adminSet[role.(string)]; isAdmin {
					next.ServeHTTP(w, r)
					return
				}
			}

			tenantParam := chi.URLParam(r, "tenantId")
			if tenantParam == "" {
				next.ServeHTTP(w, r)
				return
			}

			claimVal, _ := token.Get("tenant_id")
			claimTenantID, _ := claimVal.(string)
			if claimTenantID == "" || claimTenantID != tenantParam {
				http.Error(w, "forbidden: tenant mismatch", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireRole rejects requests whose token does not carry one of the given
// roles in the "role" claim. When OIDC is disabled (no token) the middleware
// is a no-op.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, ok := ClaimsFromContext(r.Context())
			if !ok {
				// OIDC disabled; skip enforcement.
				next.ServeHTTP(w, r)
				return
			}

			role, _ := token.Get("role")
			roleStr, _ := role.(string)
			if _, ok := allowed[roleStr]; !ok {
				http.Error(w, "forbidden: insufficient role", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
