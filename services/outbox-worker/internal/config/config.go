package config

import "github.com/kelseyhightower/envconfig"

// Config holds runtime configuration for the outbox-worker.
type Config struct {
	DatabaseURL    string `envconfig:"DATABASE_URL" required:"true"`
	KafkaBrokers   string `envconfig:"KAFKA_BROKERS" default:"localhost:9092"`
	PollIntervalMs int    `envconfig:"POLL_INTERVAL_MS" default:"500"`
	BatchSize      int    `envconfig:"BATCH_SIZE" default:"500"`
	LogLevel       string `envconfig:"LOG_LEVEL" default:"info"`
	LogFormat      string `envconfig:"LOG_FORMAT" default:"json"`
}

// Load reads the Config from environment variables.
func Load() (*Config, error) {
	var c Config
	if err := envconfig.Process("BARQIUM", &c); err != nil {
		return nil, err
	}
	return &c, nil
}
