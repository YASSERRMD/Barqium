package config

import "github.com/kelseyhightower/envconfig"

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`
	ListenAddr  string `envconfig:"LISTEN_ADDR" default:":8080"`
	LogLevel    string `envconfig:"LOG_LEVEL" default:"info"`
	// LogFormat: "json" for structured output, "text" for development.
	LogFormat string `envconfig:"LOG_FORMAT" default:"json"`

	// OIDC Bearer token validation. Leave OIDCJWKSURL empty to disable.
	OIDCJWKSURL  string `envconfig:"OIDC_JWKS_URL"`
	OIDCAudience string `envconfig:"OIDC_AUDIENCE"`
	OIDCIssuer   string `envconfig:"OIDC_ISSUER"`
}

// Load reads the Config from environment variables.
func Load() (*Config, error) {
	var c Config
	if err := envconfig.Process("BARQIUM", &c); err != nil {
		return nil, err
	}
	return &c, nil
}
