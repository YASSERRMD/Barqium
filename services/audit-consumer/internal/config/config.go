package config

import "github.com/kelseyhightower/envconfig"

// Config holds runtime configuration for the audit-consumer.
type Config struct {
	DatabaseURL   string `envconfig:"DATABASE_URL" required:"true"`
	KafkaBrokers  string `envconfig:"KAFKA_BROKERS" default:"localhost:9092"`
	KafkaTopic    string `envconfig:"KAFKA_AUDIT_TOPIC" default:"audit.events"`
	KafkaGroupID  string `envconfig:"KAFKA_GROUP_ID" default:"audit-consumer"`
	LogLevel      string `envconfig:"LOG_LEVEL" default:"info"`
	LogFormat     string `envconfig:"LOG_FORMAT" default:"json"`
	// BatchSize controls how many messages are flushed to Postgres per transaction.
	BatchSize int `envconfig:"BATCH_SIZE" default:"200"`
}

// Load reads Config from environment variables.
func Load() (*Config, error) {
	var c Config
	if err := envconfig.Process("BARQIUM", &c); err != nil {
		return nil, err
	}
	return &c, nil
}
